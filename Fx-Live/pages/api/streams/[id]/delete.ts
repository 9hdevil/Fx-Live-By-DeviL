import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb, logActivity } from '@/lib/database';
import { stopStream } from '@/lib/ffmpeg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid stream ID' });
    }

    const streamId = parseInt(id);

    try {
      const db = await getDb();
      
      // Get stream info
      const stream = await db.get('SELECT * FROM streams WHERE id = ?', [streamId]);
      
      if (!stream) {
        return res.status(404).json({ error: 'Stream not found' });
      }

      // Stop the stream if it's running
      if (stream.status === 'running') {
        await stopStream(streamId, 'API /api/streams/[id]/delete');
      }

      // Delete from database
      await db.run('DELETE FROM streams WHERE id = ?', [streamId]);

      await logActivity('stream_deleted', `Stream "${stream.name}" deleted`);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete stream error:', error);
      res.status(500).json({ error: 'Failed to delete stream' });
    }
  });
}