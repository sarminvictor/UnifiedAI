import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';

// Create a test-only Prisma Client with debug logging
const prismaTest = new PrismaClient({
    log: ['query', 'error', 'warn'],
});

export async function GET() {
    // Start timestamps for performance checking
    const startTime = Date.now();
    const timestamps: Record<string, number> = {};
    const results: any = {
        timestamp: new Date().toISOString(),
        prismaVersion: process.env.npm_package_dependencies__prisma_client || 'unknown',
        databaseType: 'postgresql',
        connectionTest: { status: 'pending' },
        adapterTest: { status: 'pending' },
        userTests: { status: 'pending' },
        schemaInfo: { status: 'pending' },
    };

    try {
        // Test 1: Basic connection using raw SQL
        timestamps.connectionStart = Date.now();
        try {
            const result = await prismaTest.$queryRaw`SELECT 1+1 as result`;
            results.connectionTest = {
                status: 'success',
                duration: Date.now() - timestamps.connectionStart,
                result,
            };
        } catch (error: any) {
            results.connectionTest = {
                status: 'error',
                duration: Date.now() - timestamps.connectionStart,
                message: error.message,
                code: error.code,
            };
        }

        // Test 2: Adapter Setup
        timestamps.adapterStart = Date.now();
        try {
            const adapter = PrismaAdapter(prismaTest);
            // Check if the adapter has the required methods
            results.adapterTest = {
                status: 'success',
                duration: Date.now() - timestamps.adapterStart,
                methods: Object.keys(adapter),
            };
        } catch (error: any) {
            results.adapterTest = {
                status: 'error',
                duration: Date.now() - timestamps.adapterStart,
                message: error.message,
            };
        }

        // Test 3: User Tests
        timestamps.userStart = Date.now();
        results.userTests = {
            tests: {},
            duration: 0,
            status: 'pending',
        };

        try {
            // 3.1: Count users
            const userCount = await prismaTest.user.count();
            results.userTests.tests.count = {
                status: 'success',
                count: userCount,
            };

            // 3.2: Check user schema
            if (userCount > 0) {
                const latestUser = await prismaTest.user.findFirst({
                    orderBy: { created_at: 'desc' },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        credits_remaining: true,
                        password: true,
                        created_at: true,
                    },
                });

                results.userTests.tests.schema = {
                    status: 'success',
                    fields: Object.keys(latestUser || {}),
                    hasPasswordField: Boolean(latestUser?.password),
                    sampleTimestamp: latestUser?.created_at?.toISOString(),
                };
            } else {
                results.userTests.tests.schema = {
                    status: 'skipped',
                    reason: 'No users found',
                };
            }

            // 3.3: Test password hashing
            const testPassword = 'TestPassword123!';
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            const comparison = await bcrypt.compare(testPassword, hashedPassword);

            results.userTests.tests.passwordHash = {
                status: 'success',
                hashWorking: comparison === true,
                hashLength: hashedPassword.length,
            };

            results.userTests.status = 'success';
            results.userTests.duration = Date.now() - timestamps.userStart;
        } catch (error: any) {
            results.userTests.status = 'error';
            results.userTests.error = {
                message: error.message,
                code: error.code,
            };
            results.userTests.duration = Date.now() - timestamps.userStart;
        }

        // Test 4: Check schema version from _prisma_migrations
        timestamps.schemaStart = Date.now();
        try {
            const migrations = await prismaTest.$queryRaw`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC 
        LIMIT 5`;

            results.schemaInfo = {
                status: 'success',
                duration: Date.now() - timestamps.schemaStart,
                latestMigrations: migrations,
            };
        } catch (error: any) {
            results.schemaInfo = {
                status: 'error',
                duration: Date.now() - timestamps.schemaStart,
                message: error.message,
                code: error.code,
            };
        }

        // Add total duration
        results.totalDuration = Date.now() - startTime;

        // Include connection URL (with password redacted)
        const dbUrl = process.env.DATABASE_URL || '';
        if (dbUrl) {
            const redactedUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
            results.databaseUrl = redactedUrl;
        }

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json(
            {
                error: error.message,
                timestamp: new Date().toISOString(),
                totalDuration: Date.now() - startTime,
            },
            { status: 500 }
        );
    } finally {
        // Close the Prisma client
        await prismaTest.$disconnect();
    }
} 