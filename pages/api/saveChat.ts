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

    const { chatId, chatTitle } = req.body;

    console.log(`🔹 Saving chat with ID: ${chatId}, Title: ${chatTitle}, User ID: ${session.user.id}`);

    // Check if the chat exists
    let chat = await prisma.chat.findUnique({
      where: { chat_id: chatId },
    });

    if (!chat) {
      // Create the chat if it does not exist
      chat = await prisma.chat.create({
        data: {
          chat_id: chatId,
          chat_title: chatTitle,
          user_id: session.user.id,
          created_at: new Date(),
          updated_at: new Date(),
          deleted: false,
        },
      });
      console.log('✅ Chat created successfully:', chat);
    } else {
      // Update the chat if it exists
      chat = await prisma.chat.update({
        where: { chat_id: chatId },
        data: {
          chat_title: chatTitle,
          updated_at: new Date(),
        },
      });
      console.log('✅ Chat updated successfully:', chat);
    }

    res.status(200).json({ success: true, data: chat });

  } catch (error) {
    console.error('❌ Error saving chat:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}
