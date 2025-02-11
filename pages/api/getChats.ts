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
        chat_history: {
          orderBy: {
            timestamp: 'asc'
          },
          distinct: ['timestamp'] // Ensure no duplicate messages
        }
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    // Transform the data to match the frontend structure
    const transformedChats = activeChats.map(chat => ({
      ...chat,
      messages: chat.chat_history
        .filter((msg, index, self) => 
          // Additional deduplication by timestamp
          index === self.findIndex(m => m.timestamp.getTime() === msg.timestamp.getTime())
        )
        .map(msg => ({
          userInput: msg.user_input,
          apiResponse: msg.api_response,
          inputType: msg.input_type,
          outputType: msg.output_type,
          timestamp: msg.timestamp.toISOString(),
          contextId: msg.context_id
        }))
    }));

    res.status(200).json({ 
      success: true, 
      data: { activeChats: transformedChats } 
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
