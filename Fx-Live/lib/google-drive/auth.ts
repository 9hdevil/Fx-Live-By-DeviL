import { google } from 'googleapis';
import { getDb } from '../database';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env.local');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate the Google OAuth consent URL.
 */
export function getGoogleOAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Always show consent to get refresh_token
  });
}

/**
 * Exchange authorization code for tokens and store them.
 */
export async function handleGoogleOAuthCallback(code: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token) {
    throw new Error('Failed to obtain access token from Google');
  }

  await storeTokens({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || null,
    expiry_date: tokens.expiry_date || null,
    token_type: tokens.token_type || 'Bearer',
  });
}

interface StoredTokens {
  access_token: string;
  refresh_token: string | null;
  expiry_date: number | null;
  token_type: string;
}

/**
 * Store tokens securely in the database.
 */
async function storeTokens(tokens: StoredTokens): Promise<void> {
  const db = await getDb();

  // Ensure the tokens table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS google_drive_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expiry_date INTEGER,
      token_type TEXT DEFAULT 'Bearer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Upsert — single row (id=1) for the single admin user
  const existing = await db.get('SELECT id FROM google_drive_tokens WHERE id = 1');
  if (existing) {
    // Only update refresh_token if a new one was provided
    if (tokens.refresh_token) {
      await db.run(
        `UPDATE google_drive_tokens SET access_token = ?, refresh_token = ?, expiry_date = ?, token_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
        [tokens.access_token, tokens.refresh_token, tokens.expiry_date, tokens.token_type]
      );
    } else {
      await db.run(
        `UPDATE google_drive_tokens SET access_token = ?, expiry_date = ?, token_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
        [tokens.access_token, tokens.expiry_date, tokens.token_type]
      );
    }
  } else {
    await db.run(
      `INSERT INTO google_drive_tokens (id, access_token, refresh_token, expiry_date, token_type) VALUES (1, ?, ?, ?, ?)`,
      [tokens.access_token, tokens.refresh_token, tokens.expiry_date, tokens.token_type]
    );
  }
}

/**
 * Get stored tokens from the database. Returns null if not connected.
 */
export async function getStoredTokens(): Promise<StoredTokens | null> {
  const db = await getDb();

  // Ensure the table exists before querying
  await db.exec(`
    CREATE TABLE IF NOT EXISTS google_drive_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expiry_date INTEGER,
      token_type TEXT DEFAULT 'Bearer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const row = await db.get('SELECT * FROM google_drive_tokens WHERE id = 1');
  if (!row) return null;

  return {
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expiry_date,
    token_type: row.token_type,
  };
}

/**
 * Get an authenticated OAuth2 client with valid tokens.
 * Automatically refreshes expired tokens.
 */
export async function getAuthenticatedClient() {
  const tokens = await getStoredTokens();
  if (!tokens) {
    throw new Error('Google Drive not connected. Please connect your Google Drive first.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    token_type: tokens.token_type,
  });

  // Check if token needs refresh
  const now = Date.now();
  if (tokens.expiry_date && tokens.expiry_date < now + 60000) {
    // Token expired or expiring within 1 minute
    if (!tokens.refresh_token) {
      throw new Error('Google Drive token expired and no refresh token available. Please reconnect.');
    }

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await storeTokens({
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || tokens.refresh_token,
        expiry_date: credentials.expiry_date || null,
        token_type: credentials.token_type || 'Bearer',
      });
      oauth2Client.setCredentials(credentials);
    } catch (error) {
      throw new Error('Failed to refresh Google Drive token. Please reconnect.');
    }
  }

  return oauth2Client;
}

/**
 * Check if Google Drive is currently connected.
 */
export async function isDriveConnected(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return tokens !== null;
}

/**
 * Revoke tokens and delete stored credentials.
 */
export async function revokeTokens(): Promise<void> {
  const tokens = await getStoredTokens();
  if (tokens) {
    try {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({ access_token: tokens.access_token });
      await oauth2Client.revokeCredentials();
    } catch (error) {
      console.error('Error revoking Google credentials (continuing with local cleanup):', error);
    }
  }

  const db = await getDb();
  await db.run('DELETE FROM google_drive_tokens WHERE id = 1');
}
