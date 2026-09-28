import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { requireAuth } from '@/lib/authMiddleware';
import { getDb, logActivity } from '@/lib/database';
import { generateFileName, isVideoFile, MAX_FILE_SIZE, UPLOAD_DIR, ensureUploadDir } from '@/lib/storage';
import { generateThumbnail } from '@/lib/thumbnail';
import fs from 'fs/promises';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export const runtime = 'nodejs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return requireAuth(req, res, async (req, res) => {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ensure upload directory exists
  await ensureUploadDir();

  const form = formidable({
    maxFileSize: MAX_FILE_SIZE === Infinity ? Number.MAX_SAFE_INTEGER : MAX_FILE_SIZE,
    maxTotalFileSize: MAX_FILE_SIZE === Infinity ? Number.MAX_SAFE_INTEGER : MAX_FILE_SIZE,
    maxFieldsSize: Number.MAX_SAFE_INTEGER,
    // Write directly to the upload directory to avoid double-copy and memory issues
    uploadDir: path.resolve(UPLOAD_DIR),
    keepExtensions: true,
    // Create unique filenames to avoid collisions
    filename: (_name, _ext, part) => {
      return generateFileName(part.originalFilename || 'video.mp4');
    },
  });

  try {
    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!isVideoFile(file.originalFilename || '')) {
      // Clean up the temp file
      try { await fs.unlink(file.filepath); } catch {}
      return res.status(400).json({ error: 'Invalid file type. Only video files are allowed.' });
    }

    // The file is already in the upload directory thanks to formidable's uploadDir config
    // No need to read-then-write, which was causing the 0% memory issue
    const filename = path.basename(file.filepath);
    const filePath = file.filepath;

    // Generate thumbnail
    let thumbnailPath = null;
    try {
      const thumbnailName = filename.replace(/\.[^/.]+$/, '') + '_thumb.jpg';
      thumbnailPath = await generateThumbnail(filePath, thumbnailName);
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      // Continue without thumbnail
    }

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO videos (filename, original_name, file_path, thumbnail_path, file_size, source_type, status, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [filename, file.originalFilename, filePath, thumbnailPath, file.size, 'local', 'ready', file.mimetype || null]
    );

    await logActivity('video_uploaded', `Video "${file.originalFilename}" uploaded`);

    res.status(200).json({
      id: result.lastID,
      filename,
      originalName: file.originalFilename,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    if (error.code === 'LIMIT_FILE_SIZE' || error.httpCode === 413) {
      return res.status(413).json({ error: 'File exceeds maximum upload size limit.' });
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
  });
}