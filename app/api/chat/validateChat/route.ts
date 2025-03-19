import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prismaClient';
import { serverLogger } from '@/utils/serverLogger';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, reason: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const chatId = request.nextUrl.searchParams.get('chatId');
    if (!chatId) {
      return NextResponse.json(
        { success: false, reason: 'INVALID_PARAMS', message: 'Chat ID is required' },
        { status: 400 }
      );
    }

    serverLogger.info('Validating chat:', { chatId });

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, reason: 'UNAUTHORIZED', message: 'User not found' },
        { status: 401 }
      );
    }

    // Check chat existence and ownership
    const chat = await prisma.chat.findFirst({
      where: {
        chat_id: chatId,
        user_id: user.id,
      }
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, reason: 'NOT_FOUND', message: 'Chat not found' },
        { status: 404 }
      );
    }

    if (chat.deleted) {
      return NextResponse.json(
        { success: false, reason: 'DELETED', message: 'Chat has been deleted' },
        { status: 410 }  // 410 Gone
      );
    }

    // Chat exists and user has access
    return NextResponse.json({
      success: true,
      data: { 
        chatId: chat.chat_id,
        chatTitle: chat.chat_title
      }
    });

  } catch (error) {
    serverLogger.error('Validate chat error:', error);
    return NextResponse.json(
      { success: false, reason: 'SERVER_ERROR', message: 'Failed to validate chat' },
      { status: 500 }
    );
  }
}
