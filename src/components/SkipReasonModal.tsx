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
  '家庭緊急突發事件處理',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl animate-fadeIn p-4 select-none">
      <div className="w-full max-w-md ios-glass-card p-6 shadow-[0_30px_80px_rgba(0,0,0,0.9)] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 標頭 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              申請不可抗力豁免
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
              強制填寫合理原由，豁免成功則免扣罰金
            </p>
          </div>
        </div>

        {/* 任務摘要 */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] mb-4">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">目標項目</div>
          <div className="text-sm font-semibold text-white mt-0.5">{task.title}</div>
        </div>

        {/* 常用快速原因推薦 */}
        <div className="mb-4">
          <span className="text-[11px] font-mono text-zinc-400 block mb-2">快速帶入情境：</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className="px-3 py-1 rounded-full text-[11px] font-mono bg-white/[0.04] hover:bg-white/10 text-zinc-300 border border-white/[0.08] hover:border-white/20 transition-all text-left"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-zinc-400 block mb-1.5">
              請陳述具體事由：
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrorMsg('');
              }}
              placeholder="例如：因急性腸胃炎就醫診斷需靜養一天..."
              className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/20 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white font-sans resize-none"
            />
          </div>

          {errorMsg && (
            <div className="text-xs font-mono text-white bg-white/10 p-2 rounded-xl border border-white/20">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '審查提交中...' : '提交豁免申請'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
