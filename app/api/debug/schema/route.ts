import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

// Force correct engine type
if (process.env.NODE_ENV === 'production') {
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
}

// This endpoint is for manually applying schema changes when the build script fails
export async function GET() {
    try {
        // Force library engine type for Vercel
        process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

        // First check if the NextAuth tables already exist
        const tableCheck = await checkTables();

        // If all tables exist, return success
        if (tableCheck.hasUsers && tableCheck.hasAccounts && tableCheck.hasSessions && tableCheck.hasVerificationTokens) {
            return NextResponse.json({
                success: true,
                message: 'All required tables already exist',
                tables: tableCheck
            });
        }

        // Check for User/users table name casing issues
        // Try both "User" and "users" casing
        if (!tableCheck.hasUsers) {
            const caseCheckResult: any = await prisma.$queryRaw`
                SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'User') as "hasUserCapital"
            `;
            if (caseCheckResult[0]?.hasUserCapital) {
                console.log('Found User table with capital letter - will adjust foreign keys');
            }
        }

        // If tables don't exist, we'll need to create them with raw SQL
        // These SQL statements match the NextAuth schema in Prisma
        const createAccountsTable = `
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
            );
        `;

        const createSessionsTable = `
            CREATE TABLE IF NOT EXISTS "sessions" (
                "id" TEXT NOT NULL,
                "sessionToken" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL,

                CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
                CONSTRAINT "sessions_sessionToken_key" UNIQUE ("sessionToken")
            );
        `;

        const createVerificationTokensTable = `
            CREATE TABLE IF NOT EXISTS "verification_tokens" (
                "identifier" TEXT NOT NULL,
                "token" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL,

                CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier", "token")
            );
        `;

        // Add foreign key constraints - dynamically choose user table name
        const userTableName = tableCheck.hasUsers ? 'users' : 'User';

        const addForeignKeys = `
            ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "${userTableName}"("id") ON DELETE CASCADE ON UPDATE CASCADE;

            ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "${userTableName}"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `;

        // Execute the SQL statements
        const results = {
            accounts: !tableCheck.hasAccounts,
            sessions: !tableCheck.hasSessions,
            verificationTokens: !tableCheck.hasVerificationTokens,
            foreignKeys: true,
            userTableUsed: userTableName
        };

        if (!tableCheck.hasAccounts) {
            await prisma.$executeRawUnsafe(createAccountsTable);
        }

        if (!tableCheck.hasSessions) {
            await prisma.$executeRawUnsafe(createSessionsTable);
        }

        if (!tableCheck.hasVerificationTokens) {
            await prisma.$executeRawUnsafe(createVerificationTokensTable);
        }

        try {
            // Only try to add foreign keys if we created the tables
            if (!tableCheck.hasAccounts || !tableCheck.hasSessions) {
                await prisma.$executeRawUnsafe(addForeignKeys);
            }
        } catch (fkError) {
            // Foreign key errors are non-critical - tables might already have constraints
            console.error('Error adding foreign keys:', fkError);
            results.foreignKeys = false;
        }

        // Check again to see if tables were created
        const finalCheck = await checkTables();

        return NextResponse.json({
            success: true,
            message: 'Schema changes applied',
            created: results,
            tables: finalCheck
        });
    } catch (error) {
        console.error('Error applying schema changes:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Helper function to check if tables exist
async function checkTables() {
    try {
        const result: any = await prisma.$queryRaw`
            SELECT 
                EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') as "hasUsers",
                EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounts') as "hasAccounts",
                EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions') as "hasSessions",
                EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'verification_tokens') as "hasVerificationTokens"
        `;

        return result[0] || {
            hasUsers: false,
            hasAccounts: false,
            hasSessions: false,
            hasVerificationTokens: false
        };
    } catch (error) {
        console.error('Error checking tables:', error);
        return {
            hasUsers: false,
            hasAccounts: false,
            hasSessions: false,
            hasVerificationTokens: false
        };
    }
} 