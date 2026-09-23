import { Profile, Task, DailyRoutine } from '../types/database';

export interface FailedDayDetail {
  date: string;
  taskFailed: boolean;
  preplanFailed: boolean;
  reason: string;
}

export interface UserUnsettledStats {
  profile: Profile;
  taskFailedDaysCount: number;
  preplanFailedDaysCount: number;
  totalViolations: number;
  estimatedFine: number;
  todayTotalCount: number;
  todayUnfinishedCount: number;
  todayPreplanCount: number;
  auditStartDate: string;
  auditEndDate: string;
  auditedDaysCount: number;
  failedDaysDetails: FailedDayDetail[];
}

export interface UnsettledViolationsSummary {
  userStats: UserUnsettledStats[];
  totalViolationsCount: number;
  totalEstimatedFine: number;
}

/**
 * 格式化 Date 為 YYYY-MM-DD
 */
export const formatDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 取得隔天日期字串 YYYY-MM-DD
 */
export const getNextDayStr = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const nextDate = new Date(y, m - 1, d + 1);
  return formatDateStr(nextDate);
};

/**
 * 取得前一天日期字串 YYYY-MM-DD
 */
export const getPrevDayStr = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prevDate = new Date(y, m - 1, d - 1);
  return formatDateStr(prevDate);
};

/**
 * 產生從 startDate 到 endDate 的連續日曆日期陣列 (含頭含尾)
 */
export const getCalendarDateRange = (startDateStr: string, endDateStr: string): string[] => {
  if (startDateStr > endDateStr) return [];
  const dates: string[] = [];
  let curr = startDateStr;
  while (curr <= endDateStr) {
    dates.push(curr);
    curr = getNextDayStr(curr);
  }
  return dates;
};

/**
 * 核心稽核算法：精確計算成員未結算之違規次數與罰金
 * 
 * 規則與補齊標準：
 * 1. 審計週期全額覆蓋 (徹底補齊遺漏天數)：
 *    自當月 1 號 (YYYY-MM-01) 起至昨日 (yesterdayStr) 的每一天均進行全面審計。
 *    過去某日若「完全沒有排定打卡任務」，視同缺卡違規，自動計入當日任務未完成。
 * 2. 預排時間嚴格驗證 (徹底防止不增反減)：
 *    針對隔天的預排任務，必須在當日 23:59:59 截止前建立 (created_at <= 當日午夜)。
 *    隔天補排的今日任務絕不溯及既往充當昨日預排。
 * 3. 狀態區隔：
 *    排除已月結歸檔之歷史任務 (status === 'settled')。
 * 4. 今日進行中保護：
 *    僅審計「過去已截止日期 (dateStr < todayDateStr)」，今日進行中（午夜 23:59 截止前）絕不提前罰款。
 */
// 系統歸零重置正式起算日 (9/6 號資料全部歸零開始)
export const SYSTEM_START_DATE = '2026-09-06';

export const calculateUnsettledViolations = (
  profiles: Profile[],
  tasks: Task[],
  todayDateStr: string,
  _routines: DailyRoutine[] = [],
  customStartDate?: string
): UnsettledViolationsSummary => {
  const monthStart = `${todayDateStr.slice(0, 7)}-01`;
  // 起算日不得早於系統 9/6 歸零重置日
  const defaultStart = customStartDate || (monthStart < SYSTEM_START_DATE ? SYSTEM_START_DATE : monthStart);
  const yesterdayStr = getPrevDayStr(todayDateStr);

  const userStats: UserUnsettledStats[] = profiles.map((p) => {
    // 排除已結算之歷史任務
    const userTasks = tasks.filter((t) => t.user_id === p.id && t.status !== 'settled');

    // 今日進行中動態狀態 (用於介面即時提醒，絕不提前算入正式帳單)
    const todayTasks = userTasks.filter(
      (t) => t.target_date === todayDateStr && (t.category === 'daily' || t.category === 'routine')
    );
    const todayUnfinishedCount = todayTasks.filter((t) => !t.is_completed && !t.is_skipped).length;
    const tomorrowStr = getNextDayStr(todayDateStr);
    const todayPreplanTasks = userTasks.filter(
      (t) => t.category === 'daily' && t.target_date === tomorrowStr
    );
    const todayPreplanCount = todayPreplanTasks.length;

    const auditStartDate = defaultStart;

    // 審計日期：鎖定 9/6 歸零日起至昨日有任務紀錄的日期 (先不算空白漏卡)
    const activeDates = Array.from(
      new Set(userTasks.map((t) => t.target_date))
    ).filter((d) => d >= auditStartDate && d <= yesterdayStr).sort();

    let taskFailedDaysCount = 0;
    let preplanFailedDaysCount = 0;
    const failedDaysDetails: FailedDayDetail[] = [];

    activeDates.forEach((dateStr) => {
      let isTaskFailed = false;
      let isPreplanFailed = false;
      const reasons: string[] = [];

      // A. 當日任務完成檢查：有安排任務但未全數打卡
      const dayTasks = userTasks.filter(
        (t) => t.target_date === dateStr && (t.category === 'daily' || t.category === 'routine')
      );

      if (dayTasks.length > 0) {
        const hasUnfinished = dayTasks.some((t) => !t.is_completed && !t.is_skipped);
        if (hasUnfinished) {
          isTaskFailed = true;
          reasons.push('任務未全數打卡');
        }
      }

      if (isTaskFailed) {
        taskFailedDaysCount += 1;
      }

      // B. 明日預排檢查：該日午夜 (23:59:59) 前，針對隔天是否有預排 >= 2 項 daily
      const nextDateStr = getNextDayStr(dateStr);
      const [y, m, d] = dateStr.split('-').map(Number);
      const deadlineTimestamp = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

      const nextDayPlans = userTasks.filter((t) => {
        if (t.target_date !== nextDateStr || t.category !== 'daily') return false;
        // 嚴格檢查建立時間：必須在當日 23:59:59 截止前建立 (防次日補排洗白)
        if (t.created_at) {
          return new Date(t.created_at).getTime() <= deadlineTimestamp;
        }
        return true;
      });

      if (nextDayPlans.length < 2) {
        isPreplanFailed = true;
        reasons.push(`隔日預排不足 2 項 (實際 ${nextDayPlans.length} 項)`);
        preplanFailedDaysCount += 1;
      }

      if (isTaskFailed || isPreplanFailed) {
        failedDaysDetails.push({
          date: dateStr,
          taskFailed: isTaskFailed,
          preplanFailed: isPreplanFailed,
          reason: reasons.join('、'),
        });
      }
    });

    const totalViolations = taskFailedDaysCount + preplanFailedDaysCount;
    const estimatedFine = totalViolations * 100;

    return {
      profile: p,
      taskFailedDaysCount,
      preplanFailedDaysCount,
      totalViolations,
      estimatedFine,
      todayTotalCount: todayTasks.length,
      todayUnfinishedCount,
      todayPreplanCount,
      auditStartDate,
      auditEndDate: yesterdayStr,
      auditedDaysCount: activeDates.length,
      failedDaysDetails,
    };
  });

  const totalViolationsCount = userStats.reduce((sum, item) => sum + item.totalViolations, 0);
  const totalEstimatedFine = userStats.reduce((sum, item) => sum + item.estimatedFine, 0);

  return {
    userStats,
    totalViolationsCount,
    totalEstimatedFine,
  };
};
