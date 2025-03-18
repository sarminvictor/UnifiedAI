import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// This endpoint creates NextAuth tables directly with PostgreSQL
// This avoids Prisma prepared statement issues
export async function GET() {
    // Force correct engine type for Vercel
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

    try {
        // Get database connection string
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            return NextResponse.json({
                success: false,
                error: 'DATABASE_URL environment variable is not set'
            }, { status: 500 });
        }

        console.log('Connecting to database...');

        // Create a direct PostgreSQL connection with SSL disabled for self-signed certificates
        const pool = new Pool({
            connectionString: databaseUrl,
            // Always set rejectUnauthorized to false for Supabase and other hosted PostgreSQL
            ssl: {
                rejectUnauthorized: false
            }
        });

        // Function to safely run queries
        const runQuery = async (query: string, description: string) => {
            try {
                console.log(`Running query: ${description}`);
                const result = await pool.query(query);
                console.log(`Query successful: ${description}`);
                return { success: true, description, result };
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Query error (${description}):`, errorMsg);

                // Only consider it a real error if it's not about the object already existing
                const isAlreadyExistsError = errorMsg.includes('already exists');
                return {
                    success: !isAlreadyExistsError,
                    description,
                    error: errorMsg,
                    alreadyExists: isAlreadyExistsError
                };
            }
        };

        // Test connection
        console.log('Testing connection...');
        const connectionTest = await pool.query('SELECT 1 as connected');
        console.log('Connection test result:', connectionTest.rows[0]);

        // Check what tables already exist
        console.log('Checking existing tables...');
        const tableResult = await pool.query(`
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        `);
        const existingTables = tableResult.rows.map(row => row.tablename);
        console.log('Existing tables:', existingTables);

        // Determine user table name based on what exists
        const userTableName = existingTables.includes('users') ? 'users'
            : existingTables.includes('user') ? 'user'
                : existingTables.includes('User') ? 'User'
                    : 'users';

        console.log(`Using user table name: ${userTableName}`);

        // Create NextAuth tables if they don't exist
        const results = [];

        // Create accounts table
        results.push(await runQuery(`
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
                CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "accounts_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId")
            )
        `, 'Create accounts table'));

        // Create sessions table
        results.push(await runQuery(`
            CREATE TABLE IF NOT EXISTS "sessions" (
                "id" TEXT NOT NULL,
                "sessionToken" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "sessions_sessionToken_key" UNIQUE ("sessionToken")
            )
        `, 'Create sessions table'));

        // Create verification_tokens table
        results.push(await runQuery(`
            CREATE TABLE IF NOT EXISTS "verification_tokens" (
                "identifier" TEXT NOT NULL,
                "token" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier", "token")
            )
        `, 'Create verification_tokens table'));

        // Add foreign keys (only if the user table exists)
        if (existingTables.includes(userTableName)) {
            console.log(`Adding foreign keys to existing ${userTableName} table`);
            results.push(await runQuery(`
                ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_userId_fkey";
                ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "${userTableName}"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `, 'Add foreign key to accounts table'));

            results.push(await runQuery(`
                ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_userId_fkey";
                ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "${userTableName}"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `, 'Add foreign key to sessions table'));
        } else {
            // Create a basic users table if none exists
            console.log('Creating new users table');
            results.push(await runQuery(`
                CREATE TABLE IF NOT EXISTS "users" (
                    "id" TEXT NOT NULL,
                    "name" TEXT,
                    "email" TEXT,
                    "emailVerified" TIMESTAMP(3),
                    "image" TEXT,
                    "credits_remaining" TEXT,
                    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
                    CONSTRAINT "users_email_key" UNIQUE ("email")
                )
            `, 'Create users table'));

            // Add foreign keys to the newly created users table
            results.push(await runQuery(`
                ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_userId_fkey";
                ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `, 'Add foreign key to accounts table'));

            results.push(await runQuery(`
                ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_userId_fkey";
                ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `, 'Add foreign key to sessions table'));
        }

        // Close the database connection
        console.log('Closing connection pool...');
        await pool.end();
        console.log('Connection pool closed');

        // Return results
        return NextResponse.json({
            success: true,
            message: 'NextAuth tables created or verified',
            existingTables,
            userTableUsed: userTableName,
            results
        });
    } catch (error) {
        console.error('Error creating NextAuth tables:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : null
        }, { status: 500 });
    }
} 