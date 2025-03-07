import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prismaClient';
import { ModelName } from '@/types/ai.types';
import { DEFAULT_BRAINSTORM_SETTINGS, BrainstormSettings } from '@/types/chat/settings';
import { Prisma } from '@prisma/client';

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

// Helper function to safely log brainstorm settings
const logSettings = (settings: any) => {
  if (!settings) return null;

  try {
    return {
      messagesLimit: settings.messagesLimit,
      customPromptLength: settings.customPrompt?.length,
      summaryModel: settings.summaryModel,
      additionalModel: settings.additionalModel,
      mainModel: settings.mainModel
    };
  } catch (e) {
    return 'Error parsing settings';
  }
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

    const {
      chatId,
      chatTitle,
      initialSetup,
      brainstorm_mode,
      brainstorm_settings,
      model
    } = await request.json();

    console.log('saveChat API received request:', {
      chatId,
      chatTitle,
      initialSetup,
      brainstorm_mode,
      brainstorm_settings: logSettings(brainstorm_settings),
      model
    });

    // If it's an initial setup without a message, return without creating
    if (initialSetup === false) {
      // If model is provided, include it in brainstorm_settings
      const settings = brainstorm_settings || DEFAULT_BRAINSTORM_SETTINGS;
      if (model) {
        settings.mainModel = model;
      }

      console.log('Initial setup settings:', logSettings(settings));

      return NextResponse.json({
        success: true,
        data: {
          chat_id: chatId,
          chat_title: chatTitle,
          chat_history: [],
          updated_at: new Date().toISOString(),
          brainstorm_mode: brainstorm_mode || false,
          brainstorm_settings: settings
        }
      });
    }

    // Get existing chat with its current summary and title
    const existingChat = await prisma.chat.findUnique({
      where: { chat_id: chatId },
      select: {
        chat_title: true,
        chat_summary: true,
        brainstorm_mode: true,
        brainstorm_settings: true,
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

    console.log('Existing chat found:', {
      chatId,
      exists: !!existingChat,
      title: existingChat?.chat_title,
      brainstorm_mode: existingChat?.brainstorm_mode,
      brainstorm_settings: logSettings(existingChat?.brainstorm_settings)
    });

    // Only generate new summary if chat doesn't exist or has no summary
    const chatSummary = existingChat?.chat_summary ||
      (existingChat ? generateSummary(existingChat.chat_history) : "New Chat");

    // Prepare update data
    const updateData: any = {
      updated_at: new Date(),
      ...(existingChat?.chat_summary ? {} : { chat_summary: chatSummary }),
    };

    // Only update chat_title if it's provided
    if (chatTitle !== undefined) {
      updateData.chat_title = chatTitle;
    }

    // Only update brainstorm fields if they are provided
    if (brainstorm_mode !== undefined) {
      updateData.brainstorm_mode = brainstorm_mode;
    }

    // Handle brainstorm_settings and model
    if (brainstorm_settings !== undefined || model !== undefined) {
      // Start with existing settings or default
      const baseSettings = brainstorm_settings || existingChat?.brainstorm_settings || DEFAULT_BRAINSTORM_SETTINGS;

      // Log the settings being used
      console.log('Base settings:', logSettings(baseSettings));

      // If model is provided, include it in the settings
      if (model !== undefined) {
        updateData.brainstorm_settings = {
          ...baseSettings,
          mainModel: model
        };
      } else {
        updateData.brainstorm_settings = baseSettings;
      }

      console.log('Final update data brainstorm_settings:', logSettings(updateData.brainstorm_settings));
    }

    // For create operation, we need to ensure chat_title is provided
    const createTitle = chatTitle || existingChat?.chat_title || "New Chat";

    // Prepare brainstorm settings for create operation
    let createBrainstormSettings = brainstorm_settings || DEFAULT_BRAINSTORM_SETTINGS;
    if (model) {
      createBrainstormSettings = {
        ...createBrainstormSettings,
        mainModel: model
      };
    }

    // Log the settings being used for create
    console.log('Create settings:', logSettings(createBrainstormSettings));

    console.log('Performing upsert operation:', {
      chatId,
      isUpdate: !!existingChat,
      updateData: {
        ...updateData,
        brainstorm_settings: logSettings(updateData.brainstorm_settings)
      }
    });

    const chat = await prisma.chat.upsert({
      where: { chat_id: chatId },
      update: updateData,
      create: {
        chat_id: chatId,
        chat_title: createTitle,
        user_id: user.id,
        chat_summary: chatSummary,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false,
        brainstorm_mode: brainstorm_mode || false,
        brainstorm_settings: createBrainstormSettings as Prisma.InputJsonValue
      }
    });

    console.log('Chat saved successfully:', {
      chatId: chat.chat_id,
      title: chat.chat_title,
      brainstorm_mode: chat.brainstorm_mode,
      brainstorm_settings: logSettings(chat.brainstorm_settings)
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
