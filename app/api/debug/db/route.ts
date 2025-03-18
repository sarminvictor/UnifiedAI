import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Direct database connection for diagnostic purposes
const databaseTest = async () => {
    let diagnostics = {
        databaseUrl: process.env.DATABASE_URL ? 'Set (hidden)' : 'Missing',
        connection: 'Not tested',
        prismaVersion: require('@prisma/client/package.json').version,
        tables: [] as string[],
        tableData: {} as Record<string, number>,
        error: null as string | null,
    };

    try {
        // Create direct connection to test raw connection
        const prisma = new PrismaClient();

        // Test connection
        await prisma.$connect();
        diagnostics.connection = 'Success';

        // Try to get table information directly
        const tableQuery = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

        // Extract table names from query result
        diagnostics.tables = Array.isArray(tableQuery)
            ? tableQuery.map((row: any) => row.table_name || row.TABLE_NAME)
            : [];

        // Test key tables for NextAuth
        for (const table of ['users', 'accounts', 'sessions', 'verification_tokens']) {
            try {
                // Use dynamic approach to query tables
                const count = await prisma.$executeRawUnsafe(`SELECT COUNT(*) FROM "${table}"`);
                diagnostics.tableData[table] = typeof count === 'number' ? count : 0;
            } catch (tableError: any) {
                diagnostics.tableData[table] = -1; // Error accessing table
            }
        }

        // Close connection
        await prisma.$disconnect();
    } catch (e: any) {
        diagnostics.connection = 'Failed';
        diagnostics.error = e.message;
    }

    return diagnostics;
};

export async function GET() {
    try {
        const dbDiagnostics = await databaseTest();

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            database: dbDiagnostics,
            recommendations: [
                ...(dbDiagnostics.connection !== 'Success' ? ['Database connection failed. Check your DATABASE_URL environment variable.'] : []),
                ...(!dbDiagnostics.tables.includes('users') ? ['The "users" table is missing - run Prisma migrations.'] : []),
                ...(!dbDiagnostics.tables.includes('accounts') ? ['The "accounts" table is missing - required for NextAuth OAuth.'] : []),
                ...(!dbDiagnostics.tables.includes('sessions') ? ['The "sessions" table is missing - required for NextAuth.'] : []),
            ],
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: 'Database diagnostic check failed',
                message: error.message,
            },
            { status: 500 }
        );
    }
} 