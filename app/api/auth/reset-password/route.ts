import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Generate a reset token
    const resetToken = Math.random().toString(36).substring(2, 15);

    // Save reset token in the database
    await prisma.user.update({
      where: { email },
      data: { resetToken },
    });

    console.log('🔹 Sending reset email via Resend API...');

    // Send reset email with debug mode enabled
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request',
      text: `Click the link to reset your password: http://localhost:3000/auth/reset-password/${resetToken}`,
      debug: true, // ✅ Enables detailed logging
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
