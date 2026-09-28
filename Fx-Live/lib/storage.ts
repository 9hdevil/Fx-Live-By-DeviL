import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';
export const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE && 
  process.env.MAX_FILE_SIZE !== '0' && 
  process.env.MAX_FILE_SIZE !== 'Infinity' && 
  process.env.MAX_FILE_SIZE !== 'unlimited'
    ? parseInt(process.env.MAX_FILE_SIZE, 10)
    : Infinity;

export async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
}

export function generateFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const name = randomBytes(16).toString('hex');
  return `${name}${ext}`;
}

export async function saveFile(buffer: Buffer, filename: string): Promise<string> {
  await ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

export function isVideoFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext);
}