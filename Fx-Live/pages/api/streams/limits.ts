import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb } from '@/lib/database';
import { config } from '@/lib/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const db = await getDb();
      const maxStreams = config.app.maxConcurrentStreams;

      const runningCount = await db.get(
        'SELECT COUNT(*) as count FROM streams WHERE status = ?',
        ['running']
      );

      const totalCount = await db.get('SELECT COUNT(*) as count FROM streams');

      res.status(200).json({
        maxConcurrentStreams: maxStreams,
        activeStreams: runningCount?.count || 0,
        totalStreams: totalCount?.count || 0,
        canStartMore: (runningCount?.count || 0) < maxStreams,
        remainingSlots: Math.max(0, maxStreams - (runningCount?.count || 0)),
      });
    } catch (error) {
      console.error('Stream limits error:', error);
      res.status(500).json({ error: 'Failed to fetch stream limits' });
    }
  });
}
