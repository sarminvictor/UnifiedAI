import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Accept test user ID header in non-production environments
    const testUserId = process.env.NODE_ENV !== 'production' ? 
      req.headers['x-test-user-id'] as string : 
      undefined;

    const session = testUserId ? 
      { user: { id: testUserId } } : 
      await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res
        .status(401)
        .json({ success: false, message: 'User ID not found' });
    }

    // ✅ Only fetch non-deleted chats
    const activeChats = await prisma.chat.findMany({
      where: {
        user_id: session.user.id,
        deleted: false, // Only get non-deleted chats
      },
      include: {
        chat_history: {
          orderBy: {
            timestamp: 'asc',
          },
          distinct: ['timestamp'], // Ensure no duplicate messages
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    console.log(`✅ Found ${activeChats.length} active chats for user ${session.user.id}`);

    // Transform the data to match the frontend structure
    const transformedChats = activeChats.map((chat) => ({
      ...chat,
      messages: chat.chat_history
        .filter(
          (msg, index, self) =>
            // Additional deduplication by timestamp
            index ===
            self.findIndex(
              (m) => m.timestamp.getTime() === msg.timestamp.getTime()
            )
        )
        .map((msg) => ({
          userInput: msg.user_input,
          apiResponse: msg.api_response,
          inputType: msg.input_type,
          outputType: msg.output_type,
          timestamp: msg.timestamp.toISOString(),
          contextId: msg.context_id,
        })),
    }));

    res.status(200).json({
      success: true,
      data: { activeChats: transformedChats },
    });
  } catch (error) {
    console.error('❌ Error fetching chats:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message
    });
  }
}
