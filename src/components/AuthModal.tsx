import React, { useEffect } from 'react';
import { Profile } from '../types/database';
import { Fingerprint, ArrowRight, UserCheck, X, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  profiles: Profile[];
  currentProfile?: Profile | null;
  onSelectUser: (userId: string) => void;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  profiles,
  currentProfile,
  onSelectUser,
  onClose,
}) => {
  // 支援鍵盤 Escape 關閉 (若已登入)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentProfile && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentProfile, onClose]);

  if (!isOpen) return null;

  const isSwitchMode = Boolean(currentProfile);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && isSwitchMode && onClose) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-fadeIn select-none"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl ios-glass-card p-8 relative overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.9)]"
      >
        {/* 背景環境微光 */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-white/[0.04] rounded-full blur-3xl pointer-events-none" />

        {/* 頂部標頭 */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <UserCheck className="w-4 h-4 text-white" />
            <span className="tracking-wider">
              {isSwitchMode ? 'SWITCH OPERATOR ACCOUNT' : 'IDENTITY VERIFICATION'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono text-white flex items-center gap-1.5">
              <Fingerprint className="w-3 h-3 text-white" />
              <span>{isSwitchMode ? 'FAST SWITCH' : 'AUTHENTICATION'}</span>
            </div>

            {/* 若已登入，允許按 X 取消切換 */}
            {isSwitchMode && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                title="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 標題 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
            {isSwitchMode ? '切換操作者身分' : '選擇操作者身分'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1.5 font-mono">
            {isSwitchMode
              ? `目前登入為 [${currentProfile?.username}]，點擊即可切換至其他成員`
              : '請選擇你的成員身分載入個人終端與專屬任務序列'}
          </p>
        </div>

        {/* 成員身分卡片 (iOS 磨砂圓角玻璃) */}
        <div className="grid grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const isCurrent = currentProfile?.id === profile.id;

            return (
              <motion.button
                key={profile.id}
                whileHover={{ scale: 1.03, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectUser(profile.id)}
                className={`group flex flex-col items-center p-5 rounded-2xl border transition-all focus:outline-none relative overflow-hidden ${
                  isCurrent
                    ? 'bg-white/[0.08] border-white/40 shadow-[0_0_25px_rgba(255,255,255,0.12)]'
                    : 'bg-white/[0.02] border-white/[0.08] hover:border-white/30 hover:bg-white/[0.05]'
                }`}
              >
                {/* 當前使用中膠囊標籤 */}
                {isCurrent && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-bold">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>當前</span>
                  </div>
                )}

                {/* 頭像 */}
                <div
                  className={`relative w-20 h-20 mb-3.5 rounded-full overflow-hidden border-2 transition-all shadow-md ${
                    isCurrent
                      ? 'border-white ring-2 ring-white/20'
                      : 'border-white/20 group-hover:border-white'
                  }`}
                >
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* 名稱 */}
                <span className="text-base font-bold text-white tracking-tight group-hover:text-white transition-colors">
                  {profile.username}
                </span>

                {/* 歷史罰金 */}
                <div className="mt-1 text-[11px] font-mono text-zinc-400">
                  罰金: <span className="text-white font-semibold">${profile.total_paid_fine}</span>
                </div>

                {/* 登入 / 切換小膠囊按鈕 */}
                <div
                  className={`mt-4 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1 shadow-sm ${
                    isCurrent
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-white/10 border-white/15 text-white group-hover:bg-white group-hover:text-black'
                  }`}
                >
                  <span>{isCurrent ? '目前在此身分' : isSwitchMode ? '切換至此身分' : '進入終端'}</span>
                  {!isCurrent && (
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 text-center text-[11px] text-zinc-500 font-mono">
          身分將持久化保存在本機，可隨時點擊右上角頭像或於 [系統設定] 切換
        </div>
      </motion.div>
    </div>
  );
};
