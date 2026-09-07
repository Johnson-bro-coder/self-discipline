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
  // 分頁：1. 常駐每日必做 -> 2. 今日任務 -> 3. 明日預排序列
  const [activeTab, setActiveTab] = useState<'routine' | 'daily' | 'tomorrow'>('routine');

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

  // 今日總任務 (Routine + Daily)
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
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-full select-none animate-fadeIn space-y-6">
      {/* 1. 操作者終端頂部資訊卡 (iOS 液態玻璃風格) */}
      <div className="p-6 ios-glass-card relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              <img
                src={currentProfile.avatar_url}
                alt={currentProfile.username}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-mono text-white">
                  OPERATOR
                </span>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {currentProfile.username}
                </h2>
              </div>
              <div className="text-xs font-mono text-zinc-400 mt-1 flex items-center gap-3">
                <span>
                  累計罰金儲備: <span className="text-white font-semibold">${currentProfile.total_paid_fine}</span> NTD
                </span>
              </div>
            </div>
          </div>

          {/* 今日進度統計 */}
          <div className="text-right">
            <div className="text-xs font-mono text-zinc-400">今日總達成率</div>
            <div className="text-2xl font-bold font-sans text-white tracking-tight">
              {completedTodayCount}/{totalToday}
              <span className="text-xs font-normal text-zinc-400 ml-1.5 font-mono">({progressPercent}%)</span>
            </div>
          </div>
        </div>

        {/* 液態玻璃進度條 */}
        <div className="w-full h-2 rounded-full bg-black/60 border border-white/10 mt-4 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-zinc-300 via-white to-zinc-200 transition-all duration-700 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.4)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. 三分頁導覽標籤 (iOS 玻璃膠囊列) */}
      <div className="grid grid-cols-3 gap-2.5 p-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setActiveTab('routine')}
          className={`py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'routine'
              ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>常駐每日必做 ({todayRoutineTasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          className={`py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'daily'
              ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>今日任務 ({todayDailyTasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tomorrow')}
          className={`py-2.5 px-4 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all relative ${
            activeTab === 'tomorrow'
              ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>明日預排 ({tomorrowTasks.length})</span>
          {!isTomorrowSufficient && (
            <span className="w-2 h-2 rounded-full bg-white animate-ping absolute top-2 right-4" />
          )}
        </button>
      </div>

      {/* 3. 內容展示與操作區 */}
      <div className="flex-1 space-y-3 pr-1">
        {/* ========================================================================= */}
        {/* 模式 A：常駐每日必做序列 */}
        {/* ========================================================================= */}
        {activeTab === 'routine' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs font-mono text-zinc-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white" />
                <span>
                  【常駐必做序列】：每日自動保留項目，午夜 00:00 自動刷新重置為未打卡
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] text-zinc-500">隨時可增修</span>
            </div>

            {todayRoutineTasks.length === 0 ? (
              <div className="py-12 text-center ios-glass-card text-zinc-500 font-mono text-xs">
                <Repeat className="w-8 h-8 mx-auto mb-2 text-white/30" />
                <p>目前尚無常駐每日必做項目</p>
                <p className="text-[11px] text-zinc-600 mt-1">在下方新增你的每日固定核心習慣！</p>
              </div>
            ) : (
              todayRoutineTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    task.is_completed
                      ? 'bg-white/[0.04] border-white/20'
                      : task.is_skipped
                      ? 'bg-white/[0.01] border-white/[0.04] opacity-50'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
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
                          : '點擊上傳照片或佐證打卡'
                      }
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                      ) : task.is_skipped ? (
                        <Circle className="w-6 h-6 text-zinc-600 line-through" />
                      ) : (
                        <Circle className="w-6 h-6 text-zinc-500 group-hover/check:text-white transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId === task.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm bg-black/60 border border-white/30 rounded-xl text-white focus:outline-none font-sans"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveTitle(task)}
                            className="p-1.5 rounded-lg bg-white text-black hover:bg-zinc-200"
                            title="儲存修改"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-white/10 text-zinc-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/edit">
                          <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono text-zinc-300 shrink-0">
                            常駐必做
                          </span>
                          <p
                            className={`text-sm font-semibold leading-relaxed break-words ${
                              task.is_completed
                                ? 'text-white font-medium'
                                : task.is_skipped
                                ? 'text-zinc-500 line-through'
                                : 'text-zinc-200'
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
                            className="p-1 rounded text-zinc-500 hover:text-white opacity-0 group-hover/edit:opacity-100 transition-opacity"
                            title="修改名稱"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {task.is_skipped && (
                        <div className="mt-1 text-xs font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 inline-block">
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
                            className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 text-xs flex items-center gap-1 font-mono"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>佐證</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onPreviewImage(task.proof_url!, task.title)}
                            className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 hover:border-white transition-all group/thumb"
                            title="點擊放大照片"
                          >
                            <img
                              src={task.proof_url}
                              alt="Proof"
                              className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </button>
                        )
                      )}

                      {task.routine_id && (
                        <button
                          type="button"
                          onClick={() => onDeleteRoutine(task.routine_id!)}
                          className="p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                          title="從常駐序列移除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!task.is_completed && !task.is_skipped && (
                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenSkipModal(task)}
                        className="px-3 py-1.5 rounded-full text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        申請豁免
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenProofModal(task)}
                        className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-zinc-200 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>上傳照片打卡</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* 新增常駐必做輸入框 */}
            <form onSubmit={handleAddRoutineSubmit} className="mt-4">
              <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/[0.03] border border-white/15 focus-within:border-white transition-colors">
                <input
                  type="text"
                  value={newRoutineTitle}
                  onChange={(e) => setNewRoutineTitle(e.target.value)}
                  placeholder="新增常駐每日必做項目（如：晨跑、深蹲、背單字）..."
                  className="flex-1 bg-transparent px-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none font-sans"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newRoutineTitle.trim()}
                  className="px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>加入常駐序列</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 模式 B：今日任務 (樣貌與常駐一致) */}
        {/* ========================================================================= */}
        {activeTab === 'daily' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs font-mono text-zinc-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                <span>
                  【今日任務】：專為今日規劃的必做項目，可隨時新增打卡！
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] text-zinc-500">當日打卡有效</span>
            </div>

            {todayDailyTasks.length === 0 ? (
              <div className="py-12 text-center ios-glass-card text-zinc-500 font-mono text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 text-white/30" />
                <p>目前尚無今日任務</p>
                <p className="text-[11px] text-zinc-600 mt-1">可在下方新增今日任務，或至「明日預排」規劃隔日任務！</p>
              </div>
            ) : (
              todayDailyTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    task.is_completed
                      ? 'bg-white/[0.04] border-white/20'
                      : task.is_skipped
                      ? 'bg-white/[0.01] border-white/[0.04] opacity-50'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
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
                          : '點擊上傳照片或佐證打卡'
                      }
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                      ) : task.is_skipped ? (
                        <Circle className="w-6 h-6 text-zinc-600 line-through" />
                      ) : (
                        <Circle className="w-6 h-6 text-zinc-500 group-hover/check:text-white transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId === task.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm bg-black/60 border border-white/30 rounded-xl text-white focus:outline-none font-sans"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveTitle(task)}
                            className="p-1.5 rounded-lg bg-white text-black hover:bg-zinc-200"
                            title="儲存修改"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg bg-white/10 text-zinc-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/edit">
                          <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono text-zinc-300 shrink-0">
                            今日任務
                          </span>
                          <p
                            className={`text-sm font-semibold leading-relaxed break-words ${
                              task.is_completed
                                ? 'text-white font-medium'
                                : task.is_skipped
                                ? 'text-zinc-500 line-through'
                                : 'text-zinc-200'
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
                            className="p-1 rounded text-zinc-500 hover:text-white opacity-0 group-hover/edit:opacity-100 transition-opacity"
                            title="修改名稱"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {task.is_skipped && (
                        <div className="mt-1 text-xs font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 inline-block">
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
                            className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 text-xs flex items-center gap-1 font-mono"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>佐證</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onPreviewImage(task.proof_url!, task.title)}
                            className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 hover:border-white transition-all group/thumb"
                            title="點擊放大照片"
                          >
                            <img
                              src={task.proof_url}
                              alt="Proof"
                              className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="刪除此任務"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {!task.is_completed && !task.is_skipped && (
                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenSkipModal(task)}
                        className="px-3 py-1.5 rounded-full text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        申請豁免
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenProofModal(task)}
                        className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-zinc-200 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
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
              <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/[0.03] border border-white/15 focus-within:border-white transition-colors">
                <input
                  type="text"
                  value={newDailyTitle}
                  onChange={(e) => setNewDailyTitle(e.target.value)}
                  placeholder="新增今日任務..."
                  className="flex-1 bg-transparent px-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none font-sans"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newDailyTitle.trim()}
                  className="px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
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
          <div className="space-y-3">
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-mono transition-colors ${
                isTomorrowSufficient
                  ? 'bg-white/[0.04] border-white/20 text-white'
                  : 'bg-white/[0.02] border-white/30 text-white animate-pulse'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
              <span>
                {isTomorrowSufficient
                  ? `✓ 明日已預排 ${tomorrowTasks.length} 項（達標 >= 2 項，免除預排違規）`
                  : `⚠️ 明日僅預排 ${tomorrowTasks.length} 項！每日預排不得少於 2 項，否則午夜罰 $100`}
              </span>
            </div>

            {tomorrowTasks.length === 0 ? (
              <div className="py-12 text-center ios-glass-card text-zinc-500 font-mono text-xs">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-white/30" />
                <p>尚未預排明日任務</p>
                <p className="text-[11px] text-zinc-600 mt-1">請在午夜前預排至少 2 項隔日任務以避免扣罰！</p>
              </div>
            ) : (
              tomorrowTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 flex items-center justify-between gap-3 group/item transition-all"
                >
                  {editingId === task.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-black/60 border border-white/30 rounded-xl text-white font-sans"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveTitle(task)}
                        className="p-1 rounded-lg bg-white text-black font-bold"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded-lg bg-white/10 text-zinc-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                      <span className="text-xs font-sans text-zinc-200 truncate">{task.title}</span>
                      <button
                        onClick={() => {
                          setEditingId(task.id);
                          setEditingText(task.title);
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-white opacity-0 group-item:opacity-100"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                    title="刪除預排項目"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}

            <form onSubmit={handleAddTomorrowSubmit} className="mt-4">
              <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/[0.03] border border-white/15 focus-within:border-white transition-colors">
                <input
                  type="text"
                  value={newTomorrowTitle}
                  onChange={(e) => setNewTomorrowTitle(e.target.value)}
                  placeholder="預排明日任務（至少 2 項）..."
                  className="flex-1 bg-transparent px-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none font-sans"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newTomorrowTitle.trim()}
                  className="px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all disabled:opacity-40 flex items-center gap-1 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
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
