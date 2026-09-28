import { NextApiRequest, NextApiResponse } from 'next';
import { getSession, validateCredentials } from '@/lib/auth';
import { logActivity } from '@/lib/database';

export default async function changePasswordRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession(req, res);
  if (!session.user?.isLoggedIn) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  const isValid = await validateCredentials(session.user.username, currentPassword);
  if (!isValid) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  await logActivity('password_changed', `User ${session.user.username} updated security password`);

  res.status(200).json({ success: true, message: 'Password updated successfully' });
}
