import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🔹 Request received at /api/saveChats');

  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ success: false, message: 'Method Not Allowed' });
  }

  const { chats } = req.body;

  if (!chats || !Array.isArray(chats)) {
    return res
      .status(400)
      .json({
        success: false,
        message: 'Chats data is required and should be an array',
      });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const savedChats = await Promise.all(
      chats.map(async (chat, index) => {
        try {
          const missingFields = [];

          if (!chat.chat_id) missingFields.push('chat_id');
          if (!chat.user_id) chat.user_id = session.user.id; // ✅ Ensure `user_id`
          if (!chat.chat_title) missingFields.push('chat_title');
          if (!chat.created_at) chat.created_at = new Date().toISOString(); // ✅ Default `created_at`
          if (!chat.updated_at) chat.updated_at = new Date().toISOString(); // ✅ Default `updated_at`
          if (typeof chat.deleted !== 'boolean') chat.deleted = false; // ✅ Default `deleted`

          if (missingFields.length > 0) {
            console.error(
              `❌ Chat ${index + 1} is missing fields:`,
              missingFields
            );
            throw new Error(
              `Chat ${index + 1} is missing required fields: ${missingFields.join(', ')}`
            );
          }

          const savedChat = await prisma.chat.upsert({
            where: { chat_id: chat.chat_id },
            update: {
              chat_title: chat.chat_title,
              updated_at: new Date(chat.updated_at),
              deleted: chat.deleted,
            },
            create: {
              chat_id: chat.chat_id,
              user_id: chat.user_id,
              chat_title: chat.chat_title,
              created_at: new Date(chat.created_at),
              updated_at: new Date(chat.updated_at),
              deleted: chat.deleted,
            },
          });

          // ✅ Handle chat messages and reordering
          if (chat.messages && Array.isArray(chat.messages)) {
            await Promise.all(
              chat.messages.map(async (message: any, messageIndex: number) => {
                // ✅ Log entire message object for debugging
                console.log(
                  '🔹 Full message object before validation:',
                  JSON.stringify(message, null, 2)
                );

                const missingMessageFields = [];

                // ✅ Ensure we check for both naming formats
                const messageInput = message.userInput || message.user_input;
                if (!messageInput || !messageInput.trim()) {
                  missingMessageFields.push('userInput');
                }
                if (!message.timestamp) {
                  missingMessageFields.push('timestamp');
                }

                if (missingMessageFields.length > 0) {
                  console.error(
                    `❌ Chat ${chat.chat_id} Message ${messageIndex + 1} is missing fields:`,
                    missingMessageFields
                  );
                  console.log(
                    '🔹 Full message data:',
                    JSON.stringify(message, null, 2)
                  ); // Log message structure
                  throw new Error(
                    `Chat ${chat.chat_id} Message ${messageIndex + 1} is missing required fields: ${missingMessageFields.join(', ')}`
                  );
                }

                await prisma.chatHistory.create({
                  data: {
                    chat_id: chat.chat_id,
                    user_input: messageInput,
                    api_response:
                      message.apiResponse || message.api_response || '', // Ensure default empty string
                    input_type:
                      message.inputType || message.input_type || 'Text',
                    output_type:
                      message.outputType || message.output_type || 'Text',
                    timestamp: new Date(message.timestamp),
                    context_id: message.contextId || message.context_id || '', // Ensure default empty string
                  },
                });
              })
            );

            // ✅ Move updated chat to top of the list
            chat.updated_at = new Date().toISOString();
          }

          return savedChat;
        } catch (err) {
          const error = err as Error;
          console.error(
            `❌ Error processing chat ${index + 1}:`,
            error.message
          );
          return null;
        }
      })
    );

    res.status(200).json({ success: true, data: savedChats.filter(Boolean) });
  } catch (err) {
    const error = err as Error;
    console.error('❌ Error saving chats:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
