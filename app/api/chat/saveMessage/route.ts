import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prismaClient';
import { serverLogger } from '@/utils/serverLogger';
import { ModelName } from '@/types/ai.types';
import { DEFAULT_BRAINSTORM_SETTINGS } from '@/types/chat/settings';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  serverLogger.info('🔹 Request received at /api/chat/saveMessage');

  try {
    const payload = await request.json();
    const { chatId, message, chatMetadata } = payload;

    if (!chatId || !message) {
      return NextResponse.json(
        { success: false, message: 'chatId and message are required' },
        { status: 400 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID from email
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

    // Ensure chat exists or create it
    let chat = await prisma.chat.findUnique({
      where: { chat_id: chatId },
      select: {
        chat_id: true,
        user_id: true,
        chat_title: true,
        brainstorm_mode: true,
        brainstorm_settings: true
      }
    });

    // If chat doesn't exist and we have metadata, create it
    if (!chat) {
      serverLogger.info('🔹 Chat not found, creating new chat:', {
        chatId,
        hasMetadata: !!chatMetadata
      });

      // Use provided metadata or defaults
      const chatTitle = chatMetadata?.chatTitle || 'New Chat';
      const brainstorm_mode = chatMetadata?.brainstorm_mode || false;

      // Use the provided brainstorm settings or defaults
      // This ensures we preserve custom settings like messagesLimit, customPrompt, etc.
      const brainstorm_settings = chatMetadata?.brainstorm_settings || DEFAULT_BRAINSTORM_SETTINGS;

      // Log the brainstorm settings being used
      serverLogger.info('🔹 Brainstorm settings being used:', {
        messagesLimit: brainstorm_settings.messagesLimit,
        customPromptLength: brainstorm_settings.customPrompt?.length,
        summaryModel: brainstorm_settings.summaryModel,
        additionalModel: brainstorm_settings.additionalModel,
        mainModel: brainstorm_settings.mainModel || message.model
      });

      // Ensure the model is included in brainstorm_settings
      if (message.model && brainstorm_settings) {
        brainstorm_settings.mainModel = message.model;
      }

      serverLogger.info('🔹 Creating chat with settings:', {
        chatId,
        chatTitle,
        brainstorm_mode,
        brainstorm_settings
      });

      // Create the chat
      chat = await prisma.chat.create({
        data: {
          chat_id: chatId,
          user_id: user.id,
          chat_title: chatTitle,
          chat_summary: chatTitle,
          created_at: new Date(),
          updated_at: new Date(),
          deleted: false,
          brainstorm_mode,
          brainstorm_settings
        }
      });

      serverLogger.info('✅ New chat created:', {
        chatId: chat.chat_id,
        title: chat.chat_title,
        brainstorm_mode: chat.brainstorm_mode,
        brainstorm_settings: chat.brainstorm_settings
      });
    }

    serverLogger.info('🔹 Saving message...');

    // Determine input_type and output_type based on brainstorm mode
    let inputType = message.inputType || 'text';
    let outputType = message.outputType || 'text';

    // If this is a brainstorm chat and it's a user message, set the output_type to 'brainstorm'
    if (chat.brainstorm_mode && message.userInput && !message.apiResponse) {
      // This is a user message in a brainstorm chat
      inputType = 'brainstorm';
      outputType = 'brainstorm';

      serverLogger.info('🔹 Setting message types for brainstorm mode:', {
        inputType,
        outputType,
        isBrainstormChat: true
      });
    }

    // Check if this is a combined message (has both user input and API response)
    // If so, split it into two separate messages
    if (message.userInput && message.apiResponse) {
      serverLogger.info('🔹 Splitting combined message into user message and AI response');

      // First save the user message
      const userMessage = await prisma.chatHistory.create({
        data: {
          chat_id: chat.chat_id,
          user_input: message.userInput,
          api_response: '',
          input_type: 'text',
          output_type: 'text',
          timestamp: new Date(message.timestamp || new Date().toISOString()),
          context_id: message.contextId || '',
          model: message.model,
          credits_deducted: '0',
        },
      });

      // Then save the AI response
      const aiMessage = await prisma.chatHistory.create({
        data: {
          chat_id: chat.chat_id,
          user_input: '',
          api_response: message.apiResponse,
          input_type: inputType,
          output_type: outputType,
          timestamp: new Date(new Date(message.timestamp || new Date().toISOString()).getTime() + 1000), // Add 1 second to ensure correct ordering
          context_id: message.contextId || '',
          model: message.model,
          credits_deducted: message.creditsDeducted || '0',
        },
      });

      serverLogger.info('✅ Split messages saved successfully:', {
        userMessage: userMessage.history_id,
        aiMessage: aiMessage.history_id
      });

      return NextResponse.json({
        success: true,
        data: {
          userInput: userMessage.user_input,
          apiResponse: aiMessage.api_response,
          inputType: aiMessage.input_type,
          outputType: aiMessage.output_type,
          timestamp: aiMessage.timestamp.toISOString(),
          contextId: aiMessage.context_id,
          chatId: chat.chat_id,
          model: aiMessage.model,
          isBrainstormChat: chat.brainstorm_mode
        }
      });
    }

    // Otherwise, save as a single message
    const savedMessage = await prisma.chatHistory.create({
      data: {
        chat_id: chat.chat_id,
        user_input: message.userInput,
        api_response: message.apiResponse || '',
        input_type: inputType,
        output_type: outputType,
        timestamp: new Date(message.timestamp || new Date().toISOString()),
        context_id: message.contextId || '',
        model: message.model, // Include the model in the message
        credits_deducted: message.creditsDeducted || '0',
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
        chatId: chat.chat_id,
        model: savedMessage.model,
        isBrainstormChat: chat.brainstorm_mode
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
