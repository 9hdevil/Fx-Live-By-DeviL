import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Video {
  id: number;
  original_name: string;
  source_type?: string;
}

interface StreamFormProps {
  onSuccess: () => void;
  initialVideoId?: string | number;
}

export default function StreamForm({ onSuccess, initialVideoId }: StreamFormProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<'youtube' | 'custom'>('youtube');
  const [streamKey, setStreamKey] = useState('');
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    videoId: initialVideoId ? initialVideoId.toString() : '',
    rtmpUrl: '',
    quality: '720p',
    loopEnabled: true,
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (initialVideoId && videos.length > 0) {
      const selected = videos.find(v => v.id.toString() === initialVideoId.toString());
      if (selected) {
        setFormData(prev => ({
          ...prev,
          videoId: selected.id.toString(),
          name: prev.name || `${selected.original_name.replace(/\.[^/.]+$/, '')} 24/7 Live`,
        }));
      }
    }
  }, [initialVideoId, videos]);

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
      toast.error('Failed to load video assets');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.videoId) {
      toast.error('Please provide a stream name and select a source video');
      return;
    }

    if (platform === 'youtube' && !streamKey.trim()) {
      toast.error('Please paste your YouTube stream key');
      return;
    }

    if (!formData.rtmpUrl.trim()) {
      toast.error('Please configure an RTMP ingestion URL');
      return;
    }

    setIsLoading(true);

    try {
      await axios.post('/api/streams/create', formData);
      toast.success('Stream pipeline created and armed for broadcast!');
      setFormData({
        name: '',
        videoId: '',
        rtmpUrl: '',
        quality: '720p',
        loopEnabled: true,
      });
      setStreamKey('');
      setPlatform('youtube');
      setUseBackup(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create stream pipeline');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Stream Name */}
      <div>
        <label htmlFor="name" className="fx-label">
          Pipeline Channel Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="fx-input"
          placeholder="e.g., Lofi Beats 24/7 Channel"
          required
        />
      </div>

      {/* Source Video */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label htmlFor="video" className="fx-label mb-0">
            Source Video Asset
          </label>
          <span className="text-[10px] text-[#7B8CA3] font-mono">
            {videos.length} {videos.length === 1 ? 'asset' : 'assets'}
          </span>
        </div>
        <select
          id="video"
          value={formData.videoId}
          onChange={(e) => {
            const vid = e.target.value;
            setFormData(prev => {
              const selected = videos.find(v => v.id.toString() === vid);
              return {
                ...prev,
                videoId: vid,
                name: prev.name ? prev.name : selected ? `${selected.original_name.replace(/\.[^/.]+$/, '')} Live` : '',
              };
            });
          }}
          className="fx-select"
          required
        >
          <option value="">Select a video from library...</option>
          {videos.map((video: any) => (
            <option key={video.id} value={video.id}>
              {video.original_name} {video.source_type?.includes('drive') ? '(Google Drive)' : '(Local File)'}
            </option>
          ))}
        </select>
      </div>

      {/* Target Platform Selector (Tactile Cards) */}
      <div>
        <label className="fx-label">
          Ingestion Platform
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
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#E8ECF1]">YouTube Live</div>
                <div className="text-[10px] text-[#7B8CA3]">Auto-configured RTMP</div>
              </div>
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
              <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[#00D4FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#E8ECF1]">Custom RTMP</div>
                <div className="text-[10px] text-[#7B8CA3]">Twitch, Kick, CDN</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Platform-specific Config */}
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
                {showStreamKey ? 'Hide key' : 'Show key'}
              </button>
            </label>
            <div className="relative">
              <input
                type={showStreamKey ? 'text' : 'password'}
                id="streamKey"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                className="fx-input font-mono text-xs pr-10"
                placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                required
              />
              {streamKey && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <p className="mt-1 text-[10px] text-[#7B8CA3]">
              Obtain from YouTube Studio &rarr; Go Live &rarr; Stream Key
            </p>
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
              <span className="text-xs font-medium text-[#E8ECF1]">Use Backup Redundancy Ingest</span>
              <p className="text-[10px] text-[#7B8CA3]">Routes through b.rtmp.youtube.com</p>
            </div>
          </label>
        </div>
      ) : (
        <div>
          <label htmlFor="rtmpUrl" className="fx-label">
            Custom RTMP Endpoint URL
          </label>
          <input
            type="text"
            id="rtmpUrl"
            value={formData.rtmpUrl}
            onChange={(e) => setFormData({ ...formData, rtmpUrl: e.target.value })}
            className="fx-input font-mono text-xs"
            placeholder="rtmp://live.twitch.tv/app/live_key_here"
            required
          />
          <p className="mt-1 text-[10px] text-[#7B8CA3]">
            Full RTMP URL with ingestion endpoint and stream key
          </p>
        </div>
      )}

      {/* Quality preset */}
      <div>
        <label htmlFor="quality" className="fx-label flex justify-between items-center">
          <span>Encoding Preset & Network Bandwidth</span>
          <span className="text-[10px] text-[#00D4FF] font-mono">ADAPTIVE ENCODER</span>
        </label>
        <select
          id="quality"
          value={formData.quality}
          onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
          className="fx-select"
        >
          <option value="480p">⚡ 480p SD Eco (900 kbps) — Recommended for Slow Internet / Mobile Hotspot / Zero Buffering</option>
          <option value="720p-low">🚀 720p HD Low-Bandwidth (1.4 Mbps) — Smooth HD on Moderate Speeds</option>
          <option value="360p">📶 360p Ultra-Low (500 kbps) — Extreme Slow 2G/3G / Minimal Upload Speed</option>
          <option value="720p">🎬 720p HD Standard (2.2 Mbps) — Balanced HD Broadcast</option>
          <option value="1080p">💎 1080p Full HD (3.8 Mbps) — High-Speed Broadband Required</option>
        </select>
        <p className="mt-1.5 text-[11px] text-[#7B8CA3]">
          💡 Select <strong className="text-[#00D4FF]">480p SD Eco</strong> or <strong className="text-[#00D4FF]">720p Low-Bandwidth</strong> to completely prevent buffering on slower upload connections.
        </p>
      </div>

      {/* 24/7 Loop switch */}
      <label className="flex items-center space-x-3 p-3.5 rounded-xl bg-surface/50 border border-white/[0.06] cursor-pointer hover:border-white/12 transition-all">
        <input
          type="checkbox"
          id="loop"
          checked={formData.loopEnabled}
          onChange={(e) => setFormData({ ...formData, loopEnabled: e.target.checked })}
          className="fx-checkbox flex-shrink-0"
        />
        <div>
          <span className="text-xs font-semibold text-[#E8ECF1]">Loop Infinitely (24/7 Autonomous Mode)</span>
          <p className="text-[10px] text-[#7B8CA3]">Seamlessly loops video file without stream disconnection</p>
        </div>
      </label>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || videos.length === 0}
        className="w-full fx-btn fx-btn-primary py-3 font-bold text-xs shadow-glow-sm"
      >
        {isLoading ? (
          <span className="flex items-center justify-center space-x-2">
            <span className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
            <span>Configuring Pipeline Engine...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center space-x-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Stream Pipeline</span>
          </span>
        )}
      </button>
    </form>
  );
}