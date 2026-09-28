import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb, logActivity } from '@/lib/database';
import { startStream } from '@/lib/ffmpeg';
import { setStreamRunning } from '@/lib/streamState';
import { downloadDriveVideo } from '@/lib/google-drive/files';
import { generateFileName, ensureUploadDir, UPLOAD_DIR } from '@/lib/storage';
import { generateThumbnail } from '@/lib/thumbnail';
import { config } from '@/lib/config';
import path from 'path';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { streamId } = req.body;

    if (!streamId) {
      return res.status(400).json({ error: 'Missing stream ID' });
    }

    try {
      const db = await getDb();
      
      // Enforce max concurrent streams limit
      const maxStreams = config.app.maxConcurrentStreams;
      const runningCount = await db.get(
        'SELECT COUNT(*) as count FROM streams WHERE status = ?',
        ['running']
      );
      
      if (runningCount && runningCount.count >= maxStreams) {
        return res.status(429).json({ 
          error: `Maximum concurrent stream limit reached (${maxStreams}). Stop an existing stream before starting a new one.`,
          maxStreams,
          activeStreams: runningCount.count,
        });
      }

      // Get stream details along with video info
      const stream = await db.get(
        `SELECT s.*, v.file_path, v.source_type, v.drive_file_id, v.original_name, v.thumbnail_path 
         FROM streams s JOIN videos v ON s.video_id = v.id WHERE s.id = ?`,
        [streamId]
      );
      
      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      if (stream.status === 'running') {
        return res.status(400).json({ error: 'Stream is already running' });
      }

      let videoPath = stream.file_path;

      // If video is from Google Drive and not yet downloaded locally, download it
      if ((stream.source_type === 'google_drive' || stream.source_type === 'google_drive_link') &&
          (!videoPath || !fs.existsSync(videoPath))) {
        if (!stream.drive_file_id) {
          return res.status(400).json({ error: 'Google Drive file ID missing for this video' });
        }

        await ensureUploadDir();
        const filename = generateFileName(stream.original_name || 'drive_video.mp4');
        videoPath = path.join(UPLOAD_DIR, filename);

        await downloadDriveVideo(stream.drive_file_id, videoPath);

        // Generate thumbnail if missing
        let thumbnailPath = stream.thumbnail_path;
        if (!thumbnailPath) {
          try {
            const thumbnailName = filename.replace(/\.[^/.]+$/, '') + '_thumb.jpg';
            thumbnailPath = await generateThumbnail(videoPath, thumbnailName);
          } catch (e) {
            console.error('Failed to generate thumbnail for Drive video:', e);
          }
        }

        // Update video record in database with local file path
        await db.run(
          'UPDATE videos SET file_path = ?, thumbnail_path = COALESCE(thumbnail_path, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [videoPath, thumbnailPath, stream.video_id]
        );
      }

      if (!videoPath || !fs.existsSync(videoPath)) {
        return res.status(400).json({ error: 'Video file could not be found or downloaded for streaming' });
      }

      // Start FFmpeg process
      await startStream(stream.id, {
        videoPath,
        rtmpUrl: stream.rtmp_url,
        quality: stream.quality || '720p',
        loop: stream.loop_enabled === 1,
      });

      // Mark stream as running in global state
      setStreamRunning(stream.id);

      res.status(200).json({ 
        success: true, 
        streamId: stream.id,
        message: 'Stream started successfully' 
      });
    } catch (error: any) {
      console.error('Start stream error:', error);
      res.status(500).json({ error: error.message || 'Failed to start stream' });
    }
  });
}