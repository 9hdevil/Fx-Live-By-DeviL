import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface PublicDriveDownloadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
}

/**
 * Downloads a publicly shared Google Drive file directly to VPS disk without any OAuth.
 */
export async function downloadPublicDriveFile(
  fileId: string,
  destDir: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<PublicDriveDownloadResult> {
  const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  const client = axios.create({
    timeout: 300000, // 5 min timeout for initial handshake
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  // Step 1: Request initial download link
  const res1 = await client.get(initialUrl, {
    responseType: 'stream',
    validateStatus: (status) => status < 400,
  });

  let downloadStream = res1.data;
  let headers = res1.headers;
  let cookies = res1.headers['set-cookie'] || [];

  const contentType = String(headers['content-type'] || '').toLowerCase();
  
  // If Google returns HTML (virus scan warning page for large files)
  if (contentType.includes('text/html')) {
    // Read the HTML body to extract confirmation link or token
    const htmlChunks: Buffer[] = [];
    for await (const chunk of downloadStream) {
      htmlChunks.push(Buffer.from(chunk));
    }
    const html = Buffer.concat(htmlChunks).toString('utf-8');

    // Pattern 1: Look for form action or direct download link
    // e.g., href="/uc?export=download&confirm=xxxx&id=..." or action="https://drive.usercontent.google.com/download"
    let confirmUrl = '';
    
    // Check for form action with inputs
    const actionMatch = html.match(/action="([^"]+)"/);
    const confirmMatch = html.match(/name="confirm"\s+value="([^"]+)"/) || html.match(/confirm=([0-9a-zA-Z_-]+)/);
    const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/) || html.match(/uuid=([0-9a-zA-Z_-]+)/);
    const idMatch = html.match(/name="id"\s+value="([^"]+)"/) || html.match(/id=([0-9a-zA-Z_-]+)/);

    if (actionMatch && confirmMatch) {
      const actionUrl = actionMatch[1].replace(/&amp;/g, '&');
      const confirmToken = confirmMatch[1];
      const uuid = uuidMatch ? uuidMatch[1] : '';
      const id = idMatch ? idMatch[1] : fileId;

      const urlObj = new URL(actionUrl.startsWith('http') ? actionUrl : `https://drive.google.com${actionUrl}`);
      urlObj.searchParams.set('id', id);
      urlObj.searchParams.set('export', 'download');
      urlObj.searchParams.set('confirm', confirmToken);
      if (uuid) urlObj.searchParams.set('uuid', uuid);
      confirmUrl = urlObj.toString();
    } else {
      // Look for href download link
      const hrefMatch = html.match(/href="(\/uc\?export=download[^"]+)"/) ||
                         html.match(/href="(https:\/\/drive\.usercontent\.google\.com\/download[^"]+)"/);
      if (hrefMatch) {
        confirmUrl = hrefMatch[1].replace(/&amp;/g, '&');
        if (!confirmUrl.startsWith('http')) {
          confirmUrl = `https://drive.google.com${confirmUrl}`;
        }
      } else {
        // Generic fallback URL with confirm=t
        confirmUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
      }
    }

    const cookieHeader = Array.isArray(cookies) ? cookies.map(c => c.split(';')[0]).join('; ') : cookies;

    // Step 2: Request the actual download stream using the confirmation URL
    const res2 = await client.get(confirmUrl, {
      responseType: 'stream',
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      validateStatus: (status) => status < 400,
    });

    downloadStream = res2.data;
    headers = res2.headers;
  }

  // Extract original filename from Content-Disposition header
  let originalName = `google_drive_${fileId}.mp4`;
  const contentDisposition = String(headers['content-disposition'] || '');
  if (contentDisposition) {
    const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (filenameStarMatch) {
      originalName = decodeURIComponent(filenameStarMatch[1]);
    } else if (filenameMatch) {
      originalName = filenameMatch[1];
    }
  }

  // Clean filename
  originalName = originalName.trim().replace(/[/\\?%*:|"<>]/g, '_');
  if (!path.extname(originalName)) {
    originalName += '.mp4';
  }

  const totalSize = parseInt(String(headers['content-length'] || '0'), 10);
  const uniqueName = `${Date.now()}_${originalName}`;
  const targetFilePath = path.join(destDir, uniqueName);

  await fs.promises.mkdir(destDir, { recursive: true });
  const writer = fs.createWriteStream(targetFilePath);

  let downloaded = 0;

  return new Promise<PublicDriveDownloadResult>((resolve, reject) => {
    downloadStream.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (onProgress) {
        onProgress(downloaded, totalSize);
      }
    });

    downloadStream.on('error', (err: Error) => {
      writer.close();
      fs.unlink(targetFilePath, () => {});
      reject(new Error(`Download stream error: ${err.message}`));
    });

    writer.on('error', (err: Error) => {
      fs.unlink(targetFilePath, () => {});
      reject(new Error(`File write error: ${err.message}`));
    });

    writer.on('finish', () => {
      const stats = fs.statSync(targetFilePath);
      resolve({
        filePath: targetFilePath,
        fileName: originalName,
        fileSize: stats.size,
      });
    });

    downloadStream.pipe(writer);
  });
}
