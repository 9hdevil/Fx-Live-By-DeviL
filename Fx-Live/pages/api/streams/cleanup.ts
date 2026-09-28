import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const db = await getDb();
      
      // Find duplicate streams (same name, video_id, rtmp_url)
      const duplicates = await db.all(`
        SELECT 
          name, video_id, rtmp_url, 
          COUNT(*) as count,
          GROUP_CONCAT(id) as ids,
          MIN(id) as keep_id
        FROM streams 
        GROUP BY name, video_id, rtmp_url 
        HAVING COUNT(*) > 1
      `);

      let deletedCount = 0;

      for (const dup of duplicates) {
        const ids = dup.ids.split(',').map((id: string) => parseInt(id));
        const keepId = dup.keep_id;
        
        // Delete all except the oldest one
        for (const id of ids) {
          if (id !== keepId) {
            await db.run('DELETE FROM streams WHERE id = ?', [id]);
            deletedCount++;
          }
        }
      }

      res.status(200).json({ 
        success: true, 
        message: `Cleaned up ${deletedCount} duplicate streams`,
        duplicatesFound: duplicates.length,
        streamsDeleted: deletedCount
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({ error: 'Failed to cleanup streams' });
    }
  });
}