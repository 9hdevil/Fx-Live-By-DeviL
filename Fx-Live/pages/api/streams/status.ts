import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb } from '@/lib/database';
import { getActiveStreams } from '@/lib/ffmpeg';
import { getAllActiveStreams } from '@/lib/stream-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {

  try {
    const db = await getDb();
    const activeStreamIds = getActiveStreams();
    const globalActiveStreams = getAllActiveStreams();
    
    // Merge both tracking methods
    const allActiveIds = [...new Set([...activeStreamIds, ...globalActiveStreams.map(s => s.streamId)])];
    
    // Get running streams from database
    const dbStreams = await db.all(`
      SELECT 
        s.*,
        v.original_name as video_name
      FROM streams s
      JOIN videos v ON s.video_id = v.id
      WHERE s.status = 'running'
    `);

    // Filter to only include streams that are actually running in memory
    const activeStreams = dbStreams.filter(stream => allActiveIds.includes(stream.id));

    res.status(200).json({ 
      activeStreams: activeStreams,
      activeCount: activeStreams.length 
    });
  } catch (error) {
    console.error('Stream status error:', error);
    res.status(500).json({ error: 'Failed to get stream status' });
  }
  });
}