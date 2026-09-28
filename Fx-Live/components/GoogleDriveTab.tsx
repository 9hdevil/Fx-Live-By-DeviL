import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

interface GoogleDriveTabProps {
  onImportComplete: () => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  thumbnailLink?: string;
}

const formatFileSize = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export default function GoogleDriveTab({ onImportComplete }: GoogleDriveTabProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [importing, setImporting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const checkStatus = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/google-drive/status');
      setConnected(data.connected);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const loadFiles = useCallback(async (append = false, token?: string) => {
    setLoadingFiles(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.query = searchQuery;
      if (token) params.pageToken = token;

      const { data } = await axios.get('/api/google-drive/files', { params });
      if (append) {
        setFiles(prev => [...prev, ...data.files]);
      } else {
        setFiles(data.files);
      }
      setNextPageToken(data.nextPageToken);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setConnected(false);
        toast.error('Google Drive session expired. Please reconnect.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to load Drive video files');
      }
    } finally {
      setLoadingFiles(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (connected) {
      loadFiles();
    }
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = async () => {
    try {
      const { data } = await axios.get('/api/google-drive/auth');
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start Google Drive OAuth');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Drive account from this server?')) return;
    setDisconnecting(true);
    try {
      await axios.delete('/api/google-drive/status');
      setConnected(false);
      setFiles([]);
      toast.success('Google Drive disconnected');
    } catch (error: any) {
      toast.error('Failed to disconnect account');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleImport = async (file: DriveFile) => {
    setImporting(file.id);
    try {
      await axios.post('/api/videos/import-drive', { fileId: file.id });
      toast.success(`"${file.name}" imported to library! 🚀`);
      onImportComplete();
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to import video');
    } finally {
      setImporting(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="text-center py-10 px-4">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-[#4285F4]/10 border border-[#4285F4]/20 text-[#4285F4]">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.71 3.5L1.15 15l3.43 5.96h6.6L4.62 9.46 7.71 3.5zm1.14 0l6.56 11.5H21.97L15.41 3.5H8.85zm7.71 12.5H9.99l-3.43 5.96h6.57l3.43-5.96z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-[#E8ECF1] mb-1">Connect Your Google Drive</h3>
        <p className="text-xs text-[#7B8CA3] mb-6 max-w-sm mx-auto">
          Connect your account to browse and import your cloud video assets with single-click ease.
        </p>
        <button
          onClick={handleConnect}
          className="fx-btn fx-btn-primary px-6 py-2.5 text-xs font-bold shadow-glow-sm"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.71 3.5L1.15 15l3.43 5.96h6.6L4.62 9.46 7.71 3.5zm1.14 0l6.56 11.5H21.97L15.41 3.5H8.85zm7.71 12.5H9.99l-3.43 5.96h6.57l3.43-5.96z" />
          </svg>
          <span>Authenticate with Google</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Account Status Header */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-success/10 border border-success/20">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-semibold text-success">Google Drive Connected</span>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="fx-btn fx-btn-ghost py-1 px-2.5 text-xs text-[#FF5E6C]/80 hover:text-[#FF5E6C] hover:bg-[#FF4757]/10"
        >
          {disconnecting ? 'Disconnecting...' : 'Disconnect Account'}
        </button>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search videos in your Drive..."
          className="fx-input flex-1"
        />
        <button
          type="submit"
          disabled={loadingFiles}
          className="fx-btn fx-btn-secondary px-4 text-xs font-semibold"
        >
          {loadingFiles ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Files List */}
      {loadingFiles && files.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-10 text-xs text-[#7B8CA3]">
          No video files found in Google Drive
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 rounded-xl bg-surface/60 border border-white/[0.05] hover:border-[#00D4FF]/30 transition-all group"
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1 pr-3">
                <div className="w-9 h-9 rounded-lg bg-[#4285F4]/10 border border-[#4285F4]/20 flex items-center justify-center flex-shrink-0 text-[#4285F4]">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#E8ECF1] truncate group-hover:text-[#00D4FF] transition-colors" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center space-x-2 mt-0.5 text-[10px] font-mono text-[#7B8CA3]">
                    <span>{formatFileSize(file.size)}</span>
                    <span>·</span>
                    <span>{dayjs(file.modifiedTime).format('MMM D, YYYY')}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleImport(file)}
                disabled={importing === file.id}
                className="fx-btn fx-btn-primary py-1.5 px-3.5 text-xs font-bold flex-shrink-0"
              >
                {importing === file.id ? (
                  <span className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    <span>Importing...</span>
                  </span>
                ) : (
                  'Import Video'
                )}
              </button>
            </div>
          ))}

          {nextPageToken && (
            <button
              onClick={() => loadFiles(true, nextPageToken)}
              disabled={loadingFiles}
              className="w-full py-2.5 text-xs font-semibold text-[#00D4FF] hover:bg-[#00D4FF]/10 rounded-lg transition-colors"
            >
              {loadingFiles ? 'Loading more videos...' : 'Load More Files'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
