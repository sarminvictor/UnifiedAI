import { NextResponse } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';

// Endpoint that creates a totally isolated Prisma client and executes direct table creation
export async function GET() {
    try {
        console.log('Creating isolated Prisma client for direct schema setup');

        // Get the database URL
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            return NextResponse.json({
                success: false,
                error: 'DATABASE_URL environment variable is not set'
            }, { status: 500 });
        }

        // Force correct engine type for Vercel
        process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

        // Create a new fully isolated Prisma client with different connection settings
        // to avoid conflicts with existing clients/prepared statements
        const prisma = new PrismaClient({
            datasources: {
                db: {
                    url: `${databaseUrl}?pgbouncer=true&connection_limit=1&pool_timeout=20`
                }
            },
            log: ['query', 'error', 'warn'],
            errorFormat: 'minimal'
        });

        // Try to connect with retry logic
        let connected = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!connected && attempts < maxAttempts) {
            attempts++;
            try {
                console.log(`Connection attempt ${attempts}/${maxAttempts}`);
                await prisma.$connect();
                connected = true;
                console.log('Prisma connected successfully');
            } catch (connErr) {
                console.error(`Connection attempt ${attempts} failed:`, connErr);
                if (attempts >= maxAttempts) {
                    await prisma.$disconnect();
                    return NextResponse.json({
                        success: false,
                        error: 'Failed to connect to database after multiple attempts',
                        details: connErr instanceof Error ? connErr.message : String(connErr)
                    }, { status: 500 });
                }
                // Wait 2 seconds before retry
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Try to execute a raw query to create all the NextAuth tables at once
        try {
            // First, try a simple query to test the connection
            console.log('Running test query...');

            const testQuery = Prisma.sql`SELECT 1 as test`;
            const testResult = await prisma.$queryRaw(testQuery);
            console.log('Test query successful:', testResult);

            // Now create all tables in a single raw query to avoid multiple connections
            console.log('Creating NextAuth tables...');

            const createTablesQuery = Prisma.sql`
            -- Create users table if it doesn't exist
            CREATE TABLE IF NOT EXISTS "users" (
                "id" TEXT NOT NULL,
                "name" TEXT,
                "email" TEXT,
                "emailVerified" TIMESTAMP(3),
                "image" TEXT,
                "credits_remaining" TEXT,
                CONSTRAINT "users_pkey" PRIMARY KEY ("id")
            );
            
            -- Create unique email index for users
            CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
            
            -- Create accounts table if it doesn't exist
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
            
            -- Create unique provider index for accounts
            CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" 
            ON "accounts"("provider", "providerAccountId");
            
            -- Create sessions table if it doesn't exist
            CREATE TABLE IF NOT EXISTS "sessions" (
                "id" TEXT NOT NULL,
                "sessionToken" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
            );
            
            -- Create unique session token index
            CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");
            
            -- Create verification tokens table if it doesn't exist
            CREATE TABLE IF NOT EXISTS "verification_tokens" (
                "identifier" TEXT NOT NULL,
                "token" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier", "token")
            );
            
            -- Drop constraints first to ensure clean recreation
            ALTER TABLE IF EXISTS "accounts" DROP CONSTRAINT IF EXISTS "accounts_userId_fkey";
            ALTER TABLE IF EXISTS "sessions" DROP CONSTRAINT IF EXISTS "sessions_userId_fkey";
            
            -- Add foreign key constraints
            ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            
            ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            `;

            // Execute the big query
            await prisma.$executeRaw(createTablesQuery);
            console.log('Tables created successfully!');

            // Verify tables exist by querying information schema
            const checkTablesQuery = Prisma.sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'accounts', 'sessions', 'verification_tokens');
            `;

            const tablesResult = await prisma.$queryRaw(checkTablesQuery);
            console.log('Tables found:', tablesResult);

            // Disconnect client
            await prisma.$disconnect();
            console.log('Prisma disconnected');

            return NextResponse.json({
                success: true,
                message: 'NextAuth tables created successfully with direct Prisma execution',
                tables: tablesResult
            });
        } catch (queryErr) {
            console.error('Error executing Prisma query:', queryErr);

            // Try to disconnect even after error
            try {
                await prisma.$disconnect();
                console.log('Prisma disconnected after error');
            } catch (disconnectErr) {
                console.error('Error disconnecting Prisma:', disconnectErr);
            }

            return NextResponse.json({
                success: false,
                error: 'Failed to execute database queries',
                details: queryErr instanceof Error ? queryErr.message : String(queryErr),
                stack: queryErr instanceof Error ? queryErr.stack : null
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Top-level error in Prisma direct endpoint:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : null
        }, { status: 500 });
    }
} 