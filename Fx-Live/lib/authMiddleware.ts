import { NextApiRequest, NextApiResponse } from 'next';

export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return handler(req, res);
}