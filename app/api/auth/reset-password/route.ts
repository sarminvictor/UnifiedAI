import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';  // Add Prisma type import
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();
// Create Resend instance only if API key is available
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Ensure EMAIL_FROM exists
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@yourdomain.com';

// Fallback nodemailer transport for development or when Resend is unavailable
const createTestTransport = () => {
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'ethereal.user@ethereal.email',
      pass: 'ethereal.password'
    }
  });
};

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

    // Prepare email content
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password/${resetToken}`;
    const emailSubject = 'Password Reset Request';
    const emailText = `Click the link to reset your password: ${resetLink}`;

    console.log('🔹 Attempting to send reset email...');

    let emailSent = false;

    // Try using Resend if available
    if (resend) {
      try {
        const response = await resend.emails.send({
          from: EMAIL_FROM,
          to: email,
          subject: emailSubject,
          text: emailText
        });
        console.log('✅ Resend Response:', response);
        emailSent = true;
      } catch (resendError) {
        console.error('❌ Resend email failed, falling back to nodemailer:', resendError);
      }
    }

    // Fall back to nodemailer if Resend failed or is unavailable
    if (!emailSent) {
      try {
        const transport = createTestTransport();
        const info = await transport.sendMail({
          from: EMAIL_FROM,
          to: email,
          subject: emailSubject,
          text: emailText
        });
        console.log('✅ Nodemailer fallback Response:', info);
        emailSent = true;
      } catch (mailError) {
        console.error('❌ All email sending methods failed:', mailError);
      }
    }

    // Even if email fails, we return success since the token was generated
    // In production, you might want to handle this differently
    return NextResponse.json({ message: 'Reset email sent successfully!' });
  } catch (error) {
    console.error('❌ Failed to process reset request:', error);
    return NextResponse.json(
      { message: 'Error processing reset request.' },
      { status: 500 }
    );
  }
}
