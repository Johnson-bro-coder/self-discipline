import React from 'react';
import { NavTab } from '../types/database';
import { Terminal, CalendarDays, Landmark, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unsettledViolationsCount: number;
}

interface NavItem {
  id: NavTab;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  color: 'cyan' | 'magenta' | 'yellow' | 'green';
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'treasury',
    label: '公費金庫',
    subLabel: 'TREASURY',
    icon: Landmark,
    color: 'yellow',
  },
  {
    id: 'home',
    label: '個人終端',
    subLabel: 'TERMINAL',
    icon: Terminal,
    color: 'cyan',
  },
  {
    id: 'weekly',
    label: '排程矩陣',
    subLabel: 'MATRIX',
    icon: CalendarDays,
    color: 'cyan',
  },
  {
    id: 'settings',
    label: '系統設定',
    subLabel: 'CONFIG',
    icon: Sliders,
    color: 'magenta',
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unsettledViolationsCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-cyber-950/95 border-t border-cyber-700/80 backdrop-blur-xl flex items-center justify-around px-4 select-none">
      {/* 頂部賽博發光線 */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-60" />

      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`relative flex-1 max-w-[180px] h-full flex flex-col items-center justify-center gap-1 transition-all group focus:outline-none ${
              isActive ? 'text-neon-cyan' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {/* 動態啟用背景指示標 */}
            {isActive && (
              <motion.div
                layoutId="activeNavIndicator"
                className="absolute inset-0 bg-cyber-850/80 border-t-2 border-neon-cyan cyber-clip-sm"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}

            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isActive ? 'scale-110 text-neon-cyan drop-shadow-[0_0_8px_#00f0ff]' : 'text-slate-400 group-hover:scale-105'
                  }`}
                />

                {/* 金庫未結算提醒徽章 */}
                {item.id === 'treasury' && unsettledViolationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[9px] font-mono font-bold bg-neon-magenta text-white animate-pulse">
                    {unsettledViolationsCount}
                  </span>
                )}
              </div>

              <span className={`text-[11px] font-bold tracking-tight mt-0.5 ${isActive ? 'text-slate-100 font-extrabold' : ''}`}>
                {item.label}
              </span>
              <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase">
                {item.subLabel}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
};
