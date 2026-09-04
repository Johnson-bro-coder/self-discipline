import React from 'react';
import { Profile } from '../types/database';
import { Fingerprint, ArrowRight, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  profiles: Profile[];
  onSelectUser: (userId: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  profiles,
  onSelectUser,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-fadeIn select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xl ios-glass-card p-8 relative overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.9)]"
      >
        {/* 背景環境微光 */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-white/[0.04] rounded-full blur-3xl pointer-events-none" />

        {/* 頂部標頭 */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <UserCheck className="w-4 h-4 text-white" />
            <span className="tracking-wider">IDENTITY VERIFICATION</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono text-white flex items-center gap-1.5">
            <Fingerprint className="w-3 h-3 text-white" />
            <span>AUTHENTICATION</span>
          </div>
        </div>

        {/* 標題 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
            選擇操作者身分
          </h2>
          <p className="text-xs text-zinc-400 mt-1.5 font-mono">
            請選擇你的成員身分載入個人終端與專屬任務序列
          </p>
        </div>

        {/* 成員身分卡片 (iOS 磨砂圓角玻璃) */}
        <div className="grid grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <motion.button
              key={profile.id}
              whileHover={{ scale: 1.03, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectUser(profile.id)}
              className="group flex flex-col items-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/30 hover:bg-white/[0.05] transition-all focus:outline-none relative overflow-hidden"
            >
              {/* 頭像 */}
              <div className="relative w-20 h-20 mb-3.5 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-white transition-all shadow-md">
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

              {/* 登入小膠囊按鈕 */}
              <div className="mt-4 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-white group-hover:bg-white group-hover:text-black transition-all flex items-center gap-1 shadow-sm">
                <span>進入終端</span>
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-8 text-center text-[11px] text-zinc-500 font-mono">
          身分將持久化保存在本機，可隨時於 [系統設定] 登出切換
        </div>
      </motion.div>
    </div>
  );
};
