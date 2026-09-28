import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { listDriveVideos } from '@/lib/google-drive/files';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { query, pageToken, pageSize } = req.query;
      const result = await listDriveVideos(
        typeof query === 'string' ? query : undefined,
        typeof pageToken === 'string' ? pageToken : undefined,
        typeof pageSize === 'string' ? Math.min(parseInt(pageSize, 10) || 20, 50) : 20
      );
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('List Drive files error:', error);
      if (error.message?.includes('not connected')) {
        return res.status(401).json({ error: 'Google Drive not connected' });
      }
      return res.status(500).json({ error: error.message || 'Failed to list Drive files' });
    }
  });
}
