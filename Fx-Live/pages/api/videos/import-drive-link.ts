import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { extractDriveFileId } from '@/lib/google-drive/files';
import { startDriveDownloadJob } from '@/lib/google-drive/downloadManager';
import { randomBytes } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Google Drive URL is required' });
    }

    if (url.length > 500) {
      return res.status(400).json({ error: 'URL is too long' });
    }

    // Extract file ID from URL
    const fileId = extractDriveFileId(url);
    if (!fileId) {
      return res.status(400).json({
        error: 'Invalid Google Drive URL. Supported link formats:\n• https://drive.google.com/file/d/FILE_ID/view\n• https://drive.google.com/open?id=FILE_ID\n• https://drive.google.com/uc?id=FILE_ID',
      });
    }

    try {
      const jobId = randomBytes(8).toString('hex');
      const job = startDriveDownloadJob(jobId, fileId, url);

      res.status(200).json({
        success: true,
        jobId: job.id,
        fileId: job.fileId,
        status: job.status,
        message: 'Google Drive download initiated on VPS server',
      });
    } catch (error: any) {
      console.error('Import Drive link initiation error:', error);
      res.status(500).json({ error: error.message || 'Failed to initiate Google Drive download' });
    }
  });
}
