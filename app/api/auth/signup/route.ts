import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = email.toLowerCase();
    console.log('Attempting to create user:', normalizedEmail);

    // Check if user already exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      }
    });

    if (existingUser) {
      console.log('Existing user found:', existingUser);
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user with normalized email
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        credits_remaining: '0',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log('User created successfully:', normalizedEmail);
    return NextResponse.json({
      id: user.id,
      email: user.email,
    }, { status: 200 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Error creating account' },
      { status: 500 }
    );
  }
}
