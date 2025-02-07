import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    console.log('Received email:', email); // Log the received email

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user in the database
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });
    console.log('User created:', user); // Log the created user object

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error signing up:', error);
    return NextResponse.json({ message: 'Error signing up' }, { status: 500 });
  }
}
