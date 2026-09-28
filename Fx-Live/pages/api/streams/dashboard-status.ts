import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb } from '@/lib/database';
import { getAllActiveStreams } from '@/lib/stream-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      console.log('[DASHBOARD STATUS] Fetching stream status for dashboard');
      
      const db = await getDb();
      
      // Get streams from database
      const streams = await db.all(
        'SELECT * FROM streams WHERE status = ? ORDER BY started_at DESC',
        ['running']
      );

      // Get active streams from memory
      const globalActiveStreams = getAllActiveStreams();
      const activeIds = globalActiveStreams.map(s => s.streamId);
      
      console.log(`[DASHBOARD STATUS] DB running streams: ${streams.length}, Memory active streams: ${activeIds.length}`);
      
      // Filter to only show streams that are actually running in memory
      const runningStreams = streams.filter(stream => activeIds.includes(stream.id));

      res.status(200).json({ 
        streams: runningStreams,
        activeCount: runningStreams.length
      });
    } catch (error) {
      console.error('Dashboard status error:', error);
      res.status(500).json({ error: 'Failed to fetch stream status' });
    }
  });
}