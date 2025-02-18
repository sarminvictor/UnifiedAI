import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { chatId } = req.query;

    const chat = await prisma.chat.findFirst({
      where: {
        chat_id: chatId as string,
        user_id: session.user.id,
        deleted: false,
      },
      include: {
        chat_history: {
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Transform chat data
    const transformedChat = {
      chat_id: chat.chat_id,
      chat_title: chat.chat_title,
      model: chat.chat_history[0]?.model || "ChatGPT",
      updated_at: chat.updated_at.toISOString(),
      messages: chat.chat_history.map(msg => ({
        userInput: msg.user_input || '',
        apiResponse: msg.api_response || '',
        inputType: msg.input_type || 'Text',
        outputType: msg.output_type || 'Text',
        timestamp: msg.timestamp.toISOString(),
        contextId: msg.context_id,
        model: msg.model,
        tokensUsed: "0",
        creditsDeducted: msg.credits_deducted || "0"
      }))
    };

    return res.status(200).json({
      success: true,
      data: transformedChat
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
