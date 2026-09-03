import React, { useState } from 'react';
import { Profile, Task } from '../types/database';
import {
  CheckCircle2,
  Circle,
  Camera,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  Eye,
  Calendar,
  Clock,
  Repeat,
  Sparkles,
} from 'lucide-react';

interface HomeTerminalProps {
  currentProfile: Profile;
  tasks: Task[];
  todayDateStr: string;
  tomorrowDateStr: string;
  onOpenProofModal: (task: Task) => void;
  onOpenSkipModal: (task: Task) => void;
  onPreviewImage: (url: string, title: string) => void;
  onAddRoutine: (title: string) => Promise<void>;
  onUpdateRoutine: (routineId: string, newTitle: string) => Promise<void>;
  onDeleteRoutine: (routineId: string) => Promise<void>;
  onAddTask: (title: string, targetDate: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onUpdateTaskTitle: (taskId: string, newTitle: string) => Promise<void>;
}

export const HomeTerminal: React.FC<HomeTerminalProps> = ({
  currentProfile,
  tasks,
  todayDateStr,
  tomorrowDateStr,
  onOpenProofModal,
  onOpenSkipModal,
  onPreviewImage,
  onAddRoutine,
  onUpdateRoutine,
  onDeleteRoutine,
  onAddTask,
  onDeleteTask,
  onUpdateTaskTitle,
}) => {
  // 分頁順序對調：1. 常駐每日必做 (routine) -> 2. 今日任務 (daily) -> 3. 明日預排序列 (tomorrow)
  const [activeTab, setActiveTab] = useState<'routine' | 'daily' | 'tomorrow'>('routine');

  // 輸入框狀態
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newDailyTitle, setNewDailyTitle] = useState('');
  const [newTomorrowTitle, setNewTomorrowTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 內嵌編輯項目名稱
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // 1. 常駐每日必做 (category === 'routine')
  const todayRoutineTasks = tasks.filter(
    (t) => t.user_id === currentProfile.id && t.category === 'routine' && t.target_date === todayDateStr
  );

  // 2. 今日任務 (category === 'daily' & target_date === todayDateStr)
  const todayDailyTasks = tasks.filter(
    (t) => t.user_id === currentProfile.id && t.category === 'daily' && t.target_date === todayDateStr
  );

  // 3. 明日預排 (target_date === tomorrowDateStr)
  const tomorrowTasks = tasks.filter(
    (t) => t.user_id === currentProfile.id && t.category === 'daily' && t.target_date === tomorrowDateStr
  );

  // 今日總計任務 (Routine + Daily)
  const allTodayTasks = [...todayRoutineTasks, ...todayDailyTasks];
  const completedTodayCount = allTodayTasks.filter((t) => t.is_completed).length;
  const skippedTodayCount = allTodayTasks.filter((t) => t.is_skipped).length;
  const totalToday = allTodayTasks.length;
  const effectiveDone = completedTodayCount + skippedTodayCount;
  const progressPercent = totalToday > 0 ? Math.round((effectiveDone / totalToday) * 100) : 0;

  const isTomorrowSufficient = tomorrowTasks.length >= 2;

  // 新增常駐必做
  const handleAddRoutineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineTitle.trim()) return;
    setIsSubmitting(true);
    await onAddRoutine(newRoutineTitle.trim());
    setNewRoutineTitle('');
    setIsSubmitting(false);
  };

  // 新增今日任務
  const handleAddDailySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDailyTitle.trim()) return;
    setIsSubmitting(true);
    await onAddTask(newDailyTitle.trim(), todayDateStr);
    setNewDailyTitle('');
    setIsSubmitting(false);
  };

  // 新增明日預排
  const handleAddTomorrowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTomorrowTitle.trim()) return;
    setIsSubmitting(true);
    await onAddTask(newTomorrowTitle.trim(), tomorrowDateStr);
    setNewTomorrowTitle('');
    setIsSubmitting(false);
  };

  // 儲存修改名稱
  const handleSaveTitle = async (task: Task) => {
    if (!editingText.trim()) return;
    if (task.routine_id) {
      await onUpdateRoutine(task.routine_id, editingText.trim());
    } else {
      await onUpdateTaskTitle(task.id, editingText.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-full select-none animate-fadeIn pb-20">
      {/* 1. 操作者終端頂部資訊卡 */}
      <div className="p-6 bg-cyber-900/90 border border-cyber-700 cyber-clip-card relative mb-6 shadow-cyber-cyan/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-neon-cyan shadow-cyber-cyan">
              <img
                src={currentProfile.avatar_url}
                alt={currentProfile.username}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/40 text-[10px] font-mono text-neon-cyan">
                  OPERATOR
                </span>
                <h2 className="text-2xl font-black text-slate-100 font-mono tracking-tight">
                  {currentProfile.username}
                </h2>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-3">
                <span>
                  UUID: <span className="text-slate-500">{currentProfile.id.slice(0, 8)}...</span>
                </span>
                <span>
                  累計罰金儲備: <span className="text-neon-yellow font-bold">${currentProfile.total_paid_fine}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 今日進度統計 */}
          <div className="text-right">
            <div className="text-xs font-mono text-slate-400">今日總任務達成率</div>
            <div className="text-2xl font-black font-mono text-neon-cyan tracking-wider">
              {completedTodayCount}/{totalToday}
              <span className="text-sm font-normal text-slate-500 ml-1.5">({progressPercent}%)</span>
            </div>
          </div>
        </div>

        {/* 賽博進度條 */}
        <div className="w-full h-2 rounded-full bg-cyber-950 border border-cyber-800 mt-4 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-green transition-all duration-700 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. 三分頁導覽標籤 (順序：常駐每日必做 -> 今日任務 -> 明日預排序列) */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Tab 1: 常駐每日必做序列 */}
        <button
          onClick={() => setActiveTab('routine')}
          className={`py-3 px-4 rounded-xl border font-mono text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all relative ${
            activeTab === 'routine'
              ? 'bg-cyber-900 border-neon-cyan text-neon-cyan shadow-cyber-cyan/30'
              : 'bg-cyber-950/60 border-cyber-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Repeat className="w-4 h-4 text-neon-cyan" />
          <span>常駐每日必做 ({todayRoutineTasks.length})</span>
          <span className="hidden lg:inline text-[10px] text-neon-cyan/70 font-normal ml-1">
            [每日刷新]
          </span>
        </button>

        {/* Tab 2: 今日任務 (原今日單日任務，已改名並與明日預排欄位對調) */}
        <button
          onClick={() => setActiveTab('daily')}
          className={`py-3 px-4 rounded-xl border font-mono text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'daily'
              ? 'bg-cyber-900 border-neon-cyan text-neon-cyan shadow-cyber-cyan/30'
              : 'bg-cyber-950/60 border-cyber-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4 text-neon-cyan" />
          <span>今日任務 ({todayDailyTasks.length})</span>
        </button>

        {/* Tab 3: 明日預排序列 */}
        <button
          onClick={() => setActiveTab('tomorrow')}
          className={`py-3 px-4 rounded-xl border font-mono text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all relative ${
            activeTab === 'tomorrow'
              ? 'bg-cyber-900 border-neon-yellow text-neon-yellow shadow-cyber-yellow/30'
              : 'bg-cyber-950/60 border-cyber-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 text-neon-yellow" />
          <span>明日預排序列 ({tomorrowTasks.length})</span>
          {!isTomorrowSufficient && (
            <span className="w-2.5 h-2.5 rounded-full bg-neon-yellow animate-ping absolute top-2 right-3" />
          )}
        </button>
      </div>

      {/* 3. 內容展示與操作區 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* ========================================================================= */}
        {/* 模式 A：常駐每日必做序列 */}
        {/* ========================================================================= */}
        {activeTab === 'routine' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-between text-xs font-mono text-neon-cyan">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>
                  【常駐必做序列】：項目每日自動保留，午夜 00:00 自動刷新打卡狀態（重設為未打卡）
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] text-slate-400">隨時可新增、改名、刪除</span>
            </div>

            {todayRoutineTasks.length === 0 ? (
              <div className="py-12 text-center border border-cyber-800 cyber-clip-card bg-cyber-900/40 text-slate-500 font-mono text-xs">
                <Repeat className="w-8 h-8 mx-auto mb-2 text-neon-cyan opacity-40" />
                <p>目前尚無常駐每日必做項目</p>
                <p className="text-[11px] text-slate-600 mt-1">請在下方新增你的每日固定核心習慣！</p>
              </div>
            ) : (
              todayRoutineTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all ${
                    task.is_completed
                      ? 'bg-neon-cyan/5 border-neon-cyan/40'
                      : task.is_skipped
                      ? 'bg-cyber-900/40 border-cyber-800 opacity-60'
                      : 'bg-cyber-900/80 border-cyber-700/80 hover:border-cyber-cyan'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      disabled={task.is_completed || task.is_skipped}
                      onClick={() => onOpenProofModal(task)}
                      className="mt-0.5 shrink-0 focus:outline-none group/check"
                      title={
                        task.is_completed
                          ? '已完成今日打卡'
                          : task.is_skipped
                          ? '不可抗力豁免'
                          : '點擊上傳照片或佐證完成打卡'
                      }
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-6 h-6 text-neon-cyan drop-shadow-[0_0_8px_#00f0ff]" />
                      ) : task.is_skipped ? (
                        <Circle className="w-6 h-6 text-slate-600 line-through" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-500 group-hover/check:text-neon-cyan transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId === task.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm bg-cyber-950 border border-neon-cyan rounded-lg text-slate-100 focus:outline-none font-mono"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveTitle(task)}
                            className="p-1.5 rounded-lg bg-neon-cyan text-cyber-950 hover:bg-neon-cyan/90"
                            title="儲存修改"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/edit">
                          <span className="px-1.5 py-0.2 rounded bg-neon-cyan/20 border border-neon-cyan/40 text-[9px] font-mono text-neon-cyan shrink-0">
                            常駐必做
                          </span>
                          <p
                            className={`text-sm font-semibold leading-relaxed break-words ${
                              task.is_completed
                                ? 'text-neon-cyan/90 font-mono'
                                : task.is_skipped
                                ? 'text-slate-500 line-through'
                                : 'text-slate-200'
                            }`}
                          >
                            {task.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(task.id);
                              setEditingText(task.title);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-neon-cyan opacity-0 group-hover/edit:opacity-100 transition-opacity"
                            title="修改名稱"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {task.is_skipped && (
                        <div className="mt-1 text-xs font-mono text-neon-yellow bg-neon-yellow/10 px-2 py-0.5 rounded border border-neon-yellow/30 inline-block">
                          豁免理由：{task.skip_reason}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {task.is_completed && task.proof_url && (
                        task.proof_url.startsWith('http') &&
                        !task.proof_url.includes('supabase') &&
                        !task.proof_url.includes('data:image') &&
                        !task.proof_url.includes('/photos/') ? (
                          <a
                            href={task.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-cyber-800 border border-cyber-700 text-neon-cyan hover:bg-cyber-700 text-xs flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>佐證</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onPreviewImage(task.proof_url!, task.title)}
                            className="relative w-10 h-10 rounded-xl overflow-hidden border border-neon-cyan/50 hover:border-neon-cyan transition-all group/thumb"
                            title="點擊放大照片"
                          >
                            <img
                              src={task.proof_url}
                              alt="Proof"
                              className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </button>
                        )
                      )}

                      {task.routine_id && (
                        <button
                          type="button"
                          onClick={() => onDeleteRoutine(task.routine_id!)}
                          className="p-1.5 rounded text-slate-500 hover:text-neon-magenta hover:bg-neon-magenta/10 transition-colors"
                          title="從常駐序列移除此項目"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!task.is_completed && !task.is_skipped && (
                    <div className="mt-3 pt-2.5 border-t border-cyber-800 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenSkipModal(task)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-neon-yellow hover:bg-cyber-800 transition-colors"
                      >
                        申請豁免
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenProofModal(task)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 flex items-center gap-1.5 transition-all shadow-cyber-cyan/20"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>上傳照片打卡</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            <form onSubmit={handleAddRoutineSubmit} className="mt-4">
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-cyber-950 border border-cyber-700 focus-within:border-neon-cyan transition-colors">
                <input
                  type="text"
                  value={newRoutineTitle}
                  onChange={(e) => setNewRoutineTitle(e.target.value)}
                  placeholder="隨時新增常駐每日必做項目（如：晨跑、深蹲、背單字）..."
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newRoutineTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-neon-cyan hover:bg-neon-cyan/90 text-cyber-950 font-bold text-xs font-mono transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-cyber-cyan/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>加入常駐序列</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 模式 B：今日任務 (樣貌與常駐每日必做一致，具備打卡、豁免、縮圖、編輯與刪除) */}
        {/* ========================================================================= */}
        {activeTab === 'daily' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/40 flex items-center justify-between text-xs font-mono text-neon-cyan">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  【今日任務】：專為今日特別安排的單次必做項目，可隨時新增打卡！
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] text-slate-400">當日打卡有效</span>
            </div>

            {todayDailyTasks.length === 0 ? (
              <div className="py-12 text-center border border-cyber-800 cyber-clip-card bg-cyber-900/40 text-slate-500 font-mono text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 text-neon-cyan opacity-40" />
                <p>目前尚無今日單次任務</p>
                <p className="text-[11px] text-slate-600 mt-1">可在下方新增今日任務，或至「明日預排序列」規劃隔日任務！</p>
              </div>
            ) : (
              todayDailyTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all ${
                    task.is_completed
                      ? 'bg-neon-cyan/5 border-neon-cyan/40'
                      : task.is_skipped
                      ? 'bg-cyber-900/40 border-cyber-800 opacity-60'
                      : 'bg-cyber-900/80 border-cyber-700/80 hover:border-cyber-cyan'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      disabled={task.is_completed || task.is_skipped}
                      onClick={() => onOpenProofModal(task)}
                      className="mt-0.5 shrink-0 focus:outline-none group/check"
                      title={
                        task.is_completed
                          ? '已完成今日打卡'
                          : task.is_skipped
                          ? '不可抗力豁免'
                          : '點擊上傳照片或佐證完成打卡'
                      }
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-6 h-6 text-neon-cyan drop-shadow-[0_0_8px_#00f0ff]" />
                      ) : task.is_skipped ? (
                        <Circle className="w-6 h-6 text-slate-600 line-through" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-500 group-hover/check:text-neon-cyan transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId === task.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm bg-cyber-950 border border-neon-cyan rounded-lg text-slate-100 focus:outline-none font-mono"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveTitle(task)}
                            className="p-1.5 rounded-lg bg-neon-cyan text-cyber-950 hover:bg-neon-cyan/90"
                            title="儲存修改"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/edit">
                          <span className="px-1.5 py-0.2 rounded bg-neon-cyan/20 border border-neon-cyan/40 text-[9px] font-mono text-neon-cyan shrink-0">
                            今日任務
                          </span>
                          <p
                            className={`text-sm font-semibold leading-relaxed break-words ${
                              task.is_completed
                                ? 'text-neon-cyan/90 font-mono'
                                : task.is_skipped
                                ? 'text-slate-500 line-through'
                                : 'text-slate-200'
                            }`}
                          >
                            {task.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(task.id);
                              setEditingText(task.title);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-neon-cyan opacity-0 group-hover/edit:opacity-100 transition-opacity"
                            title="修改名稱"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {task.is_skipped && (
                        <div className="mt-1 text-xs font-mono text-neon-yellow bg-neon-yellow/10 px-2 py-0.5 rounded border border-neon-yellow/30 inline-block">
                          豁免理由：{task.skip_reason}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {task.is_completed && task.proof_url && (
                        task.proof_url.startsWith('http') &&
                        !task.proof_url.includes('supabase') &&
                        !task.proof_url.includes('data:image') &&
                        !task.proof_url.includes('/photos/') ? (
                          <a
                            href={task.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl bg-cyber-800 border border-cyber-700 text-neon-cyan hover:bg-cyber-700 text-xs flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>佐證</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onPreviewImage(task.proof_url!, task.title)}
                            className="relative w-10 h-10 rounded-xl overflow-hidden border border-neon-cyan/50 hover:border-neon-cyan transition-all group/thumb"
                            title="點擊放大照片"
                          >
                            <img
                              src={task.proof_url}
                              alt="Proof"
                              className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 rounded text-slate-500 hover:text-neon-magenta hover:bg-neon-magenta/10 transition-colors"
                        title="刪除此項今日任務"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {!task.is_completed && !task.is_skipped && (
                    <div className="mt-3 pt-2.5 border-t border-cyber-800 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenSkipModal(task)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-neon-yellow hover:bg-cyber-800 transition-colors"
                      >
                        申請豁免
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenProofModal(task)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 flex items-center gap-1.5 transition-all shadow-cyber-cyan/20"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>上傳照片打卡</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            <form onSubmit={handleAddDailySubmit} className="mt-4">
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-cyber-950 border border-cyber-700 focus-within:border-neon-cyan transition-colors">
                <input
                  type="text"
                  value={newDailyTitle}
                  onChange={(e) => setNewDailyTitle(e.target.value)}
                  placeholder="新增今日單次必做任務..."
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newDailyTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-neon-cyan hover:bg-neon-cyan/90 text-cyber-950 font-bold text-xs font-mono transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-cyber-cyan/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>加入今日任務</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 模式 C：明日預排序列 */}
        {/* ========================================================================= */}
        {activeTab === 'tomorrow' && (
          <div className="space-y-4">
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-mono transition-colors ${
                isTomorrowSufficient
                  ? 'bg-neon-cyan/10 border-neon-cyan/40 text-neon-cyan'
                  : 'bg-neon-yellow/10 border-neon-yellow/50 text-neon-yellow animate-pulse'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {isTomorrowSufficient
                  ? `✓ 明日已預排 ${tomorrowTasks.length} 項（達標 >= 2 項，免除預排懲罰）`
                  : `⚠️ 預排僅 ${tomorrowTasks.length} 項！每日預排不得少於 2 項，否則月底計入違規`}
              </span>
            </div>

            {tomorrowTasks.length === 0 ? (
              <div className="py-12 text-center border border-cyber-800 cyber-clip-card bg-cyber-900/40 text-slate-500 font-mono text-xs">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-neon-yellow opacity-40" />
                <p>尚未預排明日任務</p>
                <p className="text-[11px] text-slate-600 mt-1">請在 23:59 前預排至少 2 項隔日任務以避免扣罰！</p>
              </div>
            ) : (
              tomorrowTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl bg-cyber-900/80 border border-cyber-700 flex items-center justify-between gap-3 group/item"
                >
                  {editingId === task.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-cyber-950 border border-neon-yellow rounded-lg text-slate-100 font-mono"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveTitle(task)}
                        className="p-1 rounded bg-neon-yellow text-cyber-950 font-bold"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded bg-slate-800 text-slate-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-neon-yellow shrink-0" />
                      <span className="text-xs font-mono text-slate-200 truncate">{task.title}</span>
                      <button
                        onClick={() => {
                          setEditingId(task.id);
                          setEditingText(task.title);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-neon-yellow opacity-0 group-item:opacity-100"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 rounded text-slate-500 hover:text-neon-magenta hover:bg-neon-magenta/10 transition-colors"
                    title="刪除預排項目"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}

            <form onSubmit={handleAddTomorrowSubmit} className="mt-4">
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-cyber-950 border border-cyber-700 focus-within:border-neon-yellow transition-colors">
                <input
                  type="text"
                  value={newTomorrowTitle}
                  onChange={(e) => setNewTomorrowTitle(e.target.value)}
                  placeholder="預排明日任務（至少 2 項）..."
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newTomorrowTitle.trim()}
                  className="px-4 py-1.5 rounded-lg bg-neon-yellow hover:bg-neon-yellow/90 text-cyber-950 font-bold text-xs font-mono transition-colors disabled:opacity-40 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>加入預排</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
