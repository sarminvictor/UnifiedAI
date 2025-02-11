import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'DELETE') {
    const { chatId } = req.body;

    try {
      const session = await getServerSession(req, res, authOptions);

      if (!session) {
        return res
          .status(401)
          .json({ success: false, message: 'Unauthorized' });
      }

      const userId = session.user.id;

      // Ensure the chat belongs to the user
      const chat = await prisma.chat.findUnique({
        where: { chat_id: chatId },
      });

      if (!chat || chat.user_id !== userId) {
        return res
          .status(404)
          .json({ success: false, message: 'Chat not found' });
      }

      // Delete chat and related messages
      await prisma.chatHistory.deleteMany({
        where: { chat_id: chatId },
      });

      await prisma.chat.delete({
        where: { chat_id: chatId },
      });

      res
        .status(200)
        .json({ success: true, message: 'Chat deleted successfully' });
    } catch (error) {
      console.error('Error deleting chat:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}
