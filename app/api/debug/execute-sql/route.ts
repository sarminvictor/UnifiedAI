import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// This endpoint directly executes the SQL to create NextAuth tables
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

        console.log('Starting direct SQL execution approach...');

        // Create direct PostgreSQL connection with SSL disabled
        const pool = new Pool({
            connectionString: databaseUrl,
            ssl: {
                rejectUnauthorized: false
            }
        });

        // The SQL to execute - all in one transaction
        const sql = `
BEGIN;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "credits_remaining" TEXT,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

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

CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier", "token")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- Drop constraints if they exist (to avoid errors)
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_userId_fkey";
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_userId_fkey";

-- Add constraints
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
        `;

        console.log('Executing SQL...');
        await pool.query(sql);
        console.log('SQL executed successfully');

        // Close the connection
        await pool.end();

        return NextResponse.json({
            success: true,
            message: 'NextAuth tables created successfully with direct SQL execution',
            tablesCreated: [
                "users",
                "accounts",
                "sessions",
                "verification_tokens"
            ]
        });
    } catch (error) {
        console.error('Error executing SQL:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorDetails: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
} 