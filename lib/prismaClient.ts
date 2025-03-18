import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

// Force the correct engine type for Vercel
if (process.env.NODE_ENV === 'production') {
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
    process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = 'true';
}

// Define the global type for Prisma
const globalForPrisma = global as unknown as {
    prisma: PrismaClient | undefined;
};

// Create options for PrismaClient
const prismaClientOptions = {
    // Disable connection pooling in production - will create a new instance for each function
    datasources: process.env.NODE_ENV === 'production'
        ? { db: { url: process.env.DATABASE_URL } }
        : undefined,
};

// Create a new Prisma client instance
const prisma =
    globalForPrisma.prisma ||
    new PrismaClient(prismaClientOptions);

// Save the client instance in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown handling
if (process.env.NODE_ENV !== 'production') {
    process.on('beforeExit', async () => {
        await prisma.$disconnect();
    });
}

export default prisma;
