import { NextApiRequest, NextApiResponse } from 'next';
import { handleGoogleOAuthCallback } from '@/lib/google-drive/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error } = req.query;

  if (error) {
    console.error('Google OAuth error:', error);
    return res.redirect('/videos?drive_error=access_denied');
  }

  if (!code || typeof code !== 'string') {
    return res.redirect('/videos?drive_error=no_code');
  }

  try {
    await handleGoogleOAuthCallback(code);
    res.redirect('/videos?drive_connected=true');
  } catch (err: any) {
    console.error('Google Drive callback error:', err);
    res.redirect('/videos?drive_error=callback_failed');
  }
}
