import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';  // Add Prisma type import
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// Ensure EMAIL_FROM exists
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@yourdomain.com';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Generate a reset token
    const resetToken = Math.random().toString(36).substring(2, 15);

    // Update user with type casting
    await prisma.user.update({
      where: { email },
      data: {
        resetToken: resetToken
      } as Prisma.UserUpdateInput
    });

    console.log('🔹 Sending reset email via Resend API...');

    // Send reset email without debug mode
    const response = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request',
      text: `Click the link to reset your password: http://localhost:3000/auth/reset-password/${resetToken}`
    });

    console.log('✅ Resend Response:', response);

    return NextResponse.json({ message: 'Reset email sent successfully!' });
  } catch (error) {
    console.error('❌ Failed to send reset email:', error);
    return NextResponse.json(
      { message: 'Error sending reset email.' },
      { status: 500 }
    );
  }
}
