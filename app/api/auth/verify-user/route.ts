import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ userExists: false }, { status: 400 });
    }

    // Check if user exists (case insensitive)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email.toLowerCase(),
          mode: 'insensitive',
        }
      },
      select: {
        id: true,
      }
    });

    return NextResponse.json({
      userExists: Boolean(user),
      userId: user?.id || null
    });

  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json({
      userExists: false,
      error: 'Error verifying user'
    }, { status: 500 });
  }
}
