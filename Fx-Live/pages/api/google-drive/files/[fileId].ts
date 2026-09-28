import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDriveFileMetadata } from '@/lib/google-drive/files';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fileId } = req.query;

    if (!fileId || typeof fileId !== 'string') {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    // Validate fileId format
    if (!/^[a-zA-Z0-9_-]+$/.test(fileId) || fileId.length > 200) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }

    try {
      const metadata = await getDriveFileMetadata(fileId);
      return res.status(200).json(metadata);
    } catch (error: any) {
      console.error('Get Drive file metadata error:', error);
      if (error.code === 404) {
        return res.status(404).json({ error: 'File not found on Google Drive' });
      }
      return res.status(500).json({ error: error.message || 'Failed to get file metadata' });
    }
  });
}
