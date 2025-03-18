import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: ['query', 'error', 'warn'],
        errorFormat: 'pretty',
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
};

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

// Graceful shutdown to properly close connections
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

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
