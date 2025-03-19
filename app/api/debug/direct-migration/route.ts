import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NEXTAUTH_MIGRATIONS = [
    // Create Account table
    `CREATE TABLE IF NOT EXISTS "Account" (
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
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
  )`,

    // Create Session table
    `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
  )`,

    // Create VerificationToken table
    `CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier", "token")
  )`,

    // Add indexes
    `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken")`,
    `CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId")`,
    `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")`,

    // Add foreign key constraints - Handle both "id" and "user_id" column possibilities
    `ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" 
   FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

    `ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" 
   FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,

    // Record migration in _prisma_migrations table
    `INSERT INTO "_prisma_migrations" (
    "id", 
    "checksum", 
    "finished_at", 
    "migration_name", 
    "logs", 
    "rolled_back_at", 
    "started_at", 
    "applied_steps_count"
  )
  VALUES (
    gen_random_uuid(), 
    'direct_nextauth_tables', 
    NOW(), 
    'add_nextauth_tables_direct', 
    'Applied via direct migration API', 
    NULL, 
    NOW(), 
    1
  )
  ON CONFLICT DO NOTHING`
];

export async function POST() {
    try {
        const results = [];

        for (const stmt of NEXTAUTH_MIGRATIONS) {
            try {
                // Execute the SQL statement
                await prisma.$executeRawUnsafe(`${stmt}`);
                results.push({
                    sql: stmt.substring(0, 50) + '...',
                    status: 'success'
                });
            } catch (error: any) {
                // If the statement fails, log it but continue with the next one
                console.error(`Error executing SQL:`, error);
                results.push({
                    sql: stmt.substring(0, 50) + '...',
                    status: 'error',
                    error: error.message
                });
            }
        }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            message: 'Direct migration completed',
            results
        });
    } catch (error: any) {
        console.error('Direct migration error:', error);
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            error: error.message
        }, { status: 500 });
    }
} 