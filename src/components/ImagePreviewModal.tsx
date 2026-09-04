import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  isOpen,
  onClose,
  title,
}) => {
  if (!isOpen || !imageUrl) return null;

  const isHttpUrl = imageUrl.startsWith('http');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl animate-fadeIn p-6 select-none"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[85vh] ios-glass-card overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.9)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="text-sm font-semibold text-white truncate">
            {title ? `佐證圖片：${title}` : '打卡佐證預覽'}
          </div>
          <div className="flex items-center gap-2">
            {isHttpUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="在新分頁開啟"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40">
          <img
            src={imageUrl}
            alt="Proof Full View"
            className="max-w-full max-h-[70vh] object-contain rounded-2xl border border-white/15 shadow-lg"
          />
        </div>
      </div>
    </div>
  );
};
