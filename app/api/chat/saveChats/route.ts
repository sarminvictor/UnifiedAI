import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import prisma from '@/lib/prismaClient';

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

    const { chats } = await request.json();

    if (!Array.isArray(chats)) {
      return NextResponse.json(
        { success: false, message: 'Invalid input: chats must be an array' },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      chats.map(chat => 
        prisma.chat.upsert({
          where: { 
            chat_id: chat.chat_id,
          },
          update: {
            chat_title: chat.chat_title,
            updated_at: new Date(),
            ...chat
          },
          create: {
            chat_id: chat.chat_id,
            chat_title: chat.chat_title || 'New Chat',
            user_id: user.id,  // Use retrieved user.id
            created_at: new Date(),
            updated_at: new Date(),
            deleted: false
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Save chats error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save chats' },
      { status: 500 }
    );
  }
}
