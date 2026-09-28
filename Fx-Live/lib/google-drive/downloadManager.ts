import { downloadPublicDriveFile } from './publicDownload';
import { getDb, logActivity } from '../database';
import { generateThumbnail } from '../thumbnail';
import { UPLOAD_DIR, ensureUploadDir } from '../storage';
import path from 'path';

export interface DownloadJob {
  id: string;
  fileId: string;
  url: string;
  status: 'starting' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  fileName?: string;
  error?: string;
  videoId?: number;
  createdAt: number;
}

const jobs = new Map<string, DownloadJob>();

// Clean up old jobs after 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(id);
    }
  }
}, 600000);

export function getDownloadJob(jobId: string): DownloadJob | undefined {
  return jobs.get(jobId);
}

export function startDriveDownloadJob(jobId: string, fileId: string, url: string): DownloadJob {
  const job: DownloadJob = {
    id: jobId,
    fileId,
    url,
    status: 'starting',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    createdAt: Date.now(),
  };

  jobs.set(jobId, job);

  // Run download in background
  (async () => {
    try {
      await ensureUploadDir();
      job.status = 'downloading';

      const result = await downloadPublicDriveFile(
        fileId,
        path.resolve(UPLOAD_DIR),
        (downloaded, total) => {
          job.downloadedBytes = downloaded;
          job.totalBytes = total;
          if (total > 0) {
            job.progress = Math.min(99, Math.round((downloaded / total) * 100));
          } else {
            // Indeterminate progress if total not provided by Google
            job.progress = Math.min(95, Math.round(downloaded / (1024 * 1024))); // mock scale
          }
        }
      );

      job.status = 'processing';
      job.fileName = result.fileName;
      job.progress = 99;

      const filename = path.basename(result.filePath);

      // Generate thumbnail
      let thumbnailPath: string | null = null;
      try {
        const thumbName = filename.replace(/\.[^/.]+$/, '') + '_thumb.jpg';
        thumbnailPath = await generateThumbnail(result.filePath, thumbName);
      } catch (thumbError) {
        console.error('Thumbnail generation error for downloaded Drive file:', thumbError);
      }

      const db = await getDb();
      const insertResult = await db.run(
        `INSERT INTO videos (filename, original_name, file_path, thumbnail_path, file_size, source_type, drive_file_id, drive_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          filename,
          result.fileName,
          result.filePath,
          thumbnailPath,
          result.fileSize,
          'google_drive_link',
          fileId,
          url,
          'ready',
        ]
      );

      await logActivity('video_downloaded', `Video "${result.fileName}" downloaded from Google Drive link`);

      job.status = 'completed';
      job.progress = 100;
      job.videoId = insertResult.lastID;
    } catch (error: any) {
      console.error(`Download job ${jobId} failed:`, error);
      job.status = 'failed';
      job.error = error.message || 'Failed to download file from Google Drive';
    }
  })();

  return job;
}
