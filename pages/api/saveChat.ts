import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { chatId, chatTitle } = req.body;

    const updatedChat = await prisma.chat.update({
      where: { chat_id: chatId },
      data: {
        chat_title: chatTitle,
        updated_at: new Date(),
      },
    });

    res.status(200).json({ success: true, data: updatedChat });
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
