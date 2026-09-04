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
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface SettingsViewProps {
  currentProfile: Profile;
  onUpdateProfile: (username: string, avatarUrl: string) => Promise<void>;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentProfile,
  onUpdateProfile,
  onLogout,
}) => {
  const [username, setUsername] = useState(currentProfile.username);
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatar_url);
  const [profileSaved, setProfileSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-full select-none animate-fadeIn pb-24 space-y-6">
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
    </div>
  );
};
