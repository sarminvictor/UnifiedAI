import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prismaClient';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user first
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

    const usageLogs = await prisma.aPIUsageLog.findMany({
      where: { user_id: user.id },
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: {
        chat: {
          select: {
            chat_title: true,
            chat_history: {
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

    return NextResponse.json({ success: true, usageLogs });
  } catch (error) {
    console.error('Get usage logs error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch usage logs' },
      { status: 500 }
    );
  }
}
