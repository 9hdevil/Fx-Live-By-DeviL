import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb } from '@/lib/database';
import { getActiveStreams } from '@/lib/ffmpeg';
import { getAllActiveStreams } from '@/lib/stream-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const db = await getDb();
      const activeStreamIds = getActiveStreams();
      const globalActiveStreams = getAllActiveStreams();
      
      // Merge both tracking methods
      const allActiveIds = [...new Set([...activeStreamIds, ...globalActiveStreams.map(s => s.streamId)])];
      
      // Update database to match actual running state
      if (allActiveIds.length > 0) {
        // Mark streams as stopped if they're not actually running
        await db.run(
          'UPDATE streams SET status = ?, error_message = ? WHERE status = ? AND id NOT IN (' + 
          allActiveIds.map(() => '?').join(',') + ')',
          ['stopped', 'Stream process not found', 'running', ...allActiveIds]
        );
        
        // Mark streams as running if they are active but database shows stopped
        await db.run(
          'UPDATE streams SET status = ? WHERE status = ? AND id IN (' + 
          allActiveIds.map(() => '?').join(',') + ')',
          ['running', 'stopped', ...allActiveIds]
        );
      } else {
        // No active streams - mark all as stopped
        await db.run('UPDATE streams SET status = ? WHERE status = ?', ['stopped', 'running']);
      }

      res.status(200).json({ 
        success: true,
        message: 'Stream status synchronized',
        activeStreams: allActiveIds.length
      });
    } catch (error) {
      console.error('Sync status error:', error);
      res.status(500).json({ error: 'Failed to sync stream status' });
    }
  });
}