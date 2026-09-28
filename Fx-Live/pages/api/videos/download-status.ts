import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDownloadJob } from '@/lib/google-drive/downloadManager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const job = getDownloadJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Download job not found' });
    }

    res.status(200).json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      downloadedBytes: job.downloadedBytes,
      totalBytes: job.totalBytes,
      fileName: job.fileName,
      error: job.error,
      videoId: job.videoId,
    });
  });
}
