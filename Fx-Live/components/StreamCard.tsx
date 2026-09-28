import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import EditStreamModal from './EditStreamModal';

dayjs.extend(relativeTime);

interface Stream {
  id: number;
  name: string;
  video_id: number;
  video_name: string;
  rtmp_url: string;
  quality: string;
  loop_enabled: boolean;
  status: 'running' | 'stopped' | 'error';
  started_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface StreamStats {
  bitrate: number;
  fps: number;
  speed: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  errors: string[];
}

interface StreamCardProps {
  stream: Stream;
  onUpdate: () => void;
}

export default function StreamCard({ stream, onUpdate }: StreamCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<StreamStats | null>(null);

  useEffect(() => {
    if (stream.status === 'running') {
      fetchStats();
      const interval = setInterval(fetchStats, 2000);
      return () => clearInterval(interval);
    }
  }, [stream.id, stream.status]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`/api/streams/stats?streamId=${stream.id}`);
      setStats(response.data);
    } catch (error) {
      // Stream telemetry may be initializing
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the stream pipeline "${stream.name}"?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      await axios.delete(`/api/streams/${stream.id}/delete`);
      toast.success('Stream pipeline deleted');
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete stream');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async () => {
    setIsLoading(true);

    try {
      if (stream.status === 'running') {
        await axios.post('/api/streams/stop', { streamId: stream.id });
        toast.success('Stream broadcast stopped');
      } else {
        await axios.post('/api/streams/start', { streamId: stream.id });
        toast.success('Live broadcast pipeline started! 🔴');
      }
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle stream');
    } finally {
      setIsLoading(false);
    }
  };

  const getUptime = () => {
    if (!stream.started_at || stream.status !== 'running') return null;
    return dayjs(stream.started_at).fromNow(true);
  };

  return (
    <div
      className={`glass-card p-5 border transition-all duration-200 relative overflow-hidden ${
        stream.status === 'running'
          ? 'border-success/30 shadow-glow-sm'
          : 'border-white/[0.07] hover:border-white/15'
      }`}
    >
      {/* Top running highlight line */}
      {stream.status === 'running' && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-success/40 via-success to-success/40" />
      )}

      {/* Card Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1.5 min-w-0 flex-1 pr-3">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h3 className="text-base font-semibold text-[#E8ECF1] tracking-tight truncate">
              {stream.name}
            </h3>
            {stream.loop_enabled && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/25 font-mono">
                24/7 LOOP
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.04] text-[#8B9BB4] border border-white/[0.06] font-mono">
              {stream.quality}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#8B9BB4]">
            <svg className="w-3.5 h-3.5 text-[#6B7D95] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="truncate max-w-[260px] text-[#E8ECF1] font-medium">{stream.video_name}</span>
          </div>
        </div>

        {/* Live / Standby Status Chip */}
        <div
          className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border font-mono ${
            stream.status === 'running'
              ? 'bg-success/10 text-success border-success/30'
              : stream.status === 'error'
              ? 'bg-destructive/10 text-destructive border-destructive/30'
              : 'bg-white/[0.04] text-[#8B9BB4] border-white/[0.08]'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${
            stream.status === 'running' ? 'bg-success status-dot-running' :
            stream.status === 'error' ? 'bg-destructive' : 'bg-[#52637A]'
          }`} />
          <span className="uppercase tracking-wider text-[11px]">
            {stream.status === 'running' ? 'LIVE NOW' : stream.status}
          </span>
        </div>
      </div>

      {/* Live Telemetry Panel (When Running) */}
      {stream.status === 'running' && (
        <div className="mb-4 p-3.5 rounded-xl bg-[#0F1923]/90 border border-success/20 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-white/[0.06] pb-2">
            <span className="text-[#8B9BB4] flex items-center space-x-1.5">
              <svg className="w-3.5 h-3.5 text-[#00D4FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Broadcast Uptime</span>
            </span>
            <span className="text-[#E8ECF1] font-mono font-semibold tabular-nums">{getUptime() || 'Just started'}</span>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-surface/70 border border-white/[0.04]">
                <div className="text-[10px] text-[#7B8CA3] font-bold uppercase">Bitrate</div>
                <div className="text-xs font-bold font-mono text-[#00D4FF] tabular-nums mt-0.5">
                  {Math.round(stats.bitrate)} <span className="text-[10px] font-normal">kbps</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface/70 border border-white/[0.04]">
                <div className="text-[10px] text-[#7B8CA3] font-bold uppercase">Frame Rate</div>
                <div className="text-xs font-bold font-mono text-[#E8ECF1] tabular-nums mt-0.5">
                  {stats.fps.toFixed(1)} <span className="text-[10px] font-normal">FPS</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface/70 border border-white/[0.04]">
                <div className="text-[10px] text-[#7B8CA3] font-bold uppercase">Quality</div>
                <div className={`text-xs font-bold capitalize mt-0.5 ${
                  stats.quality === 'excellent' ? 'text-success' :
                  stats.quality === 'good' ? 'text-[#00D4FF]' :
                  stats.quality === 'fair' ? 'text-warning' : 'text-destructive'
                }`}>
                  {stats.quality}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message if any */}
      {stream.error_message && (
        <div className="mb-4 text-xs text-destructive bg-destructive/10 border border-destructive/25 p-3 rounded-xl flex items-start space-x-2.5">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="break-all">{stream.error_message}</span>
        </div>
      )}

      {/* Tactile Actions Toolbar */}
      <div className="flex items-center space-x-2 pt-1">
        {/* Main Live Toggle Button */}
        <button
          onClick={handleToggle}
          disabled={isLoading || isDeleting}
          className={`flex-1 fx-btn py-2.5 text-xs font-bold ${
            stream.status === 'running'
              ? 'fx-btn-danger'
              : 'fx-btn-primary'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Transcoding Pipeline...</span>
            </span>
          ) : stream.status === 'running' ? (
            <span className="flex items-center space-x-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Stop Broadcast</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Go Live (Start Stream)</span>
            </span>
          )}
        </button>

        {/* Edit Button (when stopped) */}
        {stream.status !== 'running' && (
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting || isLoading}
            className="fx-btn fx-btn-secondary py-2.5 px-3 text-xs"
            title="Edit stream configuration"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        )}

        {/* Delete Pipeline Button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting || isLoading || stream.status === 'running'}
          className="fx-btn fx-btn-ghost py-2.5 px-3 text-xs text-[#FF5E6C]/80 hover:text-[#FF5E6C] hover:bg-[#FF4757]/10"
          title={stream.status === 'running' ? 'Stop stream before deleting' : 'Delete stream pipeline'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {isEditing && (
        <EditStreamModal
          stream={stream}
          onClose={() => setIsEditing(false)}
          onSuccess={() => {
            setIsEditing(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}