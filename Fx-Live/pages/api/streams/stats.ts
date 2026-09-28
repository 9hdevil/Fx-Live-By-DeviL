import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getStreamStats, getAllStreamStats, getAverageStats } from '@/lib/streamStats';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { streamId } = req.query;

    try {
      if (streamId) {
        // Get stats for specific stream
        const stats = getStreamStats(parseInt(streamId as string));
        if (!stats) {
          return res.status(404).json({ error: 'Stream statistics not found' });
        }
        res.status(200).json(stats);
      } else {
        // Get all stream stats and averages
        const allStats = getAllStreamStats();
        const averages = getAverageStats();
        
        res.status(200).json({
          streams: allStats,
          averages,
          summary: {
            totalStreams: allStats.length,
            excellentStreams: allStats.filter(s => s.quality === 'excellent').length,
            goodStreams: allStats.filter(s => s.quality === 'good').length,
            fairStreams: allStats.filter(s => s.quality === 'fair').length,
            poorStreams: allStats.filter(s => s.quality === 'poor').length,
            streamsWithErrors: allStats.filter(s => s.errors.length > 0).length
          }
        });
      }
    } catch (error) {
      console.error('Stream stats error:', error);
      res.status(500).json({ error: 'Failed to get stream statistics' });
    }
  });
}