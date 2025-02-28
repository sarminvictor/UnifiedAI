import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prismaClient';
import { addConnection, removeConnection } from '@/utils/sse';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Keep-Alive': 'timeout=120, max=1000'
    });

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Send initial heartbeat
    writer.write(encoder.encode(': heartbeat\n\n'));

    // Setup periodic heartbeat
    const heartbeatInterval = setInterval(async () => {
      try {
        await writer.write(encoder.encode(': heartbeat\n\n'));
      } catch (error) {
        console.error('Heartbeat failed:', error);
        clearInterval(heartbeatInterval);
      }
    }, 30000); // Every 30 seconds

    // Handle connection cleanup
    request.signal.addEventListener('abort', () => {
      clearInterval(heartbeatInterval);
      removeConnection(user.id);
      writer.close();
      console.log(`🔄 Clean disconnect for user: ${user.id}`);
    });

    // Add connection to the map
    addConnection(user.id, writer);

    // Send initial state
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        user_id: user.id,
        OR: [{ status: "Active" }, { status: "Pending Downgrade" }]
      },
      include: { plan: true },
      orderBy: { created_at: 'desc' }
    });

    const initialState = {
      type: 'subscription_updated',
      details: {
        planName: currentSubscription?.plan.plan_name || 'Free',
        planId: currentSubscription?.plan_id,
        isDowngradePending: currentSubscription?.status === 'Pending Downgrade',
        renewalDate: currentSubscription?.end_date,
        creditsRemaining: user.credits_remaining
      }
    };

    writer.write(encoder.encode(`data: ${JSON.stringify(initialState)}\n\n`));

    return new Response(stream.readable, { headers });
  } catch (error) {
    console.error('SSE Setup Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
