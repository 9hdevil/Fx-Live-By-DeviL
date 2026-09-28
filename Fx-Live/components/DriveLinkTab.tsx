import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface DriveLinkTabProps {
  onImportComplete: () => void;
}

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export default function DriveLinkTab({ onImportComplete }: DriveLinkTabProps) {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'downloading' | 'processing' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startPolling = (jobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`/api/videos/download-status?jobId=${jobId}`);
        const job = res.data;

        setStatus(job.status);
        setProgress(job.progress || 0);
        setDownloadedBytes(job.downloadedBytes || 0);
        setTotalBytes(job.totalBytes || 0);
        if (job.fileName) setFileName(job.fileName);

        if (job.status === 'completed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsProcessing(false);
          toast.success(`"${job.fileName || 'Video'}" downloaded and ready for live stream! 🎬`);
          onImportComplete();
          setUrl('');
        } else if (job.status === 'failed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setIsProcessing(false);
          const err = job.error || 'Failed to download video from Google Drive';
          setErrorMessage(err);
          toast.error(err);
        }
      } catch (e: any) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setIsProcessing(false);
        setStatus('failed');
        setErrorMessage('Lost connection while tracking download progress');
      }
    }, 750);
  };

  const handleImport = async () => {
    if (!url.trim()) {
      toast.error('Please paste a valid Google Drive shareable link');
      return;
    }

    setIsProcessing(true);
    setStatus('starting');
    setProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);
    setErrorMessage('');
    setFileName('');

    try {
      const { data } = await axios.post('/api/videos/import-drive-link', { url: url.trim() });
      if (data.jobId) {
        setStatus('downloading');
        startPolling(data.jobId);
      } else {
        setIsProcessing(false);
        toast.error('Could not initialize Google Drive download job');
      }
    } catch (error: any) {
      setIsProcessing(false);
      setStatus('failed');
      const err = error.response?.data?.error || 'Failed to initiate download';
      setErrorMessage(err);
      toast.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Zero Login Helper Info Box */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#00D4FF]/[0.06] to-[#7B61FF]/[0.04] border border-[#00D4FF]/20 flex items-start space-x-3.5">
        <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div className="text-xs space-y-1">
          <p className="font-bold text-[#E8ECF1]">
            Direct High-Speed Drive Downloader (No Login / OAuth Needed)
          </p>
          <p className="text-[#8B9BB4] leading-relaxed">
            Paste any Google Drive link set to <span className="font-semibold text-[#00D4FF]">"Anyone with the link can view"</span>. The server downloads the full high-bitrate video directly to local disk and generates a thumbnail for instant 24/7 streaming.
          </p>
        </div>
      </div>

      {/* URL Input & Action */}
      <div>
        <label className="fx-label">
          Google Drive Shareable File URL
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (status === 'failed' || status === 'completed') {
                setStatus('idle');
                setErrorMessage('');
              }
            }}
            placeholder="https://drive.google.com/file/d/1a2b3c4d5e.../view?usp=sharing"
            disabled={isProcessing}
            className="fx-input font-mono text-xs flex-1"
          />
          <button
            onClick={handleImport}
            disabled={isProcessing || !url.trim()}
            className="fx-btn fx-btn-primary px-6 py-2.5 text-xs font-bold shadow-glow-sm flex-shrink-0"
          >
            {isProcessing ? (
              <span className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                <span>Downloading...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download to Server</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Live Download Progress Telemetry */}
      {status !== 'idle' && (
        <div
          className={`p-4 rounded-xl space-y-3 transition-all ${
            status === 'failed'
              ? 'bg-destructive/10 border border-destructive/25'
              : status === 'completed'
              ? 'bg-success/10 border border-success/30'
              : 'bg-surface/90 border border-[#00D4FF]/30 shadow-glow-sm'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              {isProcessing && (
                <span className="w-3.5 h-3.5 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
              )}
              {status === 'completed' && (
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {status === 'failed' && (
                <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-semibold" style={{ color: status === 'failed' ? '#FF4757' : status === 'completed' ? '#00E68A' : '#E8ECF1' }}>
                {status === 'starting' && 'Connecting to Google Drive storage cluster...'}
                {status === 'downloading' && 'High-speed stream download directly to local disk...'}
                {status === 'processing' && 'Extracting keyframes & generating preview thumbnail...'}
                {status === 'completed' && 'Video successfully saved and ready for broadcast!'}
                {status === 'failed' && (errorMessage || 'Download failed')}
              </span>
            </div>

            {(status === 'downloading' || status === 'processing' || status === 'completed') && (
              <span className="font-mono text-xs font-bold" style={{ color: status === 'completed' ? '#00E68A' : '#00D4FF' }}>
                {progress}%
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div>
              <div className="fx-progress h-2 bg-white/[0.08]">
                <div
                  className="fx-progress-bar"
                  style={{
                    width: `${Math.max(4, progress)}%`,
                    background: 'linear-gradient(90deg, #00D4FF 0%, #7B61FF 100%)',
                    boxShadow: '0 0 12px rgba(0, 212, 255, 0.4)',
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono text-[#7B8CA3] mt-1.5">
                <span className="truncate max-w-[320px]">{fileName ? `File: ${fileName}` : 'Streaming download in progress...'}</span>
                <span className="tabular-nums">
                  {downloadedBytes > 0 && totalBytes > 0
                    ? `${formatFileSize(downloadedBytes)} / ${formatFileSize(totalBytes)}`
                    : downloadedBytes > 0
                    ? `${formatFileSize(downloadedBytes)} downloaded`
                    : 'Calculating...'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
