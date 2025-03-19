import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prismaClient';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const { chatId } = await request.json();

    const updatedChat = await prisma.chat.update({
      where: { 
        chat_id: chatId,
        user_id: user.id // Ensure chat belongs to user
      },
      data: { deleted: false }
    });

    return NextResponse.json({ success: true, data: updatedChat });
  } catch (error) {
    console.error('Restore chat error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to restore chat' },
      { status: 500 }
    );
  }
}
