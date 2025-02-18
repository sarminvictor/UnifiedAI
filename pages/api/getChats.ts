import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';
import { formatNumber } from '@/utils/apiClient';
import { Decimal } from '@prisma/client/runtime/library';
import type { Chat, ChatHistory } from '@prisma/client';

// Add helper function to safely convert Decimal to number
const safeDecimalToNumber = (decimal: Decimal | null): number => {
  if (!decimal) return 0;
  return decimal.toNumber();
};

// Define the Prisma response type
type PrismaChat = {
  chat_id: string;
  chat_title: string;
  model?: string | null;
  updated_at: Date;
  chat_history: Array<{
    history_id: string;
    user_input: string | null;
    api_response: string | null;
    input_type: string | null;
    output_type: string | null;
    timestamp: Date;
    context_id: string;
    model: string | null;
    credits_deducted: Decimal | null;
  }>;
};

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

    // ✅ Only fetch non-deleted chats
    const activeChats = await prisma.chat.findMany({
      where: {
        user_id: session.user.id,
        deleted: false,
      },
      include: {
        chat_history: true // Simplified include
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    console.log('Found chats:', activeChats.length);

    // Transform with proper typing
    const transformedChats = activeChats.map((chat: PrismaChat) => ({
      chat_id: chat.chat_id,
      chat_title: chat.chat_title,
      model: chat.model || "ChatGPT", // Now TypeScript knows model can be null
      updated_at: chat.updated_at.toISOString(),
      messages: chat.chat_history.map(msg => ({
        userInput: msg.user_input || '',
        apiResponse: msg.api_response || '',
        inputType: msg.input_type || 'Text',
        outputType: msg.output_type || 'Text',
        timestamp: msg.timestamp.toISOString(),
        contextId: msg.context_id,
        model: msg.model,
        tokensUsed: 0, // Default value since we're not displaying it
        creditsDeducted: formatNumber.credits(safeDecimalToNumber(msg.credits_deducted))
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
