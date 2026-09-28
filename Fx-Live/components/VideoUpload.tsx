import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast from 'react-hot-toast';

interface VideoUploadProps {
  onUploadComplete: () => void;
}

export default function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const cancelUpload = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsUploading(false);
    setUploadProgress(0);
    setUploadError(null);
    toast('Upload cancelled', { icon: '✕' });
  }, [abortController]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      await axios.post('/api/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: controller.signal,
        timeout: 0,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setUploadProgress(percentCompleted);
        },
      });

      toast.success(`"${file.name}" uploaded successfully!`);
      onUploadComplete();
    } catch (error: any) {
      if (axios.isCancel(error)) {
        return;
      }
      const errorMsg = error.response?.data?.error || 'Failed to upload video';
      setUploadError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
      setAbortController(null);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 relative overflow-hidden ${
          isDragActive
            ? 'border-2 border-dashed border-[#00D4FF] bg-[#00D4FF]/[0.05] shadow-glow'
            : isUploading
            ? 'border-2 border-white/[0.08] bg-surface/50 opacity-80 cursor-wait'
            : 'border-2 border-dashed border-white/[0.1] hover:border-[#00D4FF]/40 bg-surface/30 hover:bg-surface/60'
        }`}
      >
        <input {...getInputProps()} />
        
        {isDragActive ? (
          <div className="space-y-3 py-4">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-[#00D4FF]/20 border border-[#00D4FF]/40 text-[#00D4FF] animate-bounce">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-sm font-bold text-[#00D4FF]">Release video file to begin ingestion...</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF]">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E8ECF1]">
                Drag and drop your video file here, or <span className="text-[#00D4FF] underline decoration-[#00D4FF]/30">browse disk</span>
              </p>
              <p className="text-xs text-[#7B8CA3] mt-1">
                Direct streaming supported: MP4, MOV, MKV, WebM, AVI (up to 40 GB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress Monitor */}
      {isUploading && (
        <div className="p-4 rounded-xl bg-surface/80 border border-[#00D4FF]/30 space-y-2.5 shadow-glow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-[#E8ECF1]">Uploading Video to Storage Server...</span>
            </div>
            <button
              onClick={cancelUpload}
              className="fx-btn fx-btn-ghost py-1 px-2.5 text-xs text-[#FF5E6C]"
            >
              Cancel
            </button>
          </div>

          <div className="fx-progress h-2 bg-white/[0.08]">
            <div
              className="fx-progress-bar"
              style={{
                width: `${uploadProgress}%`,
                background: 'linear-gradient(90deg, #00D4FF 0%, #00E68A 100%)',
                boxShadow: '0 0 12px rgba(0, 212, 255, 0.4)',
              }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono text-[#7B8CA3]">
            <span>Ingesting video stream</span>
            <span className="text-[#00D4FF] font-bold tabular-nums">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {uploadError && !isUploading && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 flex items-center justify-between text-xs text-destructive">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-[11px] text-[#8B9BB4] hover:text-white underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}