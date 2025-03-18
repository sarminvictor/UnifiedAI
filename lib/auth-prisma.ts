import { PrismaClient } from '@prisma/client';

// Create a dedicated instance for auth to avoid connection issues
const authPrisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

// Log initialization
console.log('Auth Prisma Client initialized with DATABASE_URL:', process.env.DATABASE_URL ? '[Set]' : '[Missing]');

// Export the client
export default authPrisma; 