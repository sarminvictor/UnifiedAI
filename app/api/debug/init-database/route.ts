import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Manually create the tables without using Prisma migration
export async function GET() {
    try {
        console.log('Initializing Prisma client with custom settings');

        // Force correct engine type for Vercel
        process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

        // Create a totally fresh client each time to avoid prepared statement issues
        const prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            },
            // Critical for Vercel
            errorFormat: 'minimal',
            log: ['query', 'info', 'warn', 'error']
        });

        console.log('Testing Prisma client connection');

        // Test basic connection first
        try {
            await prisma.$connect();
            console.log('Prisma connected successfully');
        } catch (connErr) {
            console.error('Prisma connection test failed:', connErr);
            return NextResponse.json({
                success: false,
                error: 'Prisma connection failed',
                details: connErr instanceof Error ? connErr.message : String(connErr)
            }, { status: 500 });
        }

        // Create users table if it doesn't exist
        console.log('Checking users table');
        const hasUsers = await checkTableExists(prisma, 'users');
        if (!hasUsers) {
            console.log('Creating users table');
            try {
                await prisma.$executeRawUnsafe(`
                    CREATE TABLE IF NOT EXISTS "users" (
                        "id" TEXT NOT NULL,
                        "name" TEXT,
                        "email" TEXT,
                        "emailVerified" TIMESTAMP(3),
                        "image" TEXT,
                        "credits_remaining" TEXT,
                        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
                    );
                    CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
                `);
            } catch (error) {
                console.error('Error creating users table:', error);
            }
        }

        // Create accounts table if it doesn't exist
        console.log('Checking accounts table');
        const hasAccounts = await checkTableExists(prisma, 'accounts');
        if (!hasAccounts) {
            console.log('Creating accounts table');
            try {
                await prisma.$executeRawUnsafe(`
                    CREATE TABLE IF NOT EXISTS "accounts" (
                        "id" TEXT NOT NULL,
                        "userId" TEXT NOT NULL,
                        "type" TEXT NOT NULL,
                        "provider" TEXT NOT NULL,
                        "providerAccountId" TEXT NOT NULL,
                        "refresh_token" TEXT,
                        "access_token" TEXT,
                        "expires_at" INTEGER,
                        "token_type" TEXT,
                        "scope" TEXT,
                        "id_token" TEXT,
                        "session_state" TEXT,
                        CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
                    );
                    CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
                    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" 
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                `);
            } catch (error) {
                console.error('Error creating accounts table:', error);
            }
        }

        // Create sessions table if it doesn't exist
        console.log('Checking sessions table');
        const hasSessions = await checkTableExists(prisma, 'sessions');
        if (!hasSessions) {
            console.log('Creating sessions table');
            try {
                await prisma.$executeRawUnsafe(`
                    CREATE TABLE IF NOT EXISTS "sessions" (
                        "id" TEXT NOT NULL,
                        "sessionToken" TEXT NOT NULL,
                        "userId" TEXT NOT NULL,
                        "expires" TIMESTAMP(3) NOT NULL,
                        CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
                    );
                    CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");
                    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                `);
            } catch (error) {
                console.error('Error creating sessions table:', error);
            }
        }

        // Create verification_tokens table if it doesn't exist
        console.log('Checking verification_tokens table');
        const hasVerificationTokens = await checkTableExists(prisma, 'verification_tokens');
        if (!hasVerificationTokens) {
            console.log('Creating verification_tokens table');
            try {
                await prisma.$executeRawUnsafe(`
                    CREATE TABLE IF NOT EXISTS "verification_tokens" (
                        "identifier" TEXT NOT NULL,
                        "token" TEXT NOT NULL,
                        "expires" TIMESTAMP(3) NOT NULL,
                        CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier", "token")
                    );
                `);
            } catch (error) {
                console.error('Error creating verification_tokens table:', error);
            }
        }

        // Final check to verify what tables exist
        const tablesExist = {
            users: await checkTableExists(prisma, 'users'),
            accounts: await checkTableExists(prisma, 'accounts'),
            sessions: await checkTableExists(prisma, 'sessions'),
            verification_tokens: await checkTableExists(prisma, 'verification_tokens')
        };

        console.log('Tables status:', tablesExist);

        // Disconnect prisma client
        await prisma.$disconnect();

        return NextResponse.json({
            success: true,
            message: 'Database initialization processed',
            tablesExist
        });
    } catch (error) {
        console.error('Error initializing database:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : null
        }, { status: 500 });
    }
}

// Helper function to check if a table exists
async function checkTableExists(prisma: PrismaClient, tableName: string): Promise<boolean> {
    try {
        const result = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(`
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = '${tableName}'
            ) as "exists";
        `);
        return result[0]?.exists || false;
    } catch (error) {
        console.error(`Error checking if table ${tableName} exists:`, error);
        return false;
    }
} 