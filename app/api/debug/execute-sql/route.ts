import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// This endpoint directly executes the SQL to create NextAuth tables
export async function GET(request: Request) {
    // Force correct engine type for Vercel
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

    // Check if we should drop tables first
    const url = new URL(request.url);
    const shouldDrop = url.searchParams.get('drop') === 'true';

    try {
        // Get database connection string
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            return NextResponse.json({
                success: false,
                error: 'DATABASE_URL environment variable is not set'
            }, { status: 500 });
        }

        console.log('Starting direct SQL execution approach...');
        console.log('Database URL format check:', databaseUrl.substring(0, 10) + '...');
        console.log('Drop and recreate mode:', shouldDrop);

        // Create direct PostgreSQL connection with SSL disabled and extra options
        const pool = new Pool({
            connectionString: databaseUrl,
            ssl: {
                rejectUnauthorized: false
            },
            // Add connection pool settings suitable for serverless
            max: 1, // Use only one connection
            idleTimeoutMillis: 5000, // Close connections after 5 seconds of inactivity
            connectionTimeoutMillis: 10000, // Connection timeout
        });

        // Test connection first
        console.log('Testing database connection...');
        try {
            const client = await pool.connect();
            console.log('Connection successful, running simple query...');

            // Run a simple query to test the connection
            const testResult = await client.query('SELECT NOW() as time');
            console.log('Test query successful, time:', testResult.rows[0].time);

            // Release client back to pool
            client.release();
            console.log('Test connection released');
        } catch (connErr) {
            console.error('Connection test failed:', connErr);
            return NextResponse.json({
                success: false,
                error: 'Database connection test failed',
                details: connErr instanceof Error ? connErr.message : String(connErr)
            }, { status: 500 });
        }

        // Drop tables first if requested
        if (shouldDrop) {
            console.log('Drop mode enabled, dropping tables first...');
            const dropClient = await pool.connect();
            try {
                const dropSql = `
                DO $$
                BEGIN
                    -- Drop tables in correct order to avoid constraint violations
                    BEGIN
                        DROP TABLE IF EXISTS "sessions";
                        RAISE NOTICE 'Dropped sessions table';
                    EXCEPTION WHEN others THEN
                        RAISE NOTICE 'Error dropping sessions table: %', SQLERRM;
                    END;
                    
                    BEGIN
                        DROP TABLE IF EXISTS "accounts";
                        RAISE NOTICE 'Dropped accounts table';
                    EXCEPTION WHEN others THEN
                        RAISE NOTICE 'Error dropping accounts table: %', SQLERRM;
                    END;
                    
                    BEGIN
                        DROP TABLE IF EXISTS "verification_tokens";
                        RAISE NOTICE 'Dropped verification_tokens table';
                    EXCEPTION WHEN others THEN
                        RAISE NOTICE 'Error dropping verification_tokens table: %', SQLERRM;
                    END;
                    
                    -- Note: We don't drop users table by default as it may contain other data
                    -- Uncomment if you want to drop users table too
                    /*
                    BEGIN
                        DROP TABLE IF EXISTS "users";
                        RAISE NOTICE 'Dropped users table';
                    EXCEPTION WHEN others THEN
                        RAISE NOTICE 'Error dropping users table: %', SQLERRM;
                    END;
                    */
                END $$;
                `;

                await dropClient.query(dropSql);
                console.log('Tables dropped successfully');
                dropClient.release();
            } catch (dropErr) {
                console.error('Error dropping tables:', dropErr);
                dropClient.release();
                // Continue anyway - we'll attempt to create the tables fresh
            }
        }

        // The SQL to execute - all in one transaction but with better error handling
        const sql = `
DO $$
BEGIN
    -- Create tables if they don't exist
    BEGIN
        CREATE TABLE IF NOT EXISTS "users" (
            "id" TEXT NOT NULL,
            "name" TEXT,
            "email" TEXT,
            "emailVerified" TIMESTAMP(3),
            "image" TEXT,
            "credits_remaining" TEXT,
            CONSTRAINT "users_pkey" PRIMARY KEY ("id")
        );
        RAISE NOTICE 'Created users table';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error creating users table: %', SQLERRM;
    END;
    
    BEGIN
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
        RAISE NOTICE 'Created accounts table';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error creating accounts table: %', SQLERRM;
    END;
    
    BEGIN
        CREATE TABLE IF NOT EXISTS "sessions" (
            "id" TEXT NOT NULL,
            "sessionToken" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "expires" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
        );
        RAISE NOTICE 'Created sessions table';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error creating sessions table: %', SQLERRM;
    END;
    
    BEGIN
        CREATE TABLE IF NOT EXISTS "verification_tokens" (
            "identifier" TEXT NOT NULL,
            "token" TEXT NOT NULL,
            "expires" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier", "token")
        );
        RAISE NOTICE 'Created verification_tokens table';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error creating verification_tokens table: %', SQLERRM;
    END;
    
    -- Create indexes
    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
        RAISE NOTICE 'Created users_email_key index';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error creating users_email_key index: %', SQLERRM;
    END;
    
    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
        RAISE NOTICE 'Created accounts_provider_providerAccountId_key index';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error creating accounts_provider_providerAccountId_key index: %', SQLERRM;
    END;
    
    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");
        RAISE NOTICE 'Created sessions_sessionToken_key index';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error creating sessions_sessionToken_key index: %', SQLERRM;
    END;
    
    -- Drop and re-add constraints
    BEGIN
        ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_userId_fkey";
        ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Set up accounts_userId_fkey constraint';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error setting up accounts_userId_fkey constraint: %', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_userId_fkey";
        ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Set up sessions_userId_fkey constraint';
    EXCEPTION WHEN others THEN
        RAISE NOTICE 'Error setting up sessions_userId_fkey constraint: %', SQLERRM;
    END;
END $$;
        `;

        console.log('Executing SQL...');
        const client = await pool.connect();
        try {
            const result = await client.query(sql);
            console.log('SQL executed successfully, result:', result);
            client.release();
        } catch (sqlErr) {
            console.error('SQL execution failed:', sqlErr);
            client.release();
            return NextResponse.json({
                success: false,
                error: 'SQL execution failed',
                details: sqlErr instanceof Error ? sqlErr.message : String(sqlErr)
            }, { status: 500 });
        }

        // Verify tables exist
        console.log('Verifying tables were created...');
        const verifyClient = await pool.connect();
        try {
            const tableCheck = await verifyClient.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema='public' AND 
                table_name IN ('users', 'accounts', 'sessions', 'verification_tokens')
            `);

            const tablesFound = tableCheck.rows.map(row => row.table_name);
            console.log('Tables found:', tablesFound);
            verifyClient.release();

            // Close the connection
            await pool.end();
            console.log('Pool ended');

            return NextResponse.json({
                success: true,
                message: 'NextAuth tables processed successfully with direct SQL execution',
                tablesCreated: tablesFound,
                tablesDropped: shouldDrop ? ['sessions', 'accounts', 'verification_tokens'] : []
            });
        } catch (verifyErr) {
            console.error('Table verification failed:', verifyErr);
            verifyClient.release();
            await pool.end();

            return NextResponse.json({
                success: false,
                error: 'Table verification failed',
                details: verifyErr instanceof Error ? verifyErr.message : String(verifyErr)
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Top-level error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorDetails: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
} 