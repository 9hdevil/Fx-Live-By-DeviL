import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { stopStream } from '@/lib/ffmpeg';
import { setStreamStopped } from '@/lib/streamState';
import { killAllFFmpegProcesses } from '@/lib/processKiller';
import { getDb } from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { streamId } = req.body;

    try {
      // Try normal stop first
      if (streamId) {
        await stopStream(streamId, 'API /api/streams/force-stop');
        setStreamStopped(streamId);
      }
      
      // Nuclear option - kill ALL ffmpeg processes
      await killAllFFmpegProcesses();
      
      // Update all running streams to stopped
      const db = await getDb();
      await db.run('UPDATE streams SET status = ?, pid = NULL WHERE status = ?', ['stopped', 'running']);
      
      res.status(200).json({ 
        success: true, 
        message: 'All FFmpeg processes forcefully stopped' 
      });
    } catch (error: any) {
      console.error('Force stop error:', error);
      res.status(500).json({ 
        error: 'Failed to force stop streams',
        details: error.message 
      });
    }
  });
}