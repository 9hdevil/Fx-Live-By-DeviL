import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'PUT') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;
    const { name, videoId, rtmpUrl, quality, loopEnabled } = req.body;

    if (!id || !name || !videoId || !rtmpUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const streamId = parseInt(id as string);

    try {
      const db = await getDb();
      
      // Check if stream exists and is not running
      const stream = await db.get('SELECT * FROM streams WHERE id = ?', [streamId]);
      
      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      if (stream.status === 'running') {
        return res.status(400).json({ error: 'Cannot edit a running stream' });
      }

      // Check if video exists
      const video = await db.get('SELECT * FROM videos WHERE id = ?', [videoId]);
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      // Update stream
      await db.run(
        `UPDATE streams 
         SET name = ?, video_id = ?, rtmp_url = ?, quality = ?, loop_enabled = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [name, videoId, rtmpUrl, quality || '720p', loopEnabled ? 1 : 0, streamId]
      );

      res.status(200).json({ 
        success: true, 
        message: 'Stream updated successfully' 
      });
    } catch (error) {
      console.error('Update stream error:', error);
      res.status(500).json({ error: 'Failed to update stream' });
    }
  });
}