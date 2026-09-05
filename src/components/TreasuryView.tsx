import React, { useState } from 'react';
import { Profile, GroupSettings, MonthlyBill, Task } from '../types/database';
import {
  Landmark,
  Crown,
  AlertTriangle,
  Receipt,
  Plane,
  Edit2,
  Check,
  X,
  Sparkles,
  CalendarCheck,
  CalendarX,
  CheckCircle,
} from 'lucide-react';

interface TreasuryViewProps {
  profiles: Profile[];
  groupSettings: GroupSettings;
  monthlyBills: MonthlyBill[];
  tasks: Task[];
  onUpdateGroupSettings: (name: string, amount: number) => Promise<void>;
  todayDateStr: string;
}

export const TreasuryView: React.FC<TreasuryViewProps> = ({
  profiles,
  groupSettings,
  monthlyBills,
  tasks,
  onUpdateGroupSettings,
  todayDateStr,
}) => {
  // 1. 編輯共同夢想標竿狀態 (Requirement 1: 直接在金庫頁面修改名稱與目標金額)
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoalName, setEditGoalName] = useState(groupSettings.goal_name);
  const [editGoalAmount, setEditGoalAmount] = useState(groupSettings.goal_amount);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // 公費總池 = 所有成員歷史月結之 total_paid_fine 總和
  const totalPool = profiles.reduce((sum, p) => sum + (p.total_paid_fine || 0), 0);

  // 夢想進度百分比
  const progressPercent = Math.min(
    100,
    Math.round((totalPool / (groupSettings.goal_amount || 1)) * 100)
  );

  // 歷史罰金排行 (由高至低)
  const sortedProfiles = [...profiles].sort((a, b) => b.total_paid_fine - a.total_paid_fine);

  // ---------------------------------------------------------------------------
  // 2. 修正罰金計算規則 (Requirement 3):
  //    - 當日任務以及常駐每日必做有任一個沒完成（無論幾個）該日均只罰 100 元
  //    - 明日預排序列沒在規定時間內排完 (不足 2 項) 也是罰 100 元
  // ---------------------------------------------------------------------------
  const currentMonthUnsettledStats = profiles.map((p) => {
    const userTasks = tasks.filter((t) => t.user_id === p.id);
    
    // 若該成員完全無任何任務，直接歸零
    if (userTasks.length === 0) {
      return {
        profile: p,
        taskFailedDaysCount: 0,
        preplanFailedDaysCount: 0,
        totalViolations: 0,
        estimatedFine: 0,
      };
    }

    // 取出所有已有任務的日期
    const distinctDates = Array.from(
      new Set(userTasks.map((t) => t.target_date))
    ).sort();

    let taskFailedDaysCount = 0;
    let preplanFailedDaysCount = 0;

    // 檢查已過去的日子及今日
    distinctDates.forEach((dateStr) => {
      // A. 任務未完成天數檢查：該天只要有任一項 daily 或 routine 未打卡且未豁免即違規
      const dayTasks = userTasks.filter(
        (t) => t.target_date === dateStr && (t.category === 'daily' || t.category === 'routine')
      );
      if (dayTasks.length > 0) {
        const hasUnfinished = dayTasks.some((t) => !t.is_completed && !t.is_skipped);
        if (hasUnfinished) {
          taskFailedDaysCount += 1;
        }
      }

      // B. 明日預排檢查：若是過去的日期，檢查針對隔天是否有 >= 2 項 daily 預排
      if (dateStr < todayDateStr) {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + 1);
        const nextDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const nextDayPlans = userTasks.filter(
          (t) => t.target_date === nextDateStr && t.category === 'daily'
        );
        if (nextDayPlans.length < 2) {
          preplanFailedDaysCount += 1;
        }
      }
    });

    // 針對今天檢查明日預排（若今天有排任務，但尚未排滿明日 2 項，列入預估違規）
    const hasTodayTasks = userTasks.some((t) => t.target_date === todayDateStr);
    if (hasTodayTasks) {
      const tomorrowTasks = userTasks.filter(
        (t) => t.category === 'daily' && t.target_date > todayDateStr
      );
      const todayPreplanFailed = tomorrowTasks.length < 2;
      if (todayPreplanFailed) {
        preplanFailedDaysCount += 1;
      }
    }

    const totalViolations = taskFailedDaysCount + preplanFailedDaysCount;
    const estimatedFine = totalViolations * 100;

    return {
      profile: p,
      taskFailedDaysCount,
      preplanFailedDaysCount,
      totalViolations,
      estimatedFine,
    };
  });

  const totalEstimatedUnsettledFine = currentMonthUnsettledStats.reduce(
    (sum, item) => sum + item.estimatedFine,
    0
  );

  const handleSaveGoal = async () => {
    if (!editGoalName.trim() || editGoalAmount <= 0) return;
    setIsSavingGoal(true);
    await onUpdateGroupSettings(editGoalName.trim(), Number(editGoalAmount));
    setIsSavingGoal(false);
    setIsEditingGoal(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-full select-none animate-fadeIn pb-24 space-y-6">
      {/* 1. 公費總池與共同夢想標竿 (iOS 液態玻璃雙卡佈局) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 公費總額玻璃卡 */}
        <div className="p-6 ios-glass-card flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.04] rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 tracking-wider uppercase font-semibold">
              公費金庫總額 // TREASURY POOL
            </span>
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
              <Landmark className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="my-4">
            <div className="text-4xl font-extrabold font-sans text-white tracking-tight flex items-baseline gap-2">
              <span>${totalPool.toLocaleString()}</span>
              <span className="text-xs font-mono font-normal text-zinc-400">NTD</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              成員每月結算未打卡與預排違規款項自動匯入
            </p>
          </div>

          <div className="pt-3 border-t border-white/[0.08] text-[11px] font-mono text-zinc-500 flex items-center justify-between">
            <span>月結轉正</span>
            <span className="text-zinc-300">每月 1 號 00:00 自動結算</span>
          </div>
        </div>

        {/* 共享夢想標竿 (支援直接在卡片上編輯名稱與目標金額) */}
        <div className="md:col-span-2 p-6 ios-glass-card flex flex-col justify-between relative overflow-hidden">
          {/* 背景磨砂視覺微光 */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none overflow-hidden rounded-r-3xl">
            <img
              src={groupSettings.cover_photo}
              alt="Goal"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-white font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
                <Plane className="w-3.5 h-3.5 text-white" />
                <span className="tracking-wide">共享夢想標竿</span>
              </span>

              {/* 編輯夢想標竿按鈕 */}
              {!isEditingGoal ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditGoalName(groupSettings.goal_name);
                    setEditGoalAmount(groupSettings.goal_amount);
                    setIsEditingGoal(true);
                  }}
                  className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>修改標竿目標</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveGoal}
                    disabled={isSavingGoal}
                    className="px-3 py-1 rounded-full bg-white text-black font-bold text-xs flex items-center gap-1 hover:bg-zinc-200 transition-colors shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>儲存</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingGoal(false)}
                    className="px-2.5 py-1 rounded-full bg-white/10 text-zinc-300 hover:text-white text-xs transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 編輯模式 vs 檢視模式 */}
            {isEditingGoal ? (
              <div className="space-y-3 my-2">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">標竿目標名稱：</label>
                  <input
                    type="text"
                    value={editGoalName}
                    onChange={(e) => setEditGoalName(e.target.value)}
                    placeholder="輸入目標名稱..."
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/20 text-sm font-medium text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">目標所需金額 (NTD)：</label>
                  <input
                    type="number"
                    step="1000"
                    value={editGoalAmount}
                    onChange={(e) => setEditGoalAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/20 text-sm font-medium text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight mb-1">
                  {groupSettings.goal_name}
                </h3>
                <p className="text-xs font-mono text-zinc-400">
                  目標金額：<span className="text-white font-semibold">${groupSettings.goal_amount.toLocaleString()}</span> NTD
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">公費儲備達成率</span>
              <span className="text-white font-bold">{progressPercent}%</span>
            </div>

            {/* iOS 簡潔微光進度條 */}
            <div className="w-full h-2.5 rounded-full bg-black/60 border border-white/10 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-zinc-300 via-white to-zinc-200 transition-all duration-700 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 即時違規追蹤 (全新規則：當日任一未完罰 100，預排不足罰 100) */}
      <div className="p-5 ios-glass-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                本月未結算違規追蹤
              </h4>
              <p className="text-[11px] text-zinc-400 font-mono">
                當日任務有任一未完罰 $100 • 明日預排不足 2 項罰 $100
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono text-zinc-400 block">本月預估待繳總罰金</span>
            <span className="text-xl font-bold font-sans text-white">
              ${totalEstimatedUnsettledFine} <span className="text-xs font-normal text-zinc-400">NTD</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentMonthUnsettledStats.map(({ profile, taskFailedDaysCount, preplanFailedDaysCount, estimatedFine }) => (
            <div
              key={profile.id}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-sm"
                  />
                  <div>
                    <div className="text-sm font-bold text-white">{profile.username}</div>
                    <div className="text-[11px] font-mono text-zinc-400">
                      累計違規次數
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    +${estimatedFine}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500">次月 1 號帳單</div>
                </div>
              </div>

              {/* 違規明細拆解 */}
              <div className="pt-2.5 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <CalendarX className="w-3.5 h-3.5 text-zinc-400" />
                  <span>任務未完: <b className="text-white">{taskFailedDaysCount}</b> 天</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-zinc-400" />
                  <span>預排不足: <b className="text-white">{preplanFailedDaysCount}</b> 次</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 成員歷史累計罰金排行榜 */}
      <div className="p-6 ios-glass-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              公費歷史貢獻排行 // LEADERBOARD
            </h4>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            結算罰款全數挹注共同夢想基金
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedProfiles.map((profile, index) => {
            const isTop = index === 0 && profile.total_paid_fine > 0;

            return (
              <div
                key={profile.id}
                className={`p-4 rounded-2xl border transition-all flex items-center gap-3.5 relative overflow-hidden ${
                  isTop
                    ? 'bg-white/[0.06] border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                    : 'bg-white/[0.02] border-white/[0.08]'
                }`}
              >
                <div className="relative">
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-12 h-12 rounded-full object-cover border border-white/20"
                  />
                  {isTop && (
                    <div className="absolute -top-1.5 -right-1 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                      <Crown className="w-3 h-3 fill-black text-black" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">
                      {profile.username}
                    </span>
                    {isTop && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-bold">
                        罰金王
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-zinc-400 mt-1">
                    歷史已結算: <span className="text-white font-semibold">${profile.total_paid_fine}</span> NTD
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 歷史月結帳單紀錄 (Monthly Bills) 與自動/手動歸檔 */}
      <div className="p-6 ios-glass-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-white/[0.08] gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-white" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              歷史月結帳單歸檔 // BILLING ARCHIVE
            </h4>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
              <CalendarCheck className="w-3 h-3 text-white" />
              <span>每月 1 號 00:00 自動歸檔</span>
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-mono text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>全自動排程執行中</span>
          </div>
        </div>

        {monthlyBills.length === 0 ? (
          <div className="py-10 text-center space-y-2 font-mono">
            <div className="text-zinc-500 text-xs">
              - 暫無月結帳單紀錄 -
            </div>
            <p className="text-[11px] text-zinc-500">
              系統會在每月 1 號 00:00 自動結算整月違規並寫入此處歸檔，全自動無人值守運作。
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {monthlyBills.map((bill) => {
              const billedUser = profiles.find((p) => p.id === bill.user_id);

              return (
                <div
                  key={bill.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] transition-all flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {billedUser && (
                      <img
                        src={billedUser.avatar_url}
                        alt={billedUser.username}
                        className="w-8 h-8 rounded-full object-cover border border-white/20 flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold truncate">
                          {billedUser?.username || '成員'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                          {bill.billing_month.slice(0, 7)} 結算
                        </span>
                        <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-zinc-400">
                          <CheckCircle className="w-3 h-3 text-white" />
                          已歸檔
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        整月累計未打卡/預排不足違規: <span className="text-white font-semibold">{bill.failed_tasks_count}</span> 次
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="text-sm font-bold text-white tracking-tight">
                      +${bill.fine_amount.toLocaleString()} <span className="text-[10px] text-zinc-400 font-normal">NTD</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {bill.created_at ? new Date(bill.created_at).toLocaleDateString('zh-TW') : '已歸檔'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
