import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {

  try {
    const db = await getDb();
    const videos = await db.all(
      'SELECT * FROM videos ORDER BY created_at DESC'
    );

    res.status(200).json({ videos });
  } catch (error) {
    console.error('List videos error:', error);
    res.status(500).json({ error: 'Failed to list videos' });
  }
  });
}