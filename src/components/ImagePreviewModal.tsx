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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fadeIn p-6"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[85vh] bg-dark-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-200 truncate">
            {title ? `打卡佐證：${title}` : '打卡佐證圖片預覽'}
          </div>
          <div className="flex items-center gap-3">
            {isHttpUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                title="開新視窗檢視"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-dark-950">
          <img
            src={imageUrl}
            alt="Proof Full View"
            className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-800 shadow"
          />
        </div>
      </div>
    </div>
  );
};
