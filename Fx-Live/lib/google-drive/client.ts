import { google, drive_v3 } from 'googleapis';
import { getAuthenticatedClient } from './auth';

/**
 * Get an authenticated Google Drive API v3 client.
 */
export async function getDriveClient(): Promise<drive_v3.Drive> {
  const auth = await getAuthenticatedClient();
  return google.drive({ version: 'v3', auth });
}
