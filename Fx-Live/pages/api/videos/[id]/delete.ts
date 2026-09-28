import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb, logActivity } from '@/lib/database';
import { deleteFile } from '@/lib/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  try {
    const db = await getDb();
    
    // Check if video is being used by any active streams
    const activeStream = await db.get(
      'SELECT * FROM streams WHERE video_id = ? AND status = ?',
      [id, 'running']
    );

    if (activeStream) {
      return res.status(400).json({ error: 'Cannot delete video while it is being streamed' });
    }

    // Get video info
    const video = await db.get('SELECT * FROM videos WHERE id = ?', [id]);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Only delete local file if it's a local upload with a file_path
    if (video.source_type === 'local' && video.file_path) {
      await deleteFile(video.file_path);
      // Also try to delete thumbnail
      if (video.thumbnail_path) {
        await deleteFile(video.thumbnail_path);
      }
    }

    // Delete from database
    await db.run('DELETE FROM videos WHERE id = ?', [id]);

    await logActivity('video_deleted', `Video "${video.original_name}" deleted`);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
  });
}