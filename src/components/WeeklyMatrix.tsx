import React, { useState } from 'react';
import { Profile, Task, DayOfWeek } from '../types/database';
import { Calendar, Plus, CheckCircle2, Circle, Trash2, Edit2, Check, X } from 'lucide-react';

interface WeeklyMatrixProps {
  tasks: Task[];
  profiles: Profile[];
  currentProfile: Profile;
  onToggleWeeklyTask: (taskId: string, currentCompleted: boolean) => Promise<void>;
  onAddWeeklyTask: (userId: string, title: string, day: DayOfWeek) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onUpdateTaskTitle: (taskId: string, newTitle: string) => Promise<void>;
}

const DAYS: { key: DayOfWeek; label: string; full: string }[] = [
  { key: 'Mon', label: '週一', full: 'MONDAY' },
  { key: 'Tue', label: '週二', full: 'TUESDAY' },
  { key: 'Wed', label: '週三', full: 'WEDNESDAY' },
  { key: 'Thu', label: '週四', full: 'THURSDAY' },
  { key: 'Fri', label: '週五', full: 'FRIDAY' },
  { key: 'Sat', label: '週六', full: 'SATURDAY' },
  { key: 'Sun', label: '週日', full: 'SUNDAY' },
];

export const WeeklyMatrix: React.FC<WeeklyMatrixProps> = ({
  tasks,
  profiles,
  currentProfile,
  onToggleWeeklyTask,
  onAddWeeklyTask,
  onDeleteTask,
  onUpdateTaskTitle,
}) => {
  const [activeDay, setActiveDay] = useState<DayOfWeek>('Mon');
  const [newTitle, setNewTitle] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<string>(currentProfile.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const weeklyTasks = tasks.filter((t) => t.category === 'weekly');
  const filteredTasks = weeklyTasks.filter((t) => t.day_of_week === activeDay);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await onAddWeeklyTask(assignedUserId, newTitle.trim(), activeDay);
    setNewTitle('');
  };

  const handleSaveTitle = async (taskId: string) => {
    if (!editingText.trim()) return;
    await onUpdateTaskTitle(taskId, editingText.trim());
    setEditingId(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-full select-none animate-fadeIn pb-24 space-y-6">
      {/* 標頭 (iOS 液態玻璃頂部卡) */}
      <div className="p-6 ios-glass-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                排程矩陣 // WEEKLY MATRIX
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                規劃每週關鍵交付項目、重大考試與里程碑目標
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-zinc-400">
            本週總排程: <span className="text-white font-bold">{weeklyTasks.length}</span> 項
          </div>
        </div>
      </div>

      {/* 星期切換按鈕組 (Mon - Sun, iOS 玻璃膠囊列) */}
      <div className="grid grid-cols-7 gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl">
        {DAYS.map((day) => {
          const count = weeklyTasks.filter((t) => t.day_of_week === day.key).length;
          const isActive = activeDay === day.key;

          return (
            <button
              key={day.key}
              onClick={() => setActiveDay(day.key)}
              className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                isActive
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span className="text-xs font-bold">{day.label}</span>
              <span className="text-[10px] font-mono opacity-60 mt-0.5">{day.key}</span>
              <span
                className={`mt-1.5 px-2 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-black/15 text-black font-bold' : 'bg-white/10 text-zinc-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 本日週排程清單 */}
      <div className="p-6 ios-glass-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            {DAYS.find((d) => d.key === activeDay)?.full} // {DAYS.find((d) => d.key === activeDay)?.label} 排程項目
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            共 {filteredTasks.length} 項
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 font-mono text-xs">
            - {DAYS.find((d) => d.key === activeDay)?.label} 暫無週排程任務 -
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const assignedUser = profiles.find((p) => p.id === task.user_id);
              const isOwner = task.user_id === currentProfile.id;

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    task.is_completed
                      ? 'bg-white/[0.04] border-white/20'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleWeeklyTask(task.id, task.is_completed)}
                      className="shrink-0 focus:outline-none"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-500 hover:text-white transition-colors" />
                      )}
                    </button>

                    {/* 指派成員頭像 */}
                    {assignedUser && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.06] border border-white/10 shrink-0">
                        <img
                          src={assignedUser.avatar_url}
                          alt={assignedUser.username}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="text-[10px] font-mono text-zinc-300">
                          {assignedUser.username}
                        </span>
                      </div>
                    )}

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
                          onClick={() => handleSaveTitle(task.id)}
                          className="p-1 rounded-lg bg-white text-black"
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
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-sm truncate ${
                            task.is_completed ? 'line-through text-zinc-500' : 'text-zinc-200'
                          }`}
                        >
                          {task.title}
                        </span>
                        {isOwner && (
                          <button
                            onClick={() => {
                              setEditingId(task.id);
                              setEditingText(task.title);
                            }}
                            className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 新增週排程輸入區 */}
        <form onSubmit={handleAddSubmit} className="mt-4 pt-4 border-t border-white/[0.08]">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* 選擇指派成員 */}
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="px-3 py-2 rounded-full bg-black/60 border border-white/15 text-xs font-mono text-zinc-200 focus:outline-none focus:border-white transition-colors w-full sm:w-auto"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id} className="bg-black text-white">
                  指派：{p.username}
                </option>
              ))}
            </select>

            <div className="flex-1 flex items-center gap-2 p-1.5 rounded-full bg-white/[0.03] border border-white/15 focus-within:border-white transition-colors w-full">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={`新增 ${DAYS.find((d) => d.key === activeDay)?.label} 週排程目標...`}
                className="flex-1 bg-transparent px-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none font-sans"
              />
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                <Plus className="w-4 h-4" />
                <span>加入排程</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
