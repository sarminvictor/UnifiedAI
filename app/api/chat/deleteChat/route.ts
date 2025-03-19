import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prismaClient';
import { serverLogger } from '@/utils/serverLogger';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { chatId } = data;

    // Improved error logging
    serverLogger.info('Delete chat request:', { chatId, userEmail: session.user.email });

    if (!chatId) {
      serverLogger.error('Missing chatId in delete request');
      return NextResponse.json(
        { success: false, message: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // First verify chat exists and user owns it
    const chat = await prisma.chat.findFirst({
      where: {
        chat_id: chatId,
        user: {
          email: session.user.email
        }
      }
    });

    if (!chat) {
      serverLogger.error('Chat not found or access denied:', { chatId });
      return NextResponse.json(
        { success: false, message: 'Chat not found or access denied' },
        { status: 404 }
      );
    }

    // Perform soft delete
    const deletedChat = await prisma.chat.update({
      where: { chat_id: chatId },
      data: { deleted: true }
    });

    serverLogger.info('Chat deleted successfully:', { chatId });
    return NextResponse.json({ 
      success: true,
      data: { chatId: deletedChat.chat_id }
    });

  } catch (error) {
    serverLogger.error('Delete chat error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete chat',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
