import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '@/lib/prismaClient'; // Use absolute import

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession({ req });

  if (!session || !session.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const userId = session.user.id as string | undefined; // Ensure 'id' is treated as a string or undefined
  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: 'User ID not found' });
  }

  if (req.method === 'POST') {
    const { chatId } = req.body;

    try {
      // Ensure the chat belongs to the user
      const chat = await prisma.chat.findUnique({
        where: { chat_id: chatId },
      });

      if (!chat || chat.user_id !== userId) {
        return res
          .status(404)
          .json({ success: false, message: 'Chat not found' });
      }

      // Restore chat
      await prisma.chat.update({
        where: { chat_id: chatId },
        data: { deleted: false },
      });

      res
        .status(200)
        .json({ success: true, message: 'Chat restored successfully' });
    } catch (error) {
      console.error(
        'Error restoring chat:',
        error instanceof Error ? error.message : error
      );
      res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
};
