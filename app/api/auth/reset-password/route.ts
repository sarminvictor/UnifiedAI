import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security reasons, don't disclose that the email doesn't exist
      // Still return a 200 OK to prevent user enumeration
      return NextResponse.json(
        {
          message: 'If your email is in our system, you will receive a password reset link shortly'
        },
        { status: 200 }
      );
    }

    // In a real implementation, you would:
    // 1. Generate a token and store it in the database
    // 2. Send an email with a link containing the token
    // 3. Create a page to handle the token and allow password reset

    // For now, just return a success message
    console.log(`Password reset requested for: ${email}`);

    return NextResponse.json(
      {
        message: 'If your email is in our system, you will receive a password reset link shortly'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
