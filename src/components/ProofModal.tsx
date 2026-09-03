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
      } catch (err) {
        setIsSubmitting(false);
        setErrorMsg('圖片上傳失敗，請重試或改用連結佐證。');
        return;
      }
    } else {
      if (!externalUrl.trim()) {
        setErrorMsg('請填寫有效的佐證連結網址！');
        return;
      }
      finalProofUrl = externalUrl.trim();
      setIsSubmitting(true);
    }

    try {
      await onSuccess(task.id, finalProofUrl);

      // 放煙火慶祝打卡成功
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ff0055', '#ffe600'],
      });

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg('任務更新失敗，請確認網路連線。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn p-4 select-none">
      <div className="w-full max-w-lg bg-cyber-950 border border-neon-cyan/50 cyber-clip-card p-6 shadow-cyber-cyan relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cyber-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 標頭 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 font-mono">PROOF OF COMPLETION // 打卡佐證</h3>
            <p className="text-xs text-slate-400 font-mono">
              執行操作者：<span className="text-neon-cyan font-bold">{username || 'CURRENT_USER'}</span>
            </p>
          </div>
        </div>

        {/* 任務標題框 */}
        <div className="p-3.5 rounded-xl bg-cyber-900 border border-cyber-700 mb-5">
          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">待打卡任務項目：</div>
          <div className="text-sm font-semibold text-slate-200 font-mono">{task.title}</div>
        </div>

        {/* 佐證分頁模式切換 */}
        <div className="flex items-center gap-2 mb-4 p-1 rounded-xl bg-cyber-900 border border-cyber-800">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-neon-cyan text-cyber-950 shadow-cyber-cyan/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>本地照片上傳 (Storage)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'link'
                ? 'bg-neon-cyan text-cyber-950 shadow-cyber-cyan/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>外部筆記／進度連結</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === 'upload' ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${
                previewUrl
                  ? 'border-neon-cyan/80 bg-cyber-900'
                  : 'border-cyber-700 hover:border-neon-cyan/60 bg-cyber-900/40 hover:bg-cyber-900'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div className="relative w-full h-full group">
                  <img
                    src={previewUrl}
                    alt="Proof Preview"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-mono text-white transition-opacity">
                    點擊更換佐證照片
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 rounded-xl bg-cyber-800 flex items-center justify-center text-slate-400 mb-2">
                    <Upload className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <p className="text-xs font-mono font-medium text-slate-300">
                    點擊選擇照片 或 拖曳檔案至此
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    自動寫入 Supabase task-proofs 儲存桶
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300">
                佐證網址 (Notion、GitHub PR、HackMD、Strava 紀錄)：
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-cyber-900 border border-cyber-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-neon-cyan font-mono"
              />
            </div>
          )}

          {errorMsg && (
            <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-neon-magenta">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-cyber-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-neon-cyan hover:bg-neon-cyan/90 text-cyber-950 shadow-cyber-cyan flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>加密上傳驗證中...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>完成打卡驗證</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
