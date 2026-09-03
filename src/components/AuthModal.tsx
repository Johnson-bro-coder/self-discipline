import React from 'react';
import { Profile } from '../types/database';
import { ShieldAlert, Fingerprint, Terminal, ArrowRight } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 crt-overlay backdrop-blur-md p-4 animate-fadeIn select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-cyber-950 border border-cyber-700/80 cyber-clip-card p-8 shadow-cyber-cyan relative overflow-hidden"
      >
        {/* 背景裝飾格線與光暈 */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-neon-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-neon-magenta/10 rounded-full blur-3xl pointer-events-none" />

        {/* 終端標頭 */}
        <div className="flex items-center justify-between border-b border-cyber-700 pb-4 mb-6">
          <div className="flex items-center gap-2 text-neon-cyan font-mono text-xs">
            <Terminal className="w-4 h-4" />
            <span className="tracking-widest">CYBER_AUTH_V2 // PROTOCOL_LOGIN</span>
          </div>
          <div className="px-2 py-0.5 rounded bg-neon-magenta/20 border border-neon-magenta/40 text-[10px] font-mono text-neon-magenta flex items-center gap-1 animate-pulse">
            <ShieldAlert className="w-3 h-3" />
            <span>IDENTIFICATION REQUIRED</span>
          </div>
        </div>

        {/* 標題 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black tracking-wider text-slate-100 uppercase font-mono">
            ACCESS TERMINAL
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-2">
            請選擇你的操作者身分載入個人終端與專屬任務序列
          </p>
        </div>

        {/* 三位成員登入按鈕卡片 */}
        <div className="grid grid-cols-3 gap-5">
          {profiles.map((profile) => (
            <motion.button
              key={profile.id}
              whileHover={{ scale: 1.04, translateY: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectUser(profile.id)}
              className="group flex flex-col items-center p-5 bg-cyber-900/90 border border-cyber-700 hover:border-neon-cyan cyber-clip-sm transition-all focus:outline-none relative overflow-hidden"
            >
              {/* 掃描線光暈 */}
              <div className="absolute inset-0 bg-gradient-to-b from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* 頭像 */}
              <div className="relative w-20 h-20 mb-4 rounded-xl overflow-hidden border-2 border-cyber-700 group-hover:border-neon-cyan transition-colors shadow-sm">
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* 使用者名稱 */}
              <span className="text-base font-extrabold text-slate-200 group-hover:text-neon-cyan font-mono tracking-tight transition-colors">
                {profile.username}
              </span>

              {/* 罰金紀錄 */}
              <div className="mt-1.5 text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <span>歷史累計:</span>
                <span className="text-neon-yellow font-bold">${profile.total_paid_fine}</span>
              </div>

              <div className="mt-4 px-3 py-1.5 rounded bg-cyber-800 border border-cyber-700 text-[11px] font-mono text-slate-300 group-hover:bg-neon-cyan group-hover:text-cyber-950 group-hover:border-neon-cyan transition-all flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5" />
                <span>AUTHENTICATE</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-8 text-center text-[10px] text-slate-500 font-mono">
          * 身分將自動持久化於本機儲存空間，可於 [Settings] 系統設定中切換。
        </div>
      </motion.div>
    </div>
  );
};
