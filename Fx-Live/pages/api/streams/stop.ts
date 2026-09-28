import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { stopStream } from '@/lib/ffmpeg';
import { setStreamStopped } from '@/lib/streamState';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { streamId } = req.body;

  if (!streamId) {
    return res.status(400).json({ error: 'Stream ID is required' });
  }

  try {
    await stopStream(streamId, 'API /api/streams/stop');
    setStreamStopped(streamId);
    res.status(200).json({ success: true, message: 'Stream stopped successfully' });
  } catch (error) {
    console.error('Stop stream error:', error);
    res.status(500).json({ error: 'Failed to stop stream' });
  }
  });
}