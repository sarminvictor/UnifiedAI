import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// This endpoint creates a custom Prisma migration and applies it to create the NextAuth tables
export async function GET() {
    // Force correct engine type for Vercel
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

    try {
        console.log('Starting direct Prisma migration process...');

        // Create migration directory if it doesn't exist
        const tmpMigrationDir = path.join(process.cwd(), 'prisma/migrations/nextauth_tables');

        try {
            await fs.mkdir(tmpMigrationDir, { recursive: true });
            console.log(`Created migration directory: ${tmpMigrationDir}`);
        } catch (e) {
            console.log('Migration directory already exists or failed to create');
        }

        // Create migration.sql file with CREATE TABLE statements
        const migrationSql = `
-- CreateTable - accounts
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

-- CreateTable - sessions
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable - verification_tokens
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier", "token")
);

-- CreateTable - users (if it doesn't exist)
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "credits_remaining" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_userId_fkey";
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_userId_fkey";
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`;

        const migrationSqlPath = path.join(tmpMigrationDir, 'migration.sql');
        await fs.writeFile(migrationSqlPath, migrationSql);
        console.log('Created migration.sql file');

        // Now apply the migration directly to the database
        console.log('Applying migration...');

        // Get DATABASE_URL from environment
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            return NextResponse.json({
                success: false,
                error: 'DATABASE_URL environment variable is not set'
            }, { status: 500 });
        }

        try {
            // Instead of using Prisma, execute the SQL directly via node-postgres
            const { Pool } = require('pg');

            // Create database connection with SSL disabled for self-signed certificates
            const pool = new Pool({
                connectionString: databaseUrl,
                ssl: {
                    rejectUnauthorized: false
                }
            });

            console.log('Connected to database, executing SQL...');

            // Read and execute the migration SQL
            const sql = await fs.readFile(migrationSqlPath, 'utf8');
            const result = await pool.query(sql);

            console.log('SQL executed successfully');
            await pool.end();

            return NextResponse.json({
                success: true,
                message: 'NextAuth tables created via direct SQL',
                migrationPath: migrationSqlPath,
                result: 'Success'
            });
        } catch (sqlError) {
            console.error('Error executing SQL:', sqlError);
            return NextResponse.json({
                success: false,
                error: sqlError instanceof Error ? sqlError.message : 'Unknown SQL execution error',
                migrationPath: migrationSqlPath
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error in create-tables-prisma:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : null
        }, { status: 500 });
    }
} 