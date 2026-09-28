import { NextApiRequest, NextApiResponse } from 'next';
import { getSession, validateCredentials } from '@/lib/auth';
import { logActivity } from '@/lib/database';

export default async function loginRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const isValid = await validateCredentials(username, password);

  if (!isValid) {
    await logActivity('login_failed', `Failed login attempt for username: ${username}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const session = await getSession(req, res);
  session.user = {
    isLoggedIn: true,
    username,
  };

  await session.save();
  await logActivity('login_success', `User ${username} logged in`);

  res.status(200).json({ success: true });
}