import React, { useState, useRef } from 'react';
import { Task } from '../types/database';
import { Camera, Link as LinkIcon, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadProofToStorage } from '../lib/supabase';
import confetti from 'canvas-confetti';

interface ProofModalProps {
  task: Task | null;
  username?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (taskId: string, proofUrl: string) => Promise<void>;
}

export const ProofModal: React.FC<ProofModalProps> = ({
  task,
  username,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !task) return null;

  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg('');
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setErrorMsg('');
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let finalProofUrl = '';

    if (activeTab === 'upload') {
      if (!selectedFile) {
        setErrorMsg('請先選擇或拖曳佐證照片檔案！');
        return;
      }
      setIsSubmitting(true);
      try {
        finalProofUrl = await uploadProofToStorage(selectedFile);
      } catch (err: any) {
        setErrorMsg(err.message || '上傳失敗，請改用佐證網址或重試');
        setIsSubmitting(false);
        return;
      }
    } else {
      if (!externalUrl.trim()) {
        setErrorMsg('請輸入佐證網址！');
        return;
      }
      finalProofUrl = externalUrl.trim();
    }

    try {
      await onSuccess(task.id, finalProofUrl);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#d4d4d8', '#a1a1aa'],
      });
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setErrorMsg('打卡狀態更新失敗，請檢查網路連線');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-fadeIn select-none">
      <div className="w-full max-w-lg ios-glass-card p-6 shadow-[0_30px_80px_rgba(0,0,0,0.9)] relative overflow-hidden">
        {/* 標題欄 */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">任務打卡驗證</h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                {username ? `操作者: ${username}` : '上傳照片證明或外部佐證'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 任務名稱預覽卡 */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] mb-5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase">目標任務</div>
          <div className="text-sm font-semibold text-white mt-0.5">{task.title}</div>
        </div>

        {/* 驗證模式分頁 (上傳照片 vs 連結) */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.25)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>照片上傳</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'link'
                ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.25)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>佐證網址</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === 'upload' ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-white/40 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03] flex flex-col items-center justify-center min-h-[170px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-white/20">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-xs font-mono text-white bg-black/60 px-3 py-1 rounded-full">
                      點擊更換照片
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2.5 border border-white/15">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-medium text-zinc-200">
                    點擊選擇照片 或 拖曳檔案至此
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                    自動寫入 Supabase task-proofs 儲存桶
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400">
                佐證網址 (Notion、GitHub PR、HackMD、Strava 紀錄)：
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/20 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
              />
            </div>
          )}

          {errorMsg && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-white bg-white/10 p-2 rounded-xl border border-white/20">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>上傳驗證中...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>完成打卡</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
