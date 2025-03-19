import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prismaClient';
import { serverLogger } from '@/utils/serverLogger';
import { ModelName } from '@/types/ai.types';
import { DEFAULT_BRAINSTORM_SETTINGS } from '@/types/chat/settings';

interface ChatHistoryEntry {
  history_id: string;
  user_input: string | null;
  api_response: string | null;
  input_type: string | null;
  output_type: string | null;
  timestamp: Date;
  context_id: string;
  model: ModelName | null;
  credits_deducted: string | null;
}

interface ChatEntry {
  chat_id: string;
  chat_title: string;
  model: ModelName | null;
  updated_at: Date;
  chat_history: ChatHistoryEntry[];
  brainstorm_mode: boolean;
  brainstorm_settings: any;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    serverLogger.info('GetChats Session:', session);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const activeChats = await prisma.chat.findMany({
      where: {
        user_id: user.id,
        deleted: false,
      },
      select: {
        chat_id: true,
        chat_title: true,
        updated_at: true,
        brainstorm_mode: true,
        brainstorm_settings: true,
        chat_history: {
          orderBy: { timestamp: 'asc' },
          select: {
            history_id: true,
            user_input: true,
            api_response: true,
            timestamp: true,
            model: true,
            credits_deducted: true,
            input_type: true,
            output_type: true,
            context_id: true
          }
        }
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    serverLogger.info('Found chats:', { count: activeChats.length });

    const transformedChats = activeChats.map(chat => {
      // Get the last message with a model, or default to ChatGPT
      const lastModelUsed = chat.chat_history
        .slice()
        .reverse()
        .find(msg => msg.model)?.model || ModelName.ChatGPT;

      return {
        chat_id: chat.chat_id,
        chat_title: chat.chat_title,
        model: lastModelUsed,
        chat_history: chat.chat_history.map(msg => ({
          user_input: msg.user_input || '',
          api_response: msg.api_response || '',
          timestamp: msg.timestamp.toISOString(),
          model: msg.model || lastModelUsed,
          credits_deducted: msg.credits_deducted || "0",
          input_type: msg.input_type || 'text',
          output_type: msg.output_type || 'text',
          context_id: msg.context_id
        })),
        updated_at: chat.updated_at.toISOString(),
        brainstorm_mode: chat.brainstorm_mode || false,
        brainstorm_settings: chat.brainstorm_settings || DEFAULT_BRAINSTORM_SETTINGS
      };
    });

    return NextResponse.json({
      success: true,
      data: { activeChats: transformedChats }
    });

  } catch (error) {
    serverLogger.error('GetChats Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
