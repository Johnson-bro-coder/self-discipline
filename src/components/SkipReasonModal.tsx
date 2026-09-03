import React, { useState } from 'react';
import { Task } from '../types/database';
import { X, AlertTriangle, Check } from 'lucide-react';

interface SkipReasonModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskId: string, reason: string) => Promise<void>;
}

const PRESET_REASONS = [
  '暴雨特報／極端天候，取消戶外場地',
  '緊急公司加班／專案即刻搶修',
  '突發高燒身體不適／需強制靜養',
  '家庭緊急事件臨時處理',
];

export const SkipReasonModal: React.FC<SkipReasonModalProps> = ({
  task,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !task) return null;

  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('請詳細填寫不可抗力理由，嚴禁無故放棄！');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(task.id, reason.trim());
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg('豁免申請提交失敗，請重試。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4 select-none">
      <div className="w-full max-w-md bg-cyber-950 border border-neon-yellow/50 cyber-clip-card p-6 shadow-cyber-yellow relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cyber-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 標頭 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-neon-yellow/20 border border-neon-yellow/40 flex items-center justify-center text-neon-yellow">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 font-mono">FORCE MAJEURE // 申請豁免</h3>
            <p className="text-xs text-neon-yellow font-mono">
              月底結算時不計入違規罰款 (免罰 $100)
            </p>
          </div>
        </div>

        {/* 申請任務項目 */}
        <div className="p-3.5 rounded-xl bg-cyber-900 border border-cyber-700 mb-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">申請豁免項目：</div>
          <div className="text-sm font-semibold text-slate-200 font-mono">{task.title}</div>
        </div>

        {/* 快捷標籤 */}
        <div className="mb-3">
          <label className="text-[10px] font-mono text-slate-400 mb-1.5 block">
            常用不可抗力快捷標籤：
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setReason(r);
                  setErrorMsg('');
                }}
                className="text-[10px] px-2 py-1 rounded bg-cyber-900 border border-cyber-700 hover:border-neon-yellow text-slate-300 hover:text-neon-yellow transition-colors font-mono text-left"
              >
                + {r}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300">
              請輸入詳細豁免理由：<span className="text-neon-magenta">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrorMsg('');
              }}
              placeholder="請務必如實填寫..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-900 border border-cyber-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-neon-yellow resize-none font-mono"
            />
          </div>

          {errorMsg && (
            <p className="text-xs font-mono text-neon-magenta mt-1.5">{errorMsg}</p>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-cyber-800 transition-colors"
            >
              返回取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-neon-yellow hover:bg-neon-yellow/90 text-cyber-950 shadow-cyber-yellow flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>核准豁免申請</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
