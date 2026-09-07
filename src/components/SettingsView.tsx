import React, { useState, useRef } from 'react';
import { Profile } from '../types/database';
import {
  Sliders,
  User,
  LogOut,
  Save,
  CheckCircle,
  Camera,
  UploadCloud,
  AlertTriangle,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface SettingsViewProps {
  currentProfile: Profile;
  onUpdateProfile: (username: string, avatarUrl: string) => Promise<void>;
  onLogout: () => void;
  onResetAllData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentProfile,
  onUpdateProfile,
  onLogout,
  onResetAllData,
}) => {
  const [username, setUsername] = useState(currentProfile.username);
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatar_url);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 本機圖片選取與上傳處理 (Requirement 2)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      if (isSupabaseConfigured() && supabase) {
        // 上傳至 Supabase Storage 'task-proofs'
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `avatar_${currentProfile.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('task-proofs')
          .upload(fileName, file, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from('task-proofs').getPublicUrl(fileName);
          if (data?.publicUrl) {
            setAvatarUrl(data.publicUrl);
            await onUpdateProfile(username, data.publicUrl);
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2500);
            setIsUploading(false);
            return;
          }
        }
      }

      // 本機或離線 Base64 降級處理
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setAvatarUrl(base64);
        await onUpdateProfile(username, base64);
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2500);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setIsUploading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    await onUpdateProfile(username.trim(), avatarUrl);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleConfirmResetAll = async () => {
    setIsResetting(true);
    try {
      await onResetAllData();
      setIsResetConfirmOpen(false);
      setResetMessage('所有罰款與任務已全數成功初始化！');
      setTimeout(() => setResetMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col min-h-full select-none animate-fadeIn space-y-6">
      {/* 標頭 (iOS 液態玻璃頂部卡) */}
      <div className="p-6 ios-glass-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/15">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                系統設定 // CONFIGURATION
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                管理個人識別、本機大頭貼與登出切換
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>切換帳號</span>
          </button>
        </div>
      </div>

      {/* 個人檔案與本機大頭貼上傳卡片 */}
      <div className="p-6 ios-glass-card space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
          <User className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            個人檔案設定 // PROFILE
          </h3>
        </div>

        {/* 1. 本機大頭貼上傳區 (Requirement 2) */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.15)] relative">
              <img
                src={avatarUrl || '/photos/IMG_0700.JPG'}
                alt={username}
                className="w-full h-full object-cover"
              />
              {isUploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-zinc-200 transition-transform active:scale-95"
              title="從本機上傳新頭像"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <h4 className="text-sm font-bold text-white">自訂本機個人頭像</h4>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              點擊相機或下方按鈕，直接從手機相簿或電腦本機上傳你的專屬照片
            </p>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-xs flex items-center gap-1.5 hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-50 mx-auto sm:mx-0"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isUploading ? '上傳中...' : '從本機選擇照片'}</span>
            </button>
          </div>
        </div>

        {/* 2. 操作者名稱修改表單 */}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-zinc-300 block mb-1.5">
              操作者名稱 (Username)：
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/20 text-sm font-sans text-white focus:outline-none focus:border-white transition-colors"
              placeholder="輸入新暱稱..."
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            {profileSaved && (
              <span className="text-xs font-mono text-white flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>個人資料已同步儲存！</span>
              </span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs flex items-center gap-1.5 hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>儲存設定</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. 系統資料管理與危險重置區 (Danger Zone) */}
      <div className="p-6 ios-glass-card border-red-500/20 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider font-mono">
              資料管理 // DANGER ZONE
            </h3>
          </div>
          {resetMessage && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{resetMessage}</span>
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">初始化所有罰款與任務</h4>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              一鍵清空所有今日任務、明日預排、每週排程、常駐必做與歷史月結帳單，並將全員罰款歸零（保留頭像與暱稱）。
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-4 py-2 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 hover:border-red-500/50 text-red-300 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>一鍵初始化系統</span>
          </button>
        </div>
      </div>

      {/* 初始化確認彈窗 */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-950/95 border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold">確認初始化系統資料？</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-2 text-xs font-mono text-zinc-300">
              <p className="font-bold text-red-300">⚠️ 此動作將執行以下初始化：</p>
              <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
                <li>清空所有今日任務、明日預排與每週排程</li>
                <li>清空所有常駐每日必做序列模板</li>
                <li>清空歷史月結帳單與待繳違規</li>
                <li>所有成員累計已繳罰金全數歸零 ($0 NTD)</li>
                <li>公費金庫總額與預估罰款全數歸零</li>
              </ul>
              <p className="text-[11px] text-zinc-500 pt-1">
                * 個人頭像與自訂暱稱將會妥善保留。
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-zinc-300 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmResetAll}
                disabled={isResetting}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all disabled:opacity-50"
              >
                {isResetting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isResetting ? '初始化中...' : '確認全部初始化'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
