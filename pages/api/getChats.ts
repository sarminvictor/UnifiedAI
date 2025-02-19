import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';
import { formatCredits } from '@/utils/format';
import type { Prisma } from '@prisma/client';

interface ChatHistoryEntry {
  history_id: string;
  user_input: string | null;
  api_response: string | null;
  input_type: string | null;
  output_type: string | null;
  timestamp: Date;
  context_id: string;
  model: string | null;
  credits_deducted: string | null;
}

interface ChatEntry {
  chat_id: string;
  chat_title: string;
  model: string | null;
  updated_at: Date;
  chat_history: ChatHistoryEntry[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
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
      return res
        .status(401)
        .json({ success: false, message: 'User ID not found' });
    }

    const activeChats = await prisma.chat.findMany({
      where: {
        user_id: session.user.id,
        deleted: false,
      },
      include: {
        chat_history: {
          orderBy: { timestamp: 'desc' }
        }
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    // Transform with proper typing and limited messages
    const transformedChats = activeChats.map((chat: ChatEntry) => ({
      chat_id: chat.chat_id,
      chat_title: chat.chat_title,
      model: chat.chat_history[0]?.model || "ChatGPT",
      updated_at: chat.updated_at.toISOString(),
      messages: chat.chat_history
        .reverse() // Reverse to get chronological order
        .map((msg: ChatHistoryEntry) => ({
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
    }));

    return res.status(200).json({
      success: true,
      data: { activeChats: transformedChats }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? `${(error as Error).message}\n${(error as Error).stack}`
        : 'Internal server error'
    });
  }
}
