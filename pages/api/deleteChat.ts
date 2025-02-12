import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res
      .status(405)
      .json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Accept test user ID header in non-production environments
    const testUserId = process.env.NODE_ENV !== 'production' ? 
      req.headers['x-test-user-id'] as string : 
      undefined;

    const session = testUserId ? 
      { user: { id: testUserId } } : 
      await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { chatId } = req.body;

    await prisma.chat.delete({
      where: { chat_id: chatId },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
