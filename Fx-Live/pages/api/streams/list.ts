import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb } from '@/lib/database';
import { isStreamRunning } from '@/lib/streamState';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {

  try {
    const db = await getDb();
    const streams = await db.all(`
      SELECT 
        s.*,
        v.original_name as video_name,
        v.filename as video_filename
      FROM streams s
      JOIN videos v ON s.video_id = v.id
      ORDER BY s.created_at DESC
    `);

    // Override status with in-memory state if available
    const streamsWithCorrectStatus = streams.map(stream => {
      if (isStreamRunning(stream.id)) {
        return { ...stream, status: 'running' };
      }
      return stream;
    });

    res.status(200).json({ streams: streamsWithCorrectStatus });
  } catch (error) {
    console.error('List streams error:', error);
    res.status(500).json({ error: 'Failed to list streams' });
  }
  });
}