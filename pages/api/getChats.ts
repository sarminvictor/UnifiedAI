import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'User ID not found' });
    }

    const activeChats = await prisma.chat.findMany({
      where: { 
        user_id: session.user.id,
        deleted: false 
      },
      include: {
        chat_history: true
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    res.status(200).json({ 
      success: true, 
      data: { activeChats } 
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
