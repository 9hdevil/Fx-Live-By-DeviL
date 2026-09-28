import { getDriveClient } from './client';
import fs from 'fs';
import path from 'path';

/**
 * Supported video MIME types. Easy to extend.
 */
export const SUPPORTED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/mpeg',
  'video/3gpp',
  'video/x-flv',
];

/**
 * File metadata returned from Google Drive.
 */
export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
}

/**
 * List video files from the connected Google Drive.
 */
export async function listDriveVideos(
  query?: string,
  pageToken?: string,
  pageSize: number = 20
): Promise<{ files: DriveFileMetadata[]; nextPageToken?: string }> {
  const drive = await getDriveClient();

  // Build query: only video MIME types, not trashed
  const mimeQueries = SUPPORTED_VIDEO_MIMES.map(m => `mimeType='${m}'`).join(' or ');
  let q = `(${mimeQueries}) and trashed=false`;

  if (query) {
    // Sanitize the search query to prevent injection
    const sanitized = query.replace(/'/g, "\\'");
    q += ` and name contains '${sanitized}'`;
  }

  const response = await drive.files.list({
    q,
    pageSize,
    pageToken: pageToken || undefined,
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, thumbnailLink)',
    orderBy: 'modifiedTime desc',
    spaces: 'drive',
  });

  const files: DriveFileMetadata[] = (response.data.files || []).map(f => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    size: parseInt(f.size || '0', 10),
    modifiedTime: f.modifiedTime!,
    webViewLink: f.webViewLink || undefined,
    iconLink: f.iconLink || undefined,
    thumbnailLink: f.thumbnailLink || undefined,
  }));

  return {
    files,
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

/**
 * Get metadata for a specific Drive file by ID.
 */
export async function getDriveFileMetadata(fileId: string): Promise<DriveFileMetadata> {
  if (!fileId || typeof fileId !== 'string' || fileId.length > 200) {
    throw new Error('Invalid file ID');
  }

  const drive = await getDriveClient();

  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, modifiedTime, webViewLink, iconLink, thumbnailLink',
  });

  const f = response.data;
  if (!f.id || !f.name || !f.mimeType) {
    throw new Error('Incomplete file metadata returned from Google Drive');
  }

  return {
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: parseInt(f.size || '0', 10),
    modifiedTime: f.modifiedTime || new Date().toISOString(),
    webViewLink: f.webViewLink || undefined,
    iconLink: f.iconLink || undefined,
    thumbnailLink: f.thumbnailLink || undefined,
  };
}

/**
 * Validate that a Drive file exists, is accessible, and is a supported video type.
 */
export async function validateDriveFile(fileId: string): Promise<DriveFileMetadata> {
  const metadata = await getDriveFileMetadata(fileId);

  if (!SUPPORTED_VIDEO_MIMES.includes(metadata.mimeType)) {
    throw new Error(
      `Unsupported file type: ${metadata.mimeType}. Supported types: ${SUPPORTED_VIDEO_MIMES.join(', ')}`
    );
  }

  return metadata;
}

/**
 * Safely extract a Google Drive file ID from various URL formats.
 * Returns null if the URL is not a valid Drive URL.
 *
 * Supports:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/file/d/FILE_ID/edit
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID&export=download
 */
export function extractDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  // SSRF prevention: only allow drive.google.com
  if (parsed.hostname !== 'drive.google.com') {
    return null;
  }

  // Only HTTPS
  if (parsed.protocol !== 'https:') {
    return null;
  }

  // Pattern 1: /file/d/FILE_ID/...
  const filePathMatch = parsed.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (filePathMatch) {
    return filePathMatch[1];
  }

  // Pattern 2: ?id=FILE_ID (for /open and /uc)
  const idParam = parsed.searchParams.get('id');
  if (idParam && /^[a-zA-Z0-9_-]+$/.test(idParam)) {
    return idParam;
  }

  return null;
}

/**
 * Download a Drive file to a local path using streaming.
 * Handles large files without loading them into memory.
 */
export async function downloadDriveVideo(
  fileId: string,
  destPath: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  if (!fileId || typeof fileId !== 'string') {
    throw new Error('Invalid file ID');
  }

  // Validate the destination directory exists and is within allowed paths
  const destDir = path.dirname(destPath);
  await fs.promises.mkdir(destDir, { recursive: true });

  const drive = await getDriveClient();

  // Get file metadata first for the total size
  const metadata = await getDriveFileMetadata(fileId);
  const totalSize = metadata.size;

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destPath);
    let downloaded = 0;

    const stream = response.data as unknown as NodeJS.ReadableStream;

    stream.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (onProgress) {
        onProgress(downloaded, totalSize);
      }
    });

    stream.on('error', (err: Error) => {
      dest.close();
      // Cleanup partial file
      fs.unlink(destPath, () => {}); 
      reject(new Error(`Failed to download file from Google Drive: ${err.message}`));
    });

    dest.on('error', (err: Error) => {
      // Cleanup partial file
      fs.unlink(destPath, () => {});
      reject(new Error(`Failed to write downloaded file: ${err.message}`));
    });

    dest.on('finish', () => {
      resolve();
    });

    stream.pipe(dest);
  });
}
