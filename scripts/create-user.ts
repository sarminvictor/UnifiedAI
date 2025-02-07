// scripts/create-test-user.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    // Delete existing test user if exists
    await prisma.user.deleteMany({
      where: {
        email: 'test@test.com',
      },
    });

    // Create new test user
    const hashedPassword = await bcrypt.hash('test123', 10);

    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        password: hashedPassword,
      },
    });

    console.log('Created test user:', {
      email: user.email,
      id: user.id,
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
