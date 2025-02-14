import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/auth.config';
import prisma from '@/lib/prismaClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log(`🔹 Fetching usage logs for user ${session.user.id}`);

    const usageLogs = await prisma.aPIUsageLog.findMany({
      where: { user_id: session.user.id },
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: {
        chat: {
          select: {
            chat_title: true,
            chat_history: {
              where: {
                history_id: {
                  in: { 
                    // Type assertion for messages_used as string[]
                    path: ['messages_used'],
                    array_contains: [] 
                  }
                }
              },
              select: {
                history_id: true,
                user_input: true,
                api_response: true,
                timestamp: true,
                model: true,
                credits_deducted: true
              }
            }
          }
        }
      }
    });

    console.log(`✅ Found ${usageLogs.length} usage logs`);

    return res.status(200).json({
      success: true,
      usageLogs
    });

  } catch (error) {
    console.error('❌ Error fetching usage logs:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message
    });
  }
}
