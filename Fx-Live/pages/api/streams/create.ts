import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb, logActivity } from '@/lib/database';
import { config } from '@/lib/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, videoId, rtmpUrl, quality, loopEnabled } = req.body;

    if (!name || !videoId || !rtmpUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const db = await getDb();

      // Enforce max total streams limit (running + stopped combined)
      const maxStreams = config.app.maxConcurrentStreams;
      const totalCount = await db.get('SELECT COUNT(*) as count FROM streams');
      const runningCount = await db.get(
        'SELECT COUNT(*) as count FROM streams WHERE status = ?',
        ['running']
      );

      // Don't allow creating more streams if already at the running limit
      // (soft check — the hard enforcement is on /api/streams/start)
      if (runningCount && runningCount.count >= maxStreams) {
        return res.status(429).json({
          error: `Maximum concurrent stream limit reached (${maxStreams}). Stop an existing stream first.`,
          maxStreams,
          activeStreams: runningCount.count,
        });
      }
      
      // Check if video exists
      const video = await db.get('SELECT * FROM videos WHERE id = ?', [videoId]);
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Check if stream already exists
      const existingStream = await db.get(
        'SELECT * FROM streams WHERE name = ? AND video_id = ? AND rtmp_url = ?',
        [name, videoId, rtmpUrl]
      );

      if (existingStream) {
        return res.status(400).json({ error: 'Stream already exists with this configuration' });
      }

      // Create stream record (not started)
      const result = await db.run(
        'INSERT INTO streams (name, video_id, rtmp_url, quality, loop_enabled, status) VALUES (?, ?, ?, ?, ?, ?)',
        [name, videoId, rtmpUrl, quality || '720p', loopEnabled ? 1 : 0, 'stopped']
      );

      await logActivity('stream_created', `Stream "${name}" created`);

      res.status(200).json({ 
        success: true, 
        streamId: result.lastID,
        message: 'Stream created successfully' 
      });
    } catch (error) {
      console.error('Create stream error:', error);
      res.status(500).json({ error: 'Failed to create stream' });
    }
  });
}