import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getGoogleOAuthUrl } from '@/lib/google-drive/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const url = getGoogleOAuthUrl();
      res.status(200).json({ url });
    } catch (error: any) {
      console.error('Google Drive auth URL error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate auth URL' });
    }
  });
}
