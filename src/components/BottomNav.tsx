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
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'treasury',
    label: '公費金庫',
    subLabel: 'TREASURY',
    icon: Landmark,
  },
  {
    id: 'home',
    label: '個人終端',
    subLabel: 'TERMINAL',
    icon: Terminal,
  },
  {
    id: 'weekly',
    label: '排程矩陣',
    subLabel: 'MATRIX',
    icon: CalendarDays,
  },
  {
    id: 'settings',
    label: '系統設定',
    subLabel: 'CONFIG',
    icon: Sliders,
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unsettledViolationsCount,
}) => {
  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-lg h-16 rounded-full ios-glass-dock px-2 flex items-center justify-around z-40 select-none shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className="relative flex-1 h-12 rounded-full flex flex-col items-center justify-center transition-all group focus:outline-none"
          >
            {/* iOS 液態玻璃動態膠囊指示器 */}
            {isActive && (
              <motion.div
                layoutId="activeNavDockPill"
                className="absolute inset-0 rounded-full bg-white/10 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}

            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                <Icon
                  className={`w-4 h-4 transition-all duration-300 ${
                    isActive ? 'scale-110 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                />

                {/* 金庫未結算提醒小紅點/徽章 */}
                {item.id === 'treasury' && unsettledViolationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-white text-black shadow-md">
                    {unsettledViolationsCount}
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] font-medium tracking-tight mt-0.5 transition-colors ${
                  isActive ? 'text-white font-bold' : 'text-zinc-400'
                }`}
              >
                {item.label}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
};
