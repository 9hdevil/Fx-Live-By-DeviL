import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/auth';

export default async function meRoute(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  
  if (session.user?.isLoggedIn) {
    res.status(200).json({ user: session.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
}