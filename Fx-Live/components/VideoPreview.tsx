import { useState } from 'react';
import { Video } from '@/types/video';

interface VideoPreviewProps {
  video: Video;
  onClose: () => void;
  onGoLive?: (video: Video) => void;
}

export default function VideoPreview({ video, onClose, onGoLive }: VideoPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const videoUrl = `/api/serve-video/${encodeURIComponent(video.filename)}`;

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="glass-card max-w-4xl w-full overflow-hidden border border-white/10 shadow-glass-lg animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex justify-between items-center bg-surface/80">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center flex-shrink-0 text-[#00D4FF]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-[#E8ECF1] truncate">
                {video.original_name}
              </h3>
              <p className="text-[11px] text-[#7B8CA3]">High-fidelity Local Playback Preview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8B9BB4] hover:text-[#E8ECF1] hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Cinema Video Player Box */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90">
              <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin mb-2" />
              <div className="text-xs text-[#8B9BB4]">Buffering stream payload...</div>
            </div>
          )}
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
            onLoadedData={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
        
        {/* Footer Actions & Metadata */}
        <div className="px-5 py-3.5 border-t border-white/[0.06] bg-surface/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3 text-[#8B9BB4] font-mono text-[11px]">
            <span>Size: <strong className="text-[#E8ECF1]">{formatFileSize(video.file_size)}</strong></span>
            <span>·</span>
            <span>Created: <strong className="text-[#E8ECF1]">{new Date(video.created_at).toLocaleDateString()}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            {onGoLive && (
              <button
                onClick={() => onGoLive(video)}
                className="fx-btn fx-btn-live py-2 px-4 text-xs font-bold flex items-center space-x-1.5 shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Launch Live Stream with Asset</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="fx-btn fx-btn-secondary py-2 px-3.5 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}