import { PrismaClient } from '@prisma/client';

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

// Create a dedicated instance for auth to avoid connection issues
const authPrisma = new PrismaClient({
    datasources: {
        db: {
            url: poolerUrl || process.env.DATABASE_URL,
        },
    },
    // Disable query logging in production
    log: process.env.NODE_ENV === 'production' ? [] : ['error', 'warn'],
});

// Log initialization
console.log('Auth Prisma Client initialized with pooler URL:', poolerUrl ? 'Using transaction pooler' : 'Using direct connection');
console.log('DATABASE_URL type:', process.env.DATABASE_URL?.includes('pooler') ? 'Pooler' : 'Direct');

// Export the client
export default authPrisma; 