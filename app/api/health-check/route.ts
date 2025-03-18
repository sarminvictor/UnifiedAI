import { NextResponse } from 'next/server';

// Force correct engine type for Vercel
if (process.env.NODE_ENV === 'production') {
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
}

export async function GET() {
    // Apply environment variable overrides
    process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';

    try {
        // Dynamically import prisma to ensure env vars are set first
        const { default: prisma } = await import('@/lib/prismaClient');

        // Check database connection 
        let dbConnected = false;
        let dbTables = [];
        let errorMessage = null;

        try {
            // Try to get table information
            const tableInfo: any = await prisma.$queryRaw`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `;

            dbConnected = true;
            dbTables = tableInfo.map((t: any) => t.table_name);
        } catch (dbError) {
            errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
            console.error('Database connection error:', dbError);
        }

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            prismaSettings: {
                clientEngineType: process.env.PRISMA_CLIENT_ENGINE_TYPE || 'not set',
                queryEngineType: process.env.PRISMA_CLI_QUERY_ENGINE_TYPE || 'not set',
                advisoryLock: process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK || 'not set',
            },
            database: {
                connected: dbConnected,
                error: errorMessage,
                tables: dbTables,
            },
            environment: process.env.NODE_ENV || 'unknown',
            nextAuthUrl: process.env.NEXTAUTH_URL || 'not set'
        });
    } catch (error) {
        console.error('Health check error:', error);
        return NextResponse.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            prismaSettings: {
                clientEngineType: process.env.PRISMA_CLIENT_ENGINE_TYPE || 'not set',
                queryEngineType: process.env.PRISMA_CLI_QUERY_ENGINE_TYPE || 'not set',
                advisoryLock: process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK || 'not set',
            },
            environment: process.env.NODE_ENV || 'unknown'
        }, { status: 500 });
    }
} 