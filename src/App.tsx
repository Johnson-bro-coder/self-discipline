import React, { useState, useEffect } from 'react';
import { NavTab, Profile, Task, GroupSettings, MonthlyBill, DayOfWeek } from './types/database';
import {
  getProfiles,
  updateProfile,
  getGroupSettings,
  updateGroupSettings,
  getTasks,
  createTask,
  updateTaskTitle,
  removeTask,
  completeTaskWithProof,
  skipTaskWithReason,
  getMonthlyBills,
  checkAndAutoArchiveMonthlyBills,
  isSupabaseConfigured,
  createDailyRoutine,
  updateDailyRoutine,
  removeDailyRoutine,
  ensureDailyRoutinesForDate,
  resetAllTasksAndFines,
} from './lib/supabase';
import { getTodayDateStr, getTomorrowDateStr } from './lib/mockData';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { HomeTerminal } from './components/HomeTerminal';
import { WeeklyMatrix } from './components/WeeklyMatrix';
import { TreasuryView } from './components/TreasuryView';
import { SettingsView } from './components/SettingsView';
import { ProofModal } from './components/ProofModal';
import { SkipReasonModal } from './components/SkipReasonModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { Terminal, Clock, Flame, Database, ChevronsUpDown } from 'lucide-react';

