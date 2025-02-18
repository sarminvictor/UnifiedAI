import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';

const generateSummary = (messages: any[]): string => {
  if (messages.length === 0) return "New Chat";
  
  // Use the first few messages to create a summary
  const firstUserMessage = messages.find(m => m.user_input)?.user_input;
  if (firstUserMessage) {
    // Truncate to reasonable length and clean up
    return firstUserMessage
      .substring(0, 50)
      .trim()
      .replace(/[\n\r]/g, ' ') + 
      (firstUserMessage.length > 50 ? '...' : '');
  }
  
  return "Chat";
};

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

    // Get existing chat with its current summary
    const existingChat = await prisma.chat.findUnique({
      where: { chat_id: chatId },
      select: {
        chat_summary: true,
        chat_history: {
          select: {
            user_input: true,
            api_response: true
          },
          orderBy: {
            timestamp: 'asc'
          },
          take: 3
        }
      }
    });

    // Only generate new summary if chat doesn't exist or has no summary
    const chatSummary = existingChat?.chat_summary || 
      (existingChat ? generateSummary(existingChat.chat_history) : "New Chat");

    // Update or create chat preserving existing summary
    const chat = await prisma.chat.upsert({
      where: { chat_id: chatId },
      update: { 
        chat_title: chatTitle,
        // Only update summary if it doesn't exist
        ...(existingChat?.chat_summary ? {} : { chat_summary: chatSummary }),
        updated_at: new Date()
      },
      create: {
        chat_id: chatId,
        chat_title: chatTitle,
        user_id: session.user.id,
        chat_summary: chatSummary,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false
      },
    });

    return res.status(200).json({ success: true, data: chat });
  } catch (error) {
    console.error('Save chat error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
}
