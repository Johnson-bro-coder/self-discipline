import React from 'react';
import { Profile, GroupSettings, MonthlyBill, Task } from '../types/database';
import {
  Landmark,
  Crown,
  AlertTriangle,
  Receipt,
  Plane,
  RefreshCw,
} from 'lucide-react';

interface TreasuryViewProps {
  profiles: Profile[];
  groupSettings: GroupSettings;
  monthlyBills: MonthlyBill[];
  tasks: Task[];
  onRunMonthlySettlement: () => Promise<void>;
  isAuditing: boolean;
}

export const TreasuryView: React.FC<TreasuryViewProps> = ({
  profiles,
  groupSettings,
  monthlyBills,
  tasks,
  onRunMonthlySettlement,
  isAuditing,
}) => {
  // 公費總池 = 所有使用者已月結之 total_paid_fine 總和
  const totalPool = profiles.reduce((sum, p) => sum + (p.total_paid_fine || 0), 0);

  // 夢想進度百分比
  const progressPercent = Math.min(
    100,
    Math.round((totalPool / (groupSettings.goal_amount || 1)) * 100)
  );

  // 歷史罰金排行 (由高至低)
  const sortedProfiles = [...profiles].sort((a, b) => b.total_paid_fine - a.total_paid_fine);

  // 計算本月即時未結算違規 (pending 且未完成、未豁免)
  const currentMonthUnsettledStats = profiles.map((p) => {
    const unsettledTasks = tasks.filter(
      (t) => t.user_id === p.id && t.status === 'pending' && !t.is_completed && !t.is_skipped
    );
    const count = unsettledTasks.length;
    const estimatedFine = count * 100;
    return {
      profile: p,
      unsettledCount: count,
      estimatedFine,
    };
  });

  const totalEstimatedUnsettledFine = currentMonthUnsettledStats.reduce(
    (sum, item) => sum + item.estimatedFine,
    0
  );

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-full select-none animate-fadeIn pb-20 space-y-6">
      {/* 1. 公費總池與共同目標面板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 公費總池卡 */}
        <div className="p-6 bg-cyber-900 border border-neon-yellow/40 cyber-clip-card shadow-cyber-yellow/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-neon-yellow tracking-widest uppercase">
              TREASURY POOL // 公費金庫總額
            </span>
            <Landmark className="w-6 h-6 text-neon-yellow" />
          </div>

          <div className="my-4">
            <div className="text-4xl font-black font-mono text-neon-yellow tracking-tight">
              ${totalPool.toLocaleString()}
              <span className="text-sm font-normal text-slate-400 ml-2">NTD</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              由 Johnson、nigga、shorty 每月結算罰款自動累積
            </p>
          </div>

          <div className="pt-3 border-t border-cyber-800 text-[10px] font-mono text-slate-500">
            結算週期：每月 1 號 00:00 自動轉正
          </div>
        </div>

        {/* 群組目標卡 */}
        <div className="md:col-span-2 p-6 bg-cyber-900 border border-cyber-700 cyber-clip-card flex flex-col justify-between relative overflow-hidden">
          {/* 背景視覺照片 */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none overflow-hidden">
            <img
              src={groupSettings.cover_photo}
              alt="Goal"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cyber-900 to-transparent" />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-neon-cyan tracking-wider flex items-center gap-1.5">
                <Plane className="w-4 h-4" />
                <span>SHARED OBJECTIVE // 共同夢想標竿</span>
              </span>
              <span className="text-slate-400">
                目標金額：${groupSettings.goal_amount.toLocaleString()} NTD
              </span>
            </div>

            <h3 className="text-2xl font-black text-slate-100 font-mono tracking-tight mb-2">
              {groupSettings.goal_name}
            </h3>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">當前公費儲備達成率</span>
              <span className="text-neon-cyan font-bold">{progressPercent}%</span>
            </div>

            <div className="w-full h-3 rounded-full bg-cyber-950 border border-cyber-800 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-neon-cyan via-neon-green to-neon-yellow transition-all duration-700 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 本月未結算警示 (警惕大家下月要繳多少！) */}
      <div className="p-5 bg-neon-magenta/5 border border-neon-magenta/40 cyber-clip-card shadow-cyber-magenta/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-neon-magenta font-mono text-xs font-bold">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span>UNSETTLED VIOLATIONS // 本月未結算違規統計 (下月 1 號將扣款)</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            預估待繳總額: <span className="text-neon-magenta font-bold">${totalEstimatedUnsettledFine}</span> NTD
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {currentMonthUnsettledStats.map(({ profile, unsettledCount, estimatedFine }) => (
            <div
              key={profile.id}
              className="p-3.5 rounded-xl bg-cyber-950/80 border border-cyber-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-8 h-8 rounded-lg object-cover border border-cyber-700"
                />
                <div>
                  <div className="text-xs font-bold text-slate-200">{profile.username}</div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {unsettledCount} 項違規待結
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-black font-mono text-neon-magenta">
                  +${estimatedFine}
                </div>
                <div className="text-[9px] font-mono text-slate-500">預估帳單</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 三人歷史罰金排行榜 */}
      <div className="p-6 bg-cyber-900 border border-cyber-700 cyber-clip-card">
        <h4 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider mb-4">
          LEADERBOARD // 歷史累積罰金排行
        </h4>

        <div className="grid grid-cols-3 gap-4">
          {sortedProfiles.map((profile, index) => {
            const isTop = index === 0 && profile.total_paid_fine > 0;

            return (
              <div
                key={profile.id}
                className={`p-4 rounded-xl border flex items-center gap-3 relative overflow-hidden ${
                  isTop
                    ? 'bg-neon-magenta/10 border-neon-magenta shadow-cyber-magenta/30'
                    : 'bg-cyber-950/60 border-cyber-800'
                }`}
              >
                <div className="relative">
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-12 h-12 rounded-xl object-cover border border-cyber-700"
                  />
                  {isTop && (
                    <Crown className="w-5 h-5 text-neon-yellow fill-neon-yellow absolute -top-2 -right-1" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100 truncate">
                      {profile.username}
                    </span>
                    {isTop && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neon-magenta text-white font-bold">
                        罰金王
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-slate-400 mt-1">
                    總結算罰金: <span className="text-neon-yellow font-bold">${profile.total_paid_fine}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 每月結算帳單紀錄 (Monthly Bills) 與手動模擬排程 */}
      <div className="p-6 bg-cyber-900 border border-cyber-700 cyber-clip-card">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyber-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-neon-cyan" />
            <h4 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider">
              MONTHLY BILLING ARCHIVE // 歷史月結帳單
            </h4>
          </div>

          {/* 手動模擬月結算觸發按鈕 */}
          <button
            onClick={onRunMonthlySettlement}
            disabled={isAuditing}
            className="px-3.5 py-1.5 rounded-lg bg-cyber-800 hover:bg-cyber-700 border border-cyber-600 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="手動模擬觸發每月 1 號 00:00 月結排程"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-neon-cyan' : ''}`} />
            <span>模擬 1 號月結算</span>
          </button>
        </div>

        {monthlyBills.length === 0 ? (
          <div className="py-8 text-center text-slate-600 font-mono text-xs">
            - 暫無月結帳單記錄，系統將於次月 1 號自動產出 -
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {monthlyBills.map((bill) => {
              const billedUser = profiles.find((p) => p.id === bill.user_id);

              return (
                <div
                  key={bill.id}
                  className="p-3 rounded-lg bg-cyber-950/80 border border-cyber-800 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">月份: {bill.billing_month.slice(0, 7)}</span>
                    <span className="text-slate-200 font-bold">{billedUser?.username}</span>
                    <span className="text-slate-500">
                      (違規項目: {bill.failed_tasks_count} 項)
                    </span>
                  </div>

                  <div className="text-neon-magenta font-bold">
                    +${bill.fine_amount} NTD
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
