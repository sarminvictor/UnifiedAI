import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prismaClient';
import { DEFAULT_BRAINSTORM_SETTINGS } from '@/types/chat/settings';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { success: false, message: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Get user first
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

    // Get chat with validation that it belongs to the user
    const chat = await prisma.chat.findFirst({
      where: {
        chat_id: chatId,
        user_id: user.id
      },
      select: {
        chat_id: true,
        user_id: true,
        chat_title: true,
        created_at: true,
        updated_at: true,
        deleted: true,
        chat_summary: true,
        brainstorm_mode: true,
        brainstorm_settings: true,
        chat_history: {
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
      }
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, message: 'Chat not found' },
        { status: 404 }
      );
    }

    // Transform the response to include default values for brainstorm fields if they don't exist
    const transformedChat = {
      ...chat,
      brainstorm_mode: chat.brainstorm_mode || false,
      brainstorm_settings: chat.brainstorm_settings || DEFAULT_BRAINSTORM_SETTINGS
    };

    return NextResponse.json({ success: true, data: transformedChat });
  } catch (error) {
    console.error('Get chat error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch chat'
      },
      { status: 500 }
    );
  }
}
