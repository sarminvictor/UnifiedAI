import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Request received at /api/saveMessage');
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Error connecting to the database:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Database connection error' });
  }

  if (req.method === 'POST') {
    const { chatId, message } = req.body;

    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      let chat = await prisma.chat.findUnique({
        where: { chat_id: chatId },
      });

      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            chat_id: chatId,
            chat_title: 'New Chat',
            user_id: session.user.id,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      const savedMessage = await prisma.chatHistory.create({
        data: {
          chat: { connect: { chat_id: chatId } },
          user_input: message.userInput,
          api_response: message.apiResponse,
          input_type: message.inputType,
          output_type: message.outputType,
          timestamp: new Date(message.timestamp),
          context_id: message.contextId,
        },
      });

      return res.status(200).json({ success: true, data: savedMessage });
    } catch (error) {
      console.error('Error saving message:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' });
  }
}
