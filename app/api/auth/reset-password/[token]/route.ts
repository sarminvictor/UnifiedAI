import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';  // Add Prisma type import
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { password } = await req.json();
    console.log('Incoming reset request for token:', params.token);

    // Check if token is provided
    if (!params.token) {
      console.error('No token provided!');
      return NextResponse.json(
        { message: 'Token is required.' },
        { status: 400 }
      );
    }

    // Find user by reset token using string comparison
    const user = await prisma.user.findFirst({
      where: {
        resetToken: {
          equals: params.token,
        }
      } as Prisma.UserWhereInput
    });

    if (!user) {
      console.error('Invalid or expired token:', params.token);
      return NextResponse.json(
        { message: 'Invalid or expired reset token.' },
        { status: 400 }
      );
    }

    console.log('User found:', user.email);

    // Check if password is provided
    if (!password || password.length < 6) {
      console.error('Invalid password');
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Hash new password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Hashed password:', hashedPassword);

    // Update password & reset token with type casting
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null
      } as Prisma.UserUpdateInput
    });

    console.log('Password reset successful for user:', user.email);
    return NextResponse.json({ message: 'Password successfully updated!' });
  } catch (error: unknown) {
    console.error('Error resetting password:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { message: 'Error resetting password.', error: errorMessage },
      { status: 500 }
    );
  }
}
