import { useState, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { Video } from '@/types/video';
import VideoPreview from './VideoPreview';
import QuickStreamModal from './QuickStreamModal';

interface VideoLibraryProps {
  videos: Video[];
  onRefresh: () => void;
}

const SOURCE_BADGES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  local: { label: 'LOCAL DISK', color: '#00D4FF', bg: 'rgba(0, 212, 255, 0.08)', border: 'rgba(0, 212, 255, 0.25)' },
  google_drive: { label: 'GOOGLE DRIVE', color: '#4285F4', bg: 'rgba(66, 133, 244, 0.08)', border: 'rgba(66, 133, 244, 0.25)' },
  google_drive_link: { label: 'DRIVE LINK', color: '#4285F4', bg: 'rgba(66, 133, 244, 0.08)', border: 'rgba(66, 133, 244, 0.25)' },
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#F5A623' },
  importing: { label: 'Importing', color: '#00D4FF' },
  ready: { label: 'Ready for Stream', color: '#00E68A' },
  processing: { label: 'Processing', color: '#7B61FF' },
  failed: { label: 'Failed', color: '#FF4757' },
};

export default function VideoLibrary({ videos, onRefresh }: VideoLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<'all' | 'local' | 'drive'>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [streamTargetVideo, setStreamTargetVideo] = useState<Video | null>(null);

  // Total Storage Size
  const totalSize = useMemo(() => videos.reduce((acc, v) => acc + (v.file_size || 0), 0), [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesQuery = video.original_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesQuery) return false;
      if (selectedSource === 'all') return true;
      if (selectedSource === 'local') return !video.source_type || video.source_type === 'local';
      if (selectedSource === 'drive') return video.source_type === 'google_drive' || video.source_type === 'google_drive_link';
      return true;
    });
  }, [videos, searchQuery, selectedSource]);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const handleDelete = async (video: Video) => {
    if (!confirm(`Are you sure you want to permanently delete "${video.original_name}"?`)) {
      return;
    }

    setDeletingId(video.id);

    try {
      await axios.delete(`/api/videos/${video.id}/delete`);
      toast.success('Video asset deleted');
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete video asset');
    } finally {
      setDeletingId(null);
    }
  };

  const canPreview = (video: Video) => {
    return Boolean(video.filename || video.file_path);
  };

  if (videos.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 bg-surface border border-white/[0.06]">
          <svg className="w-7 h-7 text-[#52637A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-[#E8ECF1] mb-1">No video assets in library</h3>
        <p className="text-xs text-[#7B8CA3] max-w-sm mx-auto">
          Upload a local video or download directly from Google Drive using the tabs above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter and Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl bg-surface/40 border border-white/[0.04]">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos by name..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-surface border border-white/[0.08] text-[#E8ECF1] placeholder-[#52637A] outline-none focus:border-[#00D4FF]/40 transition-colors"
          />
          <svg className="w-3.5 h-3.5 text-[#52637A] absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Source Filter Tabs & Totals */}
        <div className="flex items-center space-x-2">
          <div className="flex p-0.5 rounded-lg bg-surface border border-white/[0.06] text-xs">
            <button
              onClick={() => setSelectedSource('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                selectedSource === 'all' ? 'bg-white/[0.08] text-white' : 'text-[#8B9BB4] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedSource('local')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                selectedSource === 'local' ? 'bg-[#00D4FF]/15 text-[#00D4FF]' : 'text-[#8B9BB4] hover:text-white'
              }`}
            >
              Local
            </button>
            <button
              onClick={() => setSelectedSource('drive')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                selectedSource === 'drive' ? 'bg-[#4285F4]/15 text-[#4285F4]' : 'text-[#8B9BB4] hover:text-white'
              }`}
            >
              Drive
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-[#7B8CA3] pl-2 border-l border-white/[0.06]">
            <span>{filteredVideos.length} files</span>
            <span>·</span>
            <span>{formatFileSize(totalSize)}</span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.map((video) => {
          const source = SOURCE_BADGES[video.source_type || 'local'] || SOURCE_BADGES.local;
          const status = STATUS_BADGES[video.status || 'ready'] || STATUS_BADGES.ready;
          const isDriveVideo = video.source_type === 'google_drive' || video.source_type === 'google_drive_link';

          return (
            <div
              key={video.id}
              className="glass-card overflow-hidden flex flex-col justify-between group transition-all duration-200 border-white/[0.07] hover:border-[#00D4FF]/30"
            >
              <div>
                {/* Thumbnail / Video Cinema Preview Box */}
                <div
                  className="aspect-video relative overflow-hidden cursor-pointer bg-[#070C12]"
                  onClick={() => canPreview(video) ? setPreviewVideo(video) : undefined}
                >
                  {video.thumbnail_path && canPreview(video) ? (
                    <img
                      src={`/api/thumbnails/${encodeURIComponent(video.filename.replace(/\.[^/.]+$/, '') + '_thumb.jpg')}`}
                      alt={video.original_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0B1118] to-[#131D2A]">
                      <svg className="w-8 h-8 text-[#52637A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-[2px]">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[#00D4FF]/20 border border-[#00D4FF]/40 text-[#00D4FF] shadow-glow-sm transform scale-90 group-hover:scale-100 transition-transform">
                      <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center pointer-events-none">
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded font-mono shadow-sm"
                      style={{ color: source.color, background: source.bg, border: `1px solid ${source.border}` }}
                    >
                      {source.label}
                    </span>

                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-black/70 text-white/90 backdrop-blur-md">
                      {formatFileSize(video.file_size)}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-2.5">
                  <h3
                    className="text-xs font-semibold text-[#E8ECF1] truncate tracking-tight"
                    title={video.original_name}
                  >
                    {video.original_name}
                  </h3>

                  <div className="flex items-center space-x-2 text-[10px] text-[#7B8CA3] font-mono">
                    <span>{dayjs(video.created_at).format('MMM D, YYYY')}</span>
                    <span>·</span>
                    <span>{video.mime_type?.split('/')[1]?.toUpperCase() || 'MP4'}</span>
                    {video.status && video.status !== 'ready' && (
                      <>
                        <span>·</span>
                        <span style={{ color: status.color }}>{status.label}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Tactile Action Buttons */}
              <div className="px-4 pb-4 pt-1 flex items-center space-x-2">
                <button
                  onClick={() => setStreamTargetVideo(video)}
                  className="flex-1 fx-btn fx-btn-live py-2 text-xs flex items-center justify-center space-x-1.5 shadow-sm"
                  title="Launch instant 24/7 Live Stream with this video"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Go Live</span>
                </button>

                <button
                  onClick={() => setPreviewVideo(video)}
                  className="fx-btn fx-btn-secondary py-2 px-3 text-xs"
                  title="Preview media playback"
                >
                  Preview
                </button>

                <button
                  onClick={() => handleDelete(video)}
                  disabled={deletingId === video.id}
                  className="fx-btn fx-btn-ghost py-2 px-2.5 text-xs text-[#FF5E6C]/70 hover:text-[#FF5E6C] hover:bg-[#FF4757]/10"
                  title="Delete video file"
                >
                  {deletingId === video.id ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {previewVideo && (
        <VideoPreview
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
          onGoLive={(v) => {
            setPreviewVideo(null);
            setStreamTargetVideo(v);
          }}
        />
      )}

      {streamTargetVideo && (
        <QuickStreamModal
          video={streamTargetVideo}
          onClose={() => setStreamTargetVideo(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}