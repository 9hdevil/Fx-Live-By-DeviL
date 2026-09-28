import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { isDriveConnected, revokeTokens } from '@/lib/google-drive/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method === 'GET') {
      try {
        const connected = await isDriveConnected();
        return res.status(200).json({ connected });
      } catch (error: any) {
        console.error('Drive status check error:', error);
        return res.status(500).json({ error: 'Failed to check Drive status' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        await revokeTokens();
        return res.status(200).json({ success: true, message: 'Google Drive disconnected' });
      } catch (error: any) {
        console.error('Drive disconnect error:', error);
        return res.status(500).json({ error: 'Failed to disconnect Google Drive' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