const USER_ID_STORAGE_KEY = 'cyber_discipline_user_id';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('treasury');
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem(USER_ID_STORAGE_KEY);
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groupSettings, setGroupSettings] = useState<GroupSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [monthlyBills, setMonthlyBills] = useState<MonthlyBill[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 打卡、豁免與照片燈箱 Modal
  const [selectedProofTask, setSelectedProofTask] = useState<Task | null>(null);
  const [selectedSkipTask, setSelectedSkipTask] = useState<Task | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // 日期狀態
  const [todayDateStr, setTodayDateStr] = useState<string>(getTodayDateStr());
  const [tomorrowDateStr, setTomorrowDateStr] = useState<string>(getTomorrowDateStr());
  const [currentTime, setCurrentTime] = useState<string>('');
  const [countdown, setCountdown] = useState<string>('');

  // 1. 初始化資料
  const reloadData = async () => {
    try {
      // 自動檢查歷史月結帳單歸檔 (每月 1 號或有未歸檔資料時自動結算)
      await checkAndAutoArchiveMonthlyBills();

      const activeId = currentUserId || localStorage.getItem(USER_ID_STORAGE_KEY);
      if (activeId) {
        // 確保常駐必做序列在今日有對應任務（保留項目、重置狀態為未打卡）
        await ensureDailyRoutinesForDate(activeId, todayDateStr);
      }

      const [fetchedProfiles, fetchedGroup, fetchedTasks, fetchedBills] = await Promise.all([
        getProfiles(),
        getGroupSettings(),
        getTasks(),
        getMonthlyBills(),
      ]);
      setProfiles(fetchedProfiles);
      setGroupSettings(fetchedGroup);
      setTasks(fetchedTasks);
      setMonthlyBills(fetchedBills);
    } catch (err) {
      console.error('Data reload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadData();

    // 檢查是否有登入者
    const saved = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (!saved) {
      setIsAuthModalOpen(true);
    }

    // 倒數與即時時鐘
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('zh-TW', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      const diffMs = Math.max(0, midnight.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setCountdown(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );

      // 日期跨夜檢查
      const currentToday = getTodayDateStr();
      if (currentToday !== todayDateStr) {
        setTodayDateStr(currentToday);
        setTomorrowDateStr(getTomorrowDateStr());
        reloadData();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [todayDateStr]);

  // 當前登入者 Profile
  const currentProfile =
    profiles.find((p) => p.id === currentUserId) || profiles[0] || null;

  // 計算未結算違規總數 (按天違規 + 預排違規)
  const totalUnsettledViolations = React.useMemo(() => {
    let total = 0;
    profiles.forEach((p) => {
      const userTasks = tasks.filter((t) => t.user_id === p.id);
      if (userTasks.length === 0) return;

      const distinctDates = Array.from(new Set(userTasks.map((t) => t.target_date)));
      distinctDates.forEach((dateStr) => {
        // 未來日期（如明日預排）尚未到期，絕不計入任務未完成違規
        if (dateStr > todayDateStr) {
          return;
        }

        const dayTasks = userTasks.filter(
          (t) => t.target_date === dateStr && (t.category === 'daily' || t.category === 'routine')
        );
        if (dayTasks.some((t) => !t.is_completed && !t.is_skipped)) {
          total += 1;
        }
        if (dateStr < todayDateStr) {
          const [y, m, d] = dateStr.split('-').map(Number);
          const nextDate = new Date(y, m - 1, d + 1);
          const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
          const nextDayPlans = userTasks.filter((t) => t.target_date === nextDateStr && t.category === 'daily');
          if (nextDayPlans.length < 2) {
            total += 1;
          }
        }
      });

      const hasTodayTasks = userTasks.some((t) => t.target_date === todayDateStr);
      if (hasTodayTasks) {
        const tomorrowTasks = userTasks.filter((t) => t.category === 'daily' && t.target_date > todayDateStr);
        if (tomorrowTasks.length < 2) {
          total += 1;
        }
      }
    });
    return total;
  }, [tasks, profiles, todayDateStr]);

  // 登入 / 切換身分選擇
  const handleSelectUser = async (userId: string) => {
    setCurrentUserId(userId);
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
    setIsAuthModalOpen(false);
    // 確保切換後的成員當日常駐必做序列存在
    await ensureDailyRoutinesForDate(userId, todayDateStr);
    const updatedTasks = await getTasks();
    setTasks(updatedTasks);
  };

  // 登出
  const handleLogout = () => {
    setCurrentUserId(null);
    localStorage.removeItem(USER_ID_STORAGE_KEY);
    setIsAuthModalOpen(true);
  };

  // 打卡完成
  const handleCompleteProof = async (taskId: string, proofUrl: string) => {
    await completeTaskWithProof(taskId, proofUrl);
    await reloadData();
  };

  // 不可抗力豁免
  const handleConfirmSkip = async (taskId: string, reason: string) => {
    await skipTaskWithReason(taskId, reason);
    await reloadData();
  };

  // 常駐每日必做：新增項目
  const handleAddRoutine = async (title: string) => {
    if (!currentProfile) return;
    await createDailyRoutine(currentProfile.id, title);
    await reloadData();
  };

  // 常駐每日必做：修改項目名稱
  const handleUpdateRoutine = async (routineId: string, newTitle: string) => {
    await updateDailyRoutine(routineId, newTitle);
    await reloadData();
  };

  // 常駐每日必做：刪除項目
  const handleDeleteRoutine = async (routineId: string) => {
    await removeDailyRoutine(routineId);
    await reloadData();
  };

  // 新增明日預排任務
  const handleAddTomorrowTask = async (title: string, targetDate: string) => {
    if (!currentProfile) return;
    await createTask({
      user_id: currentProfile.id,
      title,
      category: 'daily',
      is_completed: false,
      is_skipped: false,
      target_date: targetDate,
      status: 'pending',
    });
    await reloadData();
  };

  // 刪除任務
  const handleDeleteTask = async (taskId: string) => {
    await removeTask(taskId);
    await reloadData();
  };

  // 修改任務名稱
  const handleUpdateTaskTitle = async (taskId: string, newTitle: string) => {
    await updateTaskTitle(taskId, newTitle);
    await reloadData();
  };

  // 新增每週排程
  const handleAddWeeklyTask = async (userId: string, title: string, day: DayOfWeek) => {
    await createTask({
      user_id: userId,
      title,
      category: 'weekly',
      day_of_week: day,
      is_completed: false,
      is_skipped: false,
      target_date: todayDateStr,
      status: 'pending',
    });
    await reloadData();
  };

  // 切換每週任務完成
  const handleToggleWeeklyTask = async (taskId: string, currentCompleted: boolean) => {
    if (currentCompleted) {
      await skipTaskWithReason(taskId, '');
    } else {
      await completeTaskWithProof(taskId, 'weekly_done');
    }
    await reloadData();
  };

  // 修改個人資料
  const handleUpdateProfile = async (username: string, avatarUrl: string) => {
    if (!currentProfile) return;
    await updateProfile(currentProfile.id, { username, avatar_url: avatarUrl });
    await reloadData();
  };

  // 修改群組目標
  const handleUpdateGroupSettings = async (name: string, amount: number) => {
    await updateGroupSettings({ goal_name: name, goal_amount: amount });
    await reloadData();
  };

  // 一鍵初始化所有任務與罰款
  const handleResetAllData = async () => {
    await resetAllTasksAndFines();
    await reloadData();
  };

  return (
    <div className="min-h-screen w-screen bg-black text-white flex flex-col font-sans select-none relative ios-glass-bg">
      {/* 1. 頂部 iOS 液態玻璃列 */}
      <header className="h-16 px-6 bg-black/40 border-b border-white/[0.08] backdrop-blur-2xl flex items-center justify-between shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white uppercase font-sans">
                TRIO DISCIPLINE
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/10 text-white border border-white/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">
              Johnson • nigga • shorty 共同自律
            </p>
          </div>
        </div>

        {/* 中央即時時間與 23:59 倒數計時 */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-400">現在時間:</span>
            <span className="text-white font-semibold">{currentTime}</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-mono">
            <span className="text-white font-medium">23:59 結算倒數:</span>
            <span className="text-white font-bold tracking-wider">
              {countdown}
            </span>
          </div>
        </div>

        {/* 右側當前操作者標籤與連線狀態 */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono text-zinc-400">
            <Database className="w-3 h-3 text-white" />
            {isSupabaseConfigured() ? (
              <span className="text-white font-medium">CLOUD ONLINE</span>
            ) : (
              <span className="text-zinc-400">LOCAL CACHE</span>
            )}
          </div>

          {currentProfile ? (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 p-1 pr-3 rounded-full bg-white/[0.05] border border-white/15 hover:border-white/40 hover:bg-white/10 transition-all group cursor-pointer shadow-sm"
              title="點擊直接切換操作者帳號"
            >
              <img
                src={currentProfile.avatar_url}
                alt={currentProfile.username}
                className="w-7 h-7 rounded-full object-cover border border-white/20 group-hover:border-white transition-colors"
              />
              <span className="text-xs font-sans font-semibold text-white group-hover:text-white">
                {currentProfile.username}
              </span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-4 py-1.5 rounded-full bg-white text-black font-semibold text-xs shadow-sm hover:bg-zinc-200 transition-colors"
            >
              登入身分
            </button>
          )}
        </div>
      </header>

      {/* 2. 主視圖內容區域 (根據 BottomNav 切換) */}
      <main className="flex-1 p-6 overflow-y-auto min-h-0">
        {isLoading || !groupSettings || !currentProfile ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-sm py-20">
            <Terminal className="w-8 h-8 text-white animate-pulse mb-3" />
            <p>載入自律系統矩陣中...</p>
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeTerminal
                currentProfile={currentProfile}
                tasks={tasks}
                todayDateStr={todayDateStr}
                tomorrowDateStr={tomorrowDateStr}
                onOpenProofModal={(task) => setSelectedProofTask(task)}
                onOpenSkipModal={(task) => setSelectedSkipTask(task)}
                onPreviewImage={(url, title) => setPreviewImage({ url, title })}
                onAddRoutine={handleAddRoutine}
                onUpdateRoutine={handleUpdateRoutine}
                onDeleteRoutine={handleDeleteRoutine}
                onAddTask={handleAddTomorrowTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTaskTitle={handleUpdateTaskTitle}
              />
            )}

            {activeTab === 'weekly' && (
              <WeeklyMatrix
                tasks={tasks}
                profiles={profiles}
                currentProfile={currentProfile}
                onToggleWeeklyTask={handleToggleWeeklyTask}
                onAddWeeklyTask={handleAddWeeklyTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTaskTitle={handleUpdateTaskTitle}
              />
            )}

            {activeTab === 'treasury' && (
              <TreasuryView
                profiles={profiles}
                groupSettings={groupSettings}
                monthlyBills={monthlyBills}
                tasks={tasks}
                onUpdateGroupSettings={handleUpdateGroupSettings}
                todayDateStr={todayDateStr}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                currentProfile={currentProfile}
                onUpdateProfile={handleUpdateProfile}
                onLogout={handleLogout}
                onResetAllData={handleResetAllData}
              />
            )}
          </>
        )}
      </main>

      {/* 3. 固定的 iOS 浮動玻璃導覽列 (Bottom Navigation Bar) */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unsettledViolationsCount={totalUnsettledViolations}
      />

      {/* 4. 全域彈窗 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        profiles={profiles}
        currentProfile={currentProfile}
        onSelectUser={handleSelectUser}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ProofModal
        task={selectedProofTask}
        username={currentProfile?.username}
        isOpen={!!selectedProofTask}
        onClose={() => setSelectedProofTask(null)}
        onSuccess={handleCompleteProof}
      />

      <SkipReasonModal
        task={selectedSkipTask}
        isOpen={!!selectedSkipTask}
        onClose={() => setSelectedSkipTask(null)}
        onConfirm={handleConfirmSkip}
      />

      <ImagePreviewModal
        imageUrl={previewImage?.url || null}
        title={previewImage?.title}
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default App;
