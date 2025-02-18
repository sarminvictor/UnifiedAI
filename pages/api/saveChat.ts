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

    const { chatId, chatTitle } = req.body;

    // Remove model field and only update/create necessary fields
    const chat = await prisma.chat.upsert({
      where: { chat_id: chatId },
      update: { 
        chat_title: chatTitle,
        updated_at: new Date()
      },
      create: {
        chat_id: chatId,
        chat_title: chatTitle,
        user_id: session.user.id,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false,
        chat_summary: null
      },
    });

    return res.status(200).json({ success: true, data: chat });
  } catch (error) {
    console.error('Save chat error:', error);
    return res.status(500).json({ 
      success: false, 
      message: (error as Error).message 
    });
  }
}
