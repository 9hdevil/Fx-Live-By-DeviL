import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/database';

export default async function logoutRoute(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  const username = session.user?.username;
  session.destroy();
  
  if (username) {
    await logActivity('logout', `User ${username} logged out`);
  }
  
  res.status(200).json({ success: true });
}