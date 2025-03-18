import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

// Ensure PrismaClient is instantiated only once per NODE_ENV
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
} else {
    // In development, create a new instance if it doesn't exist
    if (!global.prisma) {
        global.prisma = new PrismaClient({
            log: ['query', 'error', 'warn'],
            errorFormat: 'pretty',
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
        });
    }
    prisma = global.prisma;
}

// Log connection for debugging
console.log('Prisma Client initialized with URL:', process.env.DATABASE_URL ? '[DATABASE_URL is set]' : '[DATABASE_URL is missing]');

// Graceful shutdown to properly close connections
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export default prisma;
