import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prismaClient';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function GET() {
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

    const subscription = await prisma.subscription.findFirst({
      where: { 
        user_id: user.id,
        status: 'Active'
      },
      include: { plan: true }
    });

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Get user plan error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user plan' },
      { status: 500 }
    );
  }
}
