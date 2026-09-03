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
  runMonthlySettlementRpc,
  isSupabaseConfigured,
  createDailyRoutine,
  updateDailyRoutine,
  removeDailyRoutine,
  ensureDailyRoutinesForDate,
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
import { Terminal, Clock, Flame, Database } from 'lucide-react';

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
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

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

  // 計算未結算違規總數
  const totalUnsettledViolations = tasks.filter(
    (t) => t.status === 'pending' && !t.is_completed && !t.is_skipped
  ).length;

  // 登入身分選擇
  const handleSelectUser = (userId: string) => {
    setCurrentUserId(userId);
    localStorage.setItem(USER_ID_STORAGE_KEY, userId);
    setIsAuthModalOpen(false);
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

  // 手動模擬月結算
  const handleRunMonthlySettlement = async () => {
    const confirm = window.confirm(
      '即將模擬執行【每月 1 號 00:00 月結排程】：\n1. 統計上月未打卡且未豁免的違規項目\n2. 每項計入 $100 元，產出月結帳單\n3. 累加至個人 total_paid_fine 並轉入公費總池\n\n確定立即模擬執行？'
    );
    if (!confirm) return;

    setIsAuditing(true);
    try {
      const res = await runMonthlySettlementRpc();
      alert(res.message);
      await reloadData();
    } catch (err) {
      alert('月結算執行異常');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-cyber-darkest text-slate-100 flex flex-col font-sans select-none relative crt-overlay">
      {/* 1. 頂部賽博監控列 */}
      <header className="h-16 px-6 bg-cyber-950/90 border-b border-cyber-800 backdrop-blur-xl flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan">
            <Flame className="w-5 h-5 text-neon-cyan animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black font-mono tracking-widest text-slate-100 uppercase">
                TRIO DISCIPLINE <span className="text-neon-cyan">// OS</span>
              </h1>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40">
                CYBERPUNK
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Johnson • nigga • shorty 終端防線
            </p>
          </div>
        </div>

        {/* 中央即時時間與 23:59 倒數計時 */}
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-900 border border-cyber-800 text-xs font-mono">
            <Clock className="w-4 h-4 text-neon-cyan" />
            <span className="text-slate-400">CLOCK:</span>
            <span className="text-slate-200 font-bold tracking-wider">{currentTime}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-magenta/10 border border-neon-magenta/40 text-xs font-mono">
            <span className="text-neon-magenta font-semibold animate-pulse">23:59 結算倒數:</span>
            <span className="text-rose-200 font-extrabold tracking-widest text-sm font-mono">
              {countdown}
            </span>
          </div>
        </div>

        {/* 右側當前操作者標籤與連線狀態 */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded bg-cyber-900 border border-cyber-800 text-[10px] font-mono text-slate-400">
            <Database className="w-3 h-3 text-neon-cyan" />
            {isSupabaseConfigured() ? (
              <span className="text-neon-green">ONLINE</span>
            ) : (
              <span className="text-neon-yellow">LOCAL CACHE</span>
            )}
          </div>

          {currentProfile ? (
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-cyber-900 border border-cyber-700 hover:border-neon-cyan transition-all group"
            >
              <img
                src={currentProfile.avatar_url}
                alt={currentProfile.username}
                className="w-7 h-7 rounded-full object-cover border border-neon-cyan/50"
              />
              <span className="text-xs font-mono font-bold text-slate-200 group-hover:text-neon-cyan">
                {currentProfile.username}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-neon-cyan text-cyber-950 font-mono text-xs font-bold"
            >
              登入身分
            </button>
          )}
        </div>
      </header>

      {/* 2. 主視圖內容區域 (根據 BottomNav 切換) */}
      <main className="flex-1 p-6 overflow-y-auto min-h-0">
        {isLoading || !groupSettings || !currentProfile ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-sm py-20">
            <Terminal className="w-8 h-8 text-neon-cyan animate-pulse mb-3" />
            <p>INITIALIZING CYBERPUNK MATRIX...</p>
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
                onRunMonthlySettlement={handleRunMonthlySettlement}
                isAuditing={isAuditing}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                currentProfile={currentProfile}
                groupSettings={groupSettings}
                onUpdateProfile={handleUpdateProfile}
                onUpdateGroupSettings={handleUpdateGroupSettings}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>

      {/* 3. 固定的賽博底部導航列 (Bottom Navigation Bar) */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unsettledViolationsCount={totalUnsettledViolations}
      />

      {/* 4. 全域彈窗 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        profiles={profiles}
        onSelectUser={handleSelectUser}
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
