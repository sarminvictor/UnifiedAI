import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

// Define the global type for Prisma
const globalForPrisma = global as unknown as {
    prisma: PrismaClient | undefined;
};

// Create a new Prisma client instance
// Note: Engine type is handled via environment variables in vercel.json
const prisma =
    globalForPrisma.prisma ||
    new PrismaClient();

// Save the client instance in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown handling
if (process.env.NODE_ENV !== 'production') {
    process.on('beforeExit', async () => {
        await prisma.$disconnect();
    });
}

export default prisma;
