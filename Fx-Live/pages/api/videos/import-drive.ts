import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb, logActivity } from '@/lib/database';
import { validateDriveFile } from '@/lib/google-drive/files';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fileId } = req.body;

    if (!fileId || typeof fileId !== 'string') {
      return res.status(400).json({ error: 'File ID is required' });
    }

    // Validate fileId format
    if (!/^[a-zA-Z0-9_-]+$/.test(fileId) || fileId.length > 200) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }

    try {
      // Check if already imported
      const db = await getDb();
      const existing = await db.get('SELECT id FROM videos WHERE drive_file_id = ?', [fileId]);
      if (existing) {
        return res.status(409).json({ error: 'This video has already been imported' });
      }

      // Validate the file exists and is a supported video
      const metadata = await validateDriveFile(fileId);

      // Save metadata reference — no actual download
      const result = await db.run(
        `INSERT INTO videos (filename, original_name, file_path, file_size, source_type, drive_file_id, drive_url, mime_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          metadata.name,
          metadata.name,
          '', // No local file path — it's a Drive reference
          metadata.size,
          'google_drive',
          metadata.id,
          metadata.webViewLink || `https://drive.google.com/file/d/${metadata.id}/view`,
          metadata.mimeType,
          'ready',
        ]
      );

      await logActivity('video_imported', `Video "${metadata.name}" imported from Google Drive`);

      res.status(200).json({
        id: result.lastID,
        filename: metadata.name,
        originalName: metadata.name,
        fileSize: metadata.size,
        source: 'google_drive',
      });
    } catch (error: any) {
      console.error('Import Drive video error:', error);
      if (error.code === 404) {
        return res.status(404).json({ error: 'File not found on Google Drive' });
      }
      res.status(500).json({ error: error.message || 'Failed to import video from Google Drive' });
    }
  });
}
