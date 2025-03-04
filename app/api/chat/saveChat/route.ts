import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prismaClient';
import { ModelName } from '@/types/ai.types';

const generateSummary = (messages: any[]): string => {
  if (messages.length === 0) return "New Chat";
  const firstUserMessage = messages.find(m => m.user_input)?.user_input;
  if (firstUserMessage) {
    return firstUserMessage
      .substring(0, 50)
      .trim()
      .replace(/[\n\r]/g, ' ') +
      (firstUserMessage.length > 50 ? '...' : '');
  }
  return "Chat";
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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

    const { chatId, chatTitle, initialSetup } = await request.json();

    // If it's an initial setup without a message, return without creating
    if (initialSetup === false) {
      return NextResponse.json({
        success: true,
        data: {
          chat_id: chatId,
          chat_title: chatTitle,
          chat_history: [],
          model: ModelName.ChatGPT,
          updated_at: new Date().toISOString()
        }
      });
    }

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
          orderBy: { timestamp: 'asc' },
          take: 3
        }
      }
    });

    // Only generate new summary if chat doesn't exist or has no summary
    const chatSummary = existingChat?.chat_summary ||
      (existingChat ? generateSummary(existingChat.chat_history) : "New Chat");

    const chat = await prisma.chat.upsert({
      where: { chat_id: chatId },
      update: {
        chat_title: chatTitle,
        updated_at: new Date(),
        ...(existingChat?.chat_summary ? {} : { chat_summary: chatSummary }),
      },
      create: {
        chat_id: chatId,
        chat_title: chatTitle,
        user_id: user.id,
        chat_summary: chatSummary,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false
      }
    });

    return NextResponse.json({ success: true, data: chat });
  } catch (error) {
    console.error('Save chat error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save chat' },
      { status: 500 }
    );
  }
}
