import React, { useState } from 'react';
import { Profile, Task, DayOfWeek } from '../types/database';
import { Calendar, Plus, CheckCircle2, Circle, Trash2, Edit2, Check, X, ShieldAlert } from 'lucide-react';

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
    <div className="w-full max-w-5xl mx-auto flex flex-col h-full select-none animate-fadeIn pb-20">
      {/* 標頭 */}
      <div className="p-5 bg-cyber-900/90 border border-cyber-700 cyber-clip-card relative mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 font-mono tracking-wider">
                WEEKLY MATRIX // 排程矩陣
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                管理本週一至週日各成員的單次重大專案、考試檢定與關鍵交付項目
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400">
            本週總排程: <span className="text-neon-cyan font-bold">{weeklyTasks.length}</span> 項
          </div>
        </div>
      </div>

      {/* 星期切換按鈕組 (Mon - Sun) */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {DAYS.map((day) => {
          const count = weeklyTasks.filter((t) => t.day_of_week === day.key).length;
          const isActive = activeDay === day.key;

          return (
            <button
              key={day.key}
              onClick={() => setActiveDay(day.key)}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                isActive
                  ? 'bg-cyber-900 border-neon-cyan text-neon-cyan shadow-cyber-cyan/30'
                  : 'bg-cyber-950/60 border-cyber-800 text-slate-400 hover:border-cyber-700 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-mono tracking-wider font-bold">{day.label}</span>
              <span className="text-[10px] font-mono text-slate-500 mt-0.5">{day.key}</span>
              <span
                className={`mt-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  count > 0 ? 'bg-neon-cyan/20 text-neon-cyan font-bold' : 'text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 任務展示與新增面板 */}
      <div className="flex-1 bg-cyber-900/60 border border-cyber-800 cyber-clip-card p-6 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyber-800">
          <span className="text-sm font-bold font-mono text-slate-200">
            {DAYS.find((d) => d.key === activeDay)?.full} 排程清單
          </span>
          <span className="text-xs font-mono text-slate-500">點擊項目可直接標記完成</span>
        </div>

        {/* 任務清單 */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-600 font-mono text-xs">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-30" />
              - 本日尚無重大排程 -
            </div>
          ) : (
            filteredTasks.map((task) => {
              const assignedUser = profiles.find((p) => p.id === task.user_id);

              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    task.is_completed
                      ? 'bg-neon-cyan/5 border-neon-cyan/30 text-neon-cyan/70 line-through'
                      : 'bg-cyber-950/80 border-cyber-700 hover:border-neon-cyan'
                  }`}
                >
                  <button
                    onClick={() => onToggleWeeklyTask(task.id, task.is_completed)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                  >
                    {task.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-neon-cyan shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                    )}

                    {editingId === task.id ? (
                      <div
                        className="flex items-center gap-2 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs bg-cyber-900 border border-neon-cyan rounded text-slate-100 font-mono"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveTitle(task.id)}
                          className="p-1 rounded bg-neon-cyan text-cyber-950"
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
                      <span className="text-xs font-mono font-medium truncate text-slate-200">
                        {task.title}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* 指派人標籤 */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyber-800 border border-cyber-700 text-[10px] font-mono text-slate-300">
                      <img
                        src={assignedUser?.avatar_url || '/photos/IMG_0700.JPG'}
                        alt={assignedUser?.username}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span>{assignedUser?.username}</span>
                    </div>

                    {/* 修改按鈕 */}
                    <button
                      onClick={() => {
                        setEditingId(task.id);
                        setEditingText(task.title);
                      }}
                      className="p-1 text-slate-500 hover:text-neon-cyan transition-colors"
                      title="修改排程名稱"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* 刪除按鈕 */}
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 text-slate-500 hover:text-neon-magenta transition-colors"
                      title="刪除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部新增表單 */}
        <form
          onSubmit={handleAddSubmit}
          className="pt-3 border-t border-cyber-800 flex items-center gap-3"
        >
          {/* 選擇指派成員 */}
          <select
            value={assignedUserId}
            onChange={(e) => setAssignedUserId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-cyber-950 border border-cyber-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-neon-cyan"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.username}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={`新增 ${DAYS.find((d) => d.key === activeDay)?.label} 大型待辦...`}
            className="flex-1 px-3.5 py-2 rounded-xl bg-cyber-950 border border-cyber-700 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-neon-cyan"
          />

          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-4 py-2 rounded-xl bg-neon-cyan hover:bg-neon-cyan/90 text-cyber-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            <span>建立排程</span>
          </button>
        </form>
      </div>
    </div>
  );
};
