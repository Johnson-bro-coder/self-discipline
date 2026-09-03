import React, { useState } from 'react';
import { Profile, GroupSettings } from '../types/database';
import {
  Sliders,
  User,
  Target,
  LogOut,
  Save,
  CheckCircle,
  Image as ImageIcon,
} from 'lucide-react';

interface SettingsViewProps {
  currentProfile: Profile;
  groupSettings: GroupSettings;
  onUpdateProfile: (username: string, avatarUrl: string) => Promise<void>;
  onUpdateGroupSettings: (name: string, amount: number) => Promise<void>;
  onLogout: () => void;
}

const AVAILABLE_AVATARS = [
  { label: '風格 1', path: '/photos/IMG_0700.JPG' },
  { label: '風格 2', path: '/photos/IMG_0774.JPG' },
  { label: '風格 3', path: '/photos/IMG_0980.JPG' },
  { label: '風格 4', path: '/photos/IMG_1439.JPG' },
  { label: '風格 5', path: '/photos/IMG_5280.JPG' },
  { label: '風格 6', path: '/photos/IMG_5964.JPG' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentProfile,
  groupSettings,
  onUpdateProfile,
  onUpdateGroupSettings,
  onLogout,
}) => {
  // 個人資料編輯狀態
  const [username, setUsername] = useState(currentProfile.username);
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatar_url);
  const [profileSaved, setProfileSaved] = useState(false);

  // 群組共同目標編輯狀態
  const [goalName, setGoalName] = useState(groupSettings.goal_name);
  const [goalAmount, setGoalAmount] = useState(groupSettings.goal_amount);
  const [goalSaved, setGoalSaved] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    await onUpdateProfile(username.trim(), avatarUrl);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || goalAmount <= 0) return;
    await onUpdateGroupSettings(goalName.trim(), Number(goalAmount));
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full select-none animate-fadeIn pb-24 space-y-6">
      {/* 標頭 */}
      <div className="p-5 bg-cyber-900/90 border border-cyber-700 cyber-clip-card relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon-magenta/20 border border-neon-magenta/40 flex items-center justify-center text-neon-magenta">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 font-mono tracking-wider">
                SYSTEM CONFIG // 系統設定矩陣
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                動態調校個人識別稱號、頭像形象、群組共同夢想目標與操作權限
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-neon-magenta/10 hover:bg-neon-magenta/20 border border-neon-magenta/40 text-neon-magenta font-mono text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>切換帳號 / 登出</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. 個人身分資料自訂 */}
        <div className="p-6 bg-cyber-900 border border-cyber-700 cyber-clip-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-neon-cyan font-mono text-xs font-bold uppercase tracking-wider mb-4 pb-2 border-b border-cyber-800">
              <User className="w-4 h-4" />
              <span>PROFILE SETTINGS // 個人資料修改</span>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5">
                  操作者名稱 (Username)：
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-950 border border-cyber-700 text-sm font-mono text-slate-100 focus:outline-none focus:border-neon-cyan"
                  placeholder="輸入你的新名稱..."
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5">
                  自備大頭貼選擇：
                </label>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {AVAILABLE_AVATARS.map((av) => (
                    <button
                      key={av.path}
                      type="button"
                      onClick={() => setAvatarUrl(av.path)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        avatarUrl === av.path
                          ? 'border-neon-cyan scale-105 shadow-cyber-cyan'
                          : 'border-cyber-700 hover:border-slate-500 opacity-70'
                      }`}
                    >
                      <img src={av.path} alt={av.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="或貼上自訂圖片 URL..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-cyber-950 border border-cyber-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-neon-cyan"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {profileSaved && (
                  <span className="text-xs font-mono text-neon-green flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>個人資料已成功更新！</span>
                  </span>
                )}
                <div className="ml-auto">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-neon-cyan hover:bg-neon-cyan/90 text-cyber-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>儲存個人設定</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* 2. 群組共同目標自訂 */}
        <div className="p-6 bg-cyber-900 border border-cyber-700 cyber-clip-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-neon-yellow font-mono text-xs font-bold uppercase tracking-wider mb-4 pb-2 border-b border-cyber-800">
              <Target className="w-4 h-4" />
              <span>GROUP OBJECTIVE // 共同目標設定</span>
            </div>

            <form onSubmit={handleGroupSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5">
                  公費目標名稱：
                </label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="例如：日本古民家買房、冰島極光探險..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-950 border border-cyber-700 text-sm font-mono text-slate-100 focus:outline-none focus:border-neon-yellow"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5">
                  公費目標達標金額 (NTD)：
                </label>
                <input
                  type="number"
                  step="1000"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-950 border border-cyber-700 text-sm font-mono text-slate-100 focus:outline-none focus:border-neon-yellow"
                />
              </div>

              <div className="pt-8 flex items-center justify-between">
                {goalSaved && (
                  <span className="text-xs font-mono text-neon-green flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>目標參數已同步更新！</span>
                  </span>
                )}
                <div className="ml-auto">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-neon-yellow hover:bg-neon-yellow/90 text-cyber-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>儲存目標設定</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
