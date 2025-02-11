import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🔹 Request received at /api/saveMessage');

  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Error connecting to the database:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Database connection error' });
  }

  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, message: 'Method Not Allowed' });
  }

  const { chatId, message } = req.body;

  if (!chatId || !message) {
    return res
      .status(400)
      .json({ success: false, message: 'chatId and message are required' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log(`🔹 Checking chat existence for chatId: ${chatId}`);

    let chat = await prisma.chat.findUnique({
      where: { chat_id: chatId },
    });

    if (!chat) {
      console.log(
        `⚠️ Chat not found, creating new chat with chatId: ${chatId}`
      );

      chat = await prisma.chat.create({
        data: {
          chat_id: chatId,
          chat_title: 'New Chat',
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted: false,
        },
      });
    } else {
      console.log(`✅ Chat found, updating timestamp for chatId: ${chatId}`);

      // ✅ Update `updated_at` field when a message is added
      await prisma.chat.update({
        where: { chat_id: chatId },
        data: {
          updated_at: new Date().toISOString(),
        },
      });
    }

    console.log('🔹 Saving message...');

    const missingFields = [];
    if (!message.userInput || !message.userInput.trim())
      missingFields.push('userInput');
    if (!message.timestamp) missingFields.push('timestamp');

    if (missingFields.length > 0) {
      console.error(
        `❌ Chat ${chatId} Message is missing fields:`,
        missingFields
      );
      throw new Error(
        `Chat ${chatId} Message is missing required fields: ${missingFields.join(', ')}`
      );
    }

    const savedMessage = await prisma.chatHistory.create({
      data: {
        chat_id: chat.chat_id,
        user_input: message.userInput,
        api_response: message.apiResponse || '', // Ensure default empty string
        input_type: message.inputType || 'Text',
        output_type: message.outputType || 'Text',
        timestamp: new Date(message.timestamp || new Date().toISOString()),
        context_id: message.contextId || '', // Ensure default empty string
      },
    });

    console.log('✅ Message saved successfully:', savedMessage);

    return res.status(200).json({
      success: true,
      data: {
        userInput: savedMessage.user_input,
        apiResponse: savedMessage.api_response,
        inputType: savedMessage.input_type,
        outputType: savedMessage.output_type,
        timestamp: savedMessage.timestamp.toISOString(),
        contextId: savedMessage.context_id,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('❌ Error saving message:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
