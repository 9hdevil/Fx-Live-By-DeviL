import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Video {
  id: number;
  original_name: string;
}

interface Stream {
  id: number;
  name: string;
  video_id: number;
  rtmp_url: string;
  quality: string;
  loop_enabled: boolean;
}

interface EditStreamModalProps {
  stream: Stream;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditStreamModal({ stream, onClose, onSuccess }: EditStreamModalProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<'youtube' | 'custom'>('custom');
  const [streamKey, setStreamKey] = useState('');
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [formData, setFormData] = useState({
    name: stream.name,
    videoId: stream.video_id.toString(),
    rtmpUrl: stream.rtmp_url,
    quality: stream.quality,
    loopEnabled: stream.loop_enabled,
  });

  useEffect(() => {
    fetchVideos();
    
    if (stream.rtmp_url.includes('youtube.com')) {
      setPlatform('youtube');
      const keyMatch = stream.rtmp_url.match(/\/([^/?]+)(\?.*)?$/);
      if (keyMatch) {
        setStreamKey(keyMatch[1]);
      }
      setUseBackup(stream.rtmp_url.includes('backup=1'));
    }
  }, [stream.rtmp_url]);

  useEffect(() => {
    if (platform === 'youtube' && streamKey) {
      const baseUrl = useBackup 
        ? 'rtmp://b.rtmp.youtube.com/live2?backup=1'
        : 'rtmp://a.rtmp.youtube.com/live2';
      setFormData(prev => ({ ...prev, rtmpUrl: `${baseUrl}/${streamKey.trim()}` }));
    }
  }, [platform, streamKey, useBackup]);

  const fetchVideos = async () => {
    try {
      const response = await axios.get('/api/videos/list');
      setVideos(response.data.videos || []);
    } catch (error) {
      toast.error('Failed to load videos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.videoId || !formData.rtmpUrl.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      await axios.put(`/api/streams/${stream.id}/update`, formData);
      toast.success('Pipeline configuration saved successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update stream');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none"
      onClick={onClose}
    >
      <div 
        className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-glass-lg animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center bg-surface/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/25 flex items-center justify-center text-[#00D4FF]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#E8ECF1]">Edit Stream Pipeline #{stream.id}</h2>
              <p className="text-xs text-[#7B8CA3]">Update stream ingestion settings</p>
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="fx-label">
              Stream Pipeline Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="fx-input"
              required
            />
          </div>

          <div>
            <label htmlFor="video" className="fx-label flex justify-between items-center">
              <span>Source Video Asset</span>
              <span className="text-[10px] text-[#7B8CA3] font-mono">
                {videos.length} available
              </span>
            </label>
            <select
              id="video"
              value={formData.videoId}
              onChange={(e) => setFormData({ ...formData, videoId: e.target.value })}
              className="fx-select"
              required
            >
              {videos.map((video: any) => (
                <option key={video.id} value={video.id}>
                  {video.original_name} {video.source_type?.includes('drive') ? '(Google Drive)' : '(Local File)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="fx-label">
              Platform Protocol
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPlatform('youtube')}
                className={`p-3 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] ${
                  platform === 'youtube'
                    ? 'border-[#00D4FF]/40 bg-[#00D4FF]/[0.08] shadow-glow-sm'
                    : 'border-white/[0.06] bg-surface/50 hover:bg-surface/80 hover:border-white/12'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span className="text-xs font-semibold text-[#E8ECF1]">YouTube Live</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPlatform('custom')}
                className={`p-3 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] ${
                  platform === 'custom'
                    ? 'border-[#00D4FF]/40 bg-[#00D4FF]/[0.08] shadow-glow-sm'
                    : 'border-white/[0.06] bg-surface/50 hover:bg-surface/80 hover:border-white/12'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <svg className="w-4 h-4 text-[#00D4FF] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-semibold text-[#E8ECF1]">Custom RTMP</span>
                </div>
              </button>
            </div>
          </div>

          {platform === 'youtube' ? (
            <div className="space-y-3 p-3.5 rounded-xl bg-surface/50 border border-white/[0.06]">
              <div>
                <label htmlFor="streamKey" className="fx-label flex justify-between items-center">
                  <span>YouTube Stream Key</span>
                  <button
                    type="button"
                    onClick={() => setShowStreamKey(!showStreamKey)}
                    className="text-[10px] text-[#00D4FF] hover:underline cursor-pointer"
                  >
                    {showStreamKey ? 'Hide' : 'Show'}
                  </button>
                </label>
                <input
                  type={showStreamKey ? 'text' : 'password'}
                  id="streamKey"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  className="fx-input font-mono text-xs"
                  placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                  required
                />
              </div>

              <label className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  id="useBackup"
                  checked={useBackup}
                  onChange={(e) => setUseBackup(e.target.checked)}
                  className="fx-checkbox"
                />
                <div>
                  <span className="text-xs font-medium text-[#E8ECF1]">Use Backup Redundant Server</span>
                  <p className="text-[10px] text-[#7B8CA3]">b.rtmp.youtube.com</p>
                </div>
              </label>
            </div>
          ) : (
            <div>
              <label htmlFor="rtmpUrl" className="fx-label">
                Custom RTMP URL
              </label>
              <input
                type="text"
                id="rtmpUrl"
                value={formData.rtmpUrl}
                onChange={(e) => setFormData({ ...formData, rtmpUrl: e.target.value })}
                className="fx-input font-mono text-xs"
                placeholder="rtmp://your.server/live/stream_key"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="quality" className="fx-label flex justify-between items-center">
              <span>Encoding Preset & Network Bandwidth</span>
              <span className="text-[10px] text-[#00D4FF] font-mono">ADAPTIVE</span>
            </label>
            <select
              id="quality"
              value={formData.quality}
              onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
              className="fx-select"
            >
              <option value="480p">⚡ 480p SD Eco (900 kbps) — Optimal for Slow Internet / Zero Buffering</option>
              <option value="720p-low">🚀 720p HD Low-Bandwidth (1.4 Mbps) — Smooth HD for Moderate Speeds</option>
              <option value="360p">📶 360p Ultra-Low (500 kbps) — Extreme Slow Speeds</option>
              <option value="720p">🎬 720p HD Standard (2.2 Mbps) — Balanced HD</option>
              <option value="1080p">💎 1080p Full HD (3.8 Mbps) — High Speed</option>
            </select>
          </div>

          <label className="flex items-center space-x-3 p-3.5 rounded-xl bg-surface/50 border border-white/[0.06] cursor-pointer hover:border-white/12 transition-all">
            <input
              type="checkbox"
              id="loop"
              checked={formData.loopEnabled}
              onChange={(e) => setFormData({ ...formData, loopEnabled: e.target.checked })}
              className="fx-checkbox flex-shrink-0"
            />
            <div>
              <span className="text-xs font-semibold text-[#E8ECF1]">Loop Continuously (24/7 Mode)</span>
              <p className="text-[10px] text-[#7B8CA3]">Autonomous infinite playback loop</p>
            </div>
          </label>

          <div className="flex space-x-2.5 pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 fx-btn fx-btn-primary py-2.5 text-xs font-bold shadow-glow-sm"
            >
              {isLoading ? 'Saving Configuration...' : 'Save Configuration'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="fx-btn fx-btn-secondary py-2.5 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}