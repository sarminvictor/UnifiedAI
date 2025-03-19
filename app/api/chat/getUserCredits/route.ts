import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prismaClient';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
      select: {
        id: true,
        credits_remaining: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      credits_remaining: user.credits_remaining || '0'
    });
  } catch (error) {
    console.error('Get credits error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}
