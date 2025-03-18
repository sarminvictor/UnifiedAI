import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

export async function GET() {
    // Allow in both development and production for troubleshooting
    try {
        // Check database connection
        const tables = await listTables();

        // Check for specific tables
        const hasUsersTable = tables.includes('User');
        const hasAccountsTable = tables.includes('Account');
        const hasSessionsTable = tables.includes('Session');
        const hasVerificationTokensTable = tables.includes('VerificationToken');

        // Check actual table names in the database
        const dbTableCheck = await checkActualTableNames();

        // Generate recommendations
        const recommendations: string[] = [];

        if (!dbTableCheck.users) {
            recommendations.push('The "users" table is missing - run Prisma migrations.');
        }

        if (!dbTableCheck.accounts) {
            recommendations.push('The "accounts" table is missing - required for NextAuth OAuth.');
        }

        if (!dbTableCheck.sessions) {
            recommendations.push('The "sessions" table is missing - required for NextAuth.');
        }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            database: {
                databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Missing',
                connection: 'Success',
                prismaVersion: getPrismaVersion(),
                tables,
                tableData: {
                    users: dbTableCheck.users ? 1 : -1,
                    accounts: dbTableCheck.accounts ? 1 : -1,
                    sessions: dbTableCheck.sessions ? 1 : -1,
                    verification_tokens: dbTableCheck.verificationTokens ? 1 : -1
                },
                error: null
            },
            recommendations
        });
    } catch (error) {
        console.error('Database debug endpoint error:', error);
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            database: {
                connection: 'Failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            recommendations: [
                'Database connection failed - check DATABASE_URL environment variable',
                'Ensure the database server is running and accessible',
                'Check your Prisma schema and run migrations'
            ]
        }, { status: 500 });
    }
}

// Function to get Prisma version safely
function getPrismaVersion(): string {
    try {
        return require('@prisma/client/package.json').version;
    } catch (e) {
        return 'unknown';
    }
}

// Function to list all models in Prisma
async function listTables(): Promise<string[]> {
    const dmmf = (prisma as any)._baseDmmf?.modelMap;
    if (!dmmf) {
        // Fallback to direct database query if _baseDmmf is not available
        try {
            const result: any = await prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
            return result.map((r: any) => r.table_name);
        } catch (e) {
            console.error('Error getting tables from database:', e);
            return [];
        }
    }
    return Object.keys(dmmf);
}

// Function to check if tables actually exist in the database
async function checkActualTableNames() {
    try {
        // Raw SQL query to check if tables exist
        const result: any = await prisma.$queryRaw`
      SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') as "users",
             EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounts') as "accounts",
             EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions') as "sessions",
             EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'verification_tokens') as "verificationTokens"
    `;

        return result[0] || {
            users: false,
            accounts: false,
            sessions: false,
            verificationTokens: false
        };
    } catch (error) {
        console.error('Error checking table existence:', error);
        return {
            users: false,
            accounts: false,
            sessions: false,
            verificationTokens: false
        };
    }
} 