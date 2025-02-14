import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { chats } = req.body;
    if (!Array.isArray(chats)) {
      return res.status(400).json({ success: false, message: 'chats must be an array' });
    }

    console.log(`🔹 Saving ${chats.length} chats for user ${session.user.id}`);

    const results = await Promise.all(
      chats.map(async (chat) => {
        try {
          const existingChat = await prisma.chat.findUnique({
            where: { chat_id: chat.chat_id },
          });

          if (existingChat) {
            // Update existing chat
            return await prisma.chat.update({
              where: { chat_id: chat.chat_id },
              data: {
                chat_title: chat.chat_title,
                updated_at: new Date(),
              },
            });
          } else {
            // Create new chat
            return await prisma.chat.create({
              data: {
                chat_id: chat.chat_id,
                chat_title: chat.chat_title || 'New Chat',
                user_id: session.user.id,
                created_at: new Date(),
                updated_at: new Date(),
                deleted: false,
              },
            });
          }
        } catch (error) {
          console.error(`❌ Error saving chat ${chat.chat_id}:`, error);
          return null;
        }
      })
    );

    const successfulSaves = results.filter(Boolean);
    console.log(`✅ Successfully saved ${successfulSaves.length} chats`);

    return res.status(200).json({
      success: true,
      savedCount: successfulSaves.length,
      data: successfulSaves,
    });

  } catch (error) {
    console.error('❌ Error in save chats handler:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message,
    });
  }
}
