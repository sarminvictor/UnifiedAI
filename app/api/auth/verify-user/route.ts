import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json({ userExists: false });
  }

  return NextResponse.json({ userExists: true });
}
