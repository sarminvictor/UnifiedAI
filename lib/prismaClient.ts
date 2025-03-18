import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

// For serverless environments, we need to use the transaction pooler
// The URL should be like: postgresql://postgres.woauvmkdxdibfontjvdi:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
const poolerUrl = process.env.DATABASE_URL?.includes('pooler.supabase.com:6543')
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL?.replace(
        'db.woauvmkdxdibfontjvdi.supabase.co:5432',
        'aws-0-us-east-1.pooler.supabase.com:6543'
    )?.replace(
        'postgres:',
        'postgres.woauvmkdxdibfontjvdi:'
    );

// Ensure PrismaClient is instantiated only once per NODE_ENV
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
        datasources: {
            db: {
                url: poolerUrl || process.env.DATABASE_URL,
            },
        },
        // Disable logging in production
        log: [],
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
                    log: ["query", "info", "warn", "error"],
                },
            },
        });
    }
    prisma = global.prisma;
}

// Log connection for debugging
console.log('Prisma Client initialized with URL type:',
    poolerUrl ? 'Using transaction pooler' : 'Using direct connection');

// Graceful shutdown to properly close connections
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export default prisma;
