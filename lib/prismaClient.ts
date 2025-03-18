import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty',
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown handling
if (process.env.NODE_ENV !== 'production') {
    process.on('beforeExit', async () => {
        await prisma.$disconnect();
    });
}

// Handle connection errors
prisma.$on('error', (e) => {
    console.error('Prisma Client Error:', e);
});

// Handle connection events
prisma.$on('query', (e) => {
    console.log('Query: ' + e.query);
    console.log('Duration: ' + e.duration + 'ms');
});

export default prisma;
