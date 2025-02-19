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
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { chatId } = req.query;

    if (!chatId || typeof chatId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    // Soft delete the chat
    const updatedChat = await prisma.chat.update({
      where: {
        chat_id: chatId,
      },
      data: {
        deleted: true,
        updated_at: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      data: updatedChat
    });

  } catch (error: any) {
    console.error('Delete Chat Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}
