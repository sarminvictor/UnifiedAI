import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Request received at /api/saveChats');
  if (req.method === 'POST') {
    const { chats } = req.body;

    if (!chats || !Array.isArray(chats)) {
      return res
        .status(400)
        .json({ success: false, message: 'Chats data is required' });
    }

    try {
      const savedChats = await Promise.all(
        chats.map(async (chat: any) => {
          if (
            !chat.id ||
            !chat.userId ||
            !chat.name ||
            !chat.createdAt ||
            !chat.updatedAt
          ) {
            throw new Error('Missing required chat fields');
          }

          // Ensure user ID is correctly retrieved and used
          const savedChat = await prisma.chat.upsert({
            where: { chat_id: chat.id },
            update: {
              chat_title: chat.name,
              updated_at: new Date(chat.updatedAt),
              deleted: chat.deleted || false,
            },
            create: {
              chat_id: chat.id,
              user_id: chat.userId,
              chat_title: chat.name,
              created_at: new Date(chat.createdAt),
              updated_at: new Date(chat.updatedAt),
              deleted: chat.deleted || false,
            },
          });

          return savedChat;
        })
      );

      res.status(200).json({ success: true, data: savedChats });
    } catch (error) {
      console.error('Error saving chats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}
