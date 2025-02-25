import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prismaClient';
import { serverLogger } from '@/utils/serverLogger';

export async function POST(request: NextRequest) {
  serverLogger.info('🔹 Request received at /api/chat/saveMessage');

  try {
    const payload = await request.json();
    const { chatId, message } = payload;

    if (!chatId || !message) {
      return NextResponse.json(
        { success: false, message: 'chatId and message are required' },
        { status: 400 }
      );
    }

    // Accept test user ID header in non-production environments
    const testUserId = process.env.NODE_ENV !== 'production' ? 
      request.headers.get('x-test-user-id') : 
      undefined;

    const session = testUserId ? 
      { user: { id: testUserId } } : 
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate message first
    const missingFields = [];
    if (!message.userInput?.trim()) missingFields.push('userInput');
    if (!message.timestamp) missingFields.push('timestamp');

    if (missingFields.length > 0) {
      const errorMessage = `Chat ${chatId} Message is missing required fields: ${missingFields.join(', ')}`;
      serverLogger.error(`❌ ${errorMessage}`);
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 400 }
      );
    }

    // Ensure chat exists
    let chat = await prisma.chat.findUnique({
      where: { chat_id: chatId }
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, message: 'Chat not found. Please create chat first.' },
        { status: 404 }
      );
    }

    serverLogger.info('🔹 Saving message...');

    const savedMessage = await prisma.chatHistory.create({
      data: {
        chat_id: chat.chat_id,
        user_input: message.userInput,
        api_response: message.apiResponse || '',
        input_type: message.inputType || 'Text',
        output_type: message.outputType || 'Text',
        timestamp: new Date(message.timestamp || new Date().toISOString()),
        context_id: message.contextId || '',
        credits_deducted: '0',
      },
    });

    serverLogger.info('✅ Message saved successfully:', savedMessage);

    return NextResponse.json({
      success: true,
      data: {
        userInput: savedMessage.user_input,
        apiResponse: savedMessage.api_response,
        inputType: savedMessage.input_type,
        outputType: savedMessage.output_type,
        timestamp: savedMessage.timestamp.toISOString(),
        contextId: savedMessage.context_id,
      }
    });

  } catch (error) {
    serverLogger.error('❌ Error saving message:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to save message',
        details: process.env.NODE_ENV === 'development' ? 
          error instanceof Error ? error.message : 'Unknown error'
          : undefined
      },
      { status: 500 }
    );
  }
}
