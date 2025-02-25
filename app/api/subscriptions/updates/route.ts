import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            subscriptions: {
              where: { status: 'Active' },
              orderBy: { start_date: 'desc' },
              take: 1,
              include: {
                plan: true
              }
            }
          }
        });

        const currentPlanId = user?.subscriptions[0]?.plan_id || null;

        controller.enqueue(`data: ${JSON.stringify({ currentPlan: currentPlanId })}\n\n`);
      };

      // Send an initial update
      await sendUpdate();

      // Set up a timer to send updates every 10 seconds
      const interval = setInterval(sendUpdate, 10000);

      // Clean up the interval when the connection is closed
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
