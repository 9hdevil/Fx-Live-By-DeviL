import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { config } from '@/lib/config';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path: filePath } = req.query;
  
  if (!filePath || typeof filePath !== 'object') {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  const filename = filePath.join('/');
  const thumbnailDir = path.join(config.storage.uploadDir, 'thumbnails');
  const fullPath = path.join(thumbnailDir, filename);

  // Security: Ensure the path doesn't escape the thumbnail directory
  const resolvedPath = path.resolve(fullPath);
  const resolvedThumbnailDir = path.resolve(thumbnailDir);
  
  if (!resolvedPath.startsWith(resolvedThumbnailDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    // Return a default thumbnail
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(`
      <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="360" fill="#262626"/>
        <path d="M320 140 L380 180 L320 220 Z" fill="#666"/>
      </svg>
    `);
    return;
  }

  const stat = fs.statSync(resolvedPath);
  const fileSize = stat.size;
  
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Length', fileSize);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  
  fs.createReadStream(resolvedPath).pipe(res);
}