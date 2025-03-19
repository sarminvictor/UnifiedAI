import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaAdapter } from '@auth/prisma-adapter';
import pkg from '@prisma/client/package.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Create a test-only instance of PrismaClient with logging
const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
});

export async function GET() {
    const timestamp = new Date().toISOString();
    let connectionTest = false;
    let adapterTest = { success: false, error: null as string | null };
    let userTest = {
        success: false,
        error: null as string | null,
        methods: {} as any
    };
    let schemaVersion = '';
    const prismaVersion = pkg.version;

    try {
        // Basic connection test
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        connectionTest = Array.isArray(result) && result[0]?.connected === 1;

        // Test creating the adapter
        try {
            const adapter = PrismaAdapter(prisma);
            adapterTest.success = !!adapter;
        } catch (error: any) {
            adapterTest.error = error.message;
        }

        // Test user functions
        try {
            // Test counting users
            const userCount = await prisma.user.count();
            userTest.methods = { count: userCount };

            // Test finding users
            const firstUser = await prisma.user.findFirst();
            userTest.methods.findFirst = !!firstUser;

            // Test adapter-style user lookup - using a simulated account lookup
            try {
                // Check if account table exists first
                const tables = await prisma.$queryRaw`
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                        AND table_name = 'Account'
                `;

                if (Array.isArray(tables) && tables.length > 0) {
                    // Check the Account table structure to determine the correct column name
                    const accountColumns = await prisma.$queryRaw`
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'Account'
                    `;

                    const accountColumnNames = Array.isArray(accountColumns)
                        ? accountColumns.map((col: any) => col.column_name.toLowerCase())
                        : [];

                    const hasUserId = accountColumnNames.includes('userid');
                    const hasUser_Id = accountColumnNames.includes('user_id');

                    // Log the column information for debugging
                    console.log('Account columns found:', accountColumnNames);

                    let userByAccountQuery;

                    if (hasUserId) {
                        // Query using the NextAuth default "userId" column name
                        userByAccountQuery = await prisma.$queryRaw`
                            SELECT u.* FROM "User" u
                            JOIN "Account" a ON u.id = a."userId"
                            WHERE a.provider = 'google'
                            LIMIT 1
                        `;
                    } else if (hasUser_Id) {
                        // Query using the "user_id" column name common in some schemas
                        userByAccountQuery = await prisma.$queryRaw`
                            SELECT u.* FROM "User" u
                            JOIN "Account" a ON u.id = a.user_id
                            WHERE a.provider = 'google'
                            LIMIT 1
                        `;
                    } else {
                        // No recognized column naming pattern found
                        userByAccountQuery = null;
                        console.log('No recognized user ID column found in Account table');
                    }

                    userTest.methods.userByAccount = {
                        success: !!userByAccountQuery,
                        user: userByAccountQuery && Array.isArray(userByAccountQuery) && userByAccountQuery.length > 0
                            ? { id: userByAccountQuery[0].id, email: userByAccountQuery[0].email }
                            : null,
                        columnInfo: {
                            hasUserId,
                            hasUser_Id,
                            columns: accountColumnNames
                        }
                    };
                } else {
                    userTest.methods.userByAccount = {
                        success: false,
                        error: "Account table doesn't exist in the database"
                    };
                }
            } catch (error: any) {
                userTest.methods.userByAccount = {
                    success: false,
                    error: error.message
                };
            }

            userTest.success = true;
        } catch (error: any) {
            userTest.error = error.message;
        }

        // Get database schema version from _prisma_migrations
        try {
            const migrations = await prisma.$queryRaw`
                SELECT migration_name 
                FROM _prisma_migrations 
                ORDER BY finished_at DESC 
                LIMIT 1
            `;

            if (Array.isArray(migrations) && migrations.length > 0) {
                const latestMigration = migrations[0] as { migration_name: string };
                schemaVersion = latestMigration.migration_name;
            } else {
                schemaVersion = 'No migrations found';
            }
        } catch (error: any) {
            schemaVersion = `Error getting schema version: ${error.message}`;
        }

        return NextResponse.json({
            timestamp,
            connectionTest,
            adapterTest,
            userTest,
            schemaVersion,
            prismaVersion
        });

    } catch (error: any) {
        return NextResponse.json({
            timestamp,
            error: error.message
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
} 