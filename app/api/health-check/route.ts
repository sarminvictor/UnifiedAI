import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        prismaSettings: {
            clientEngineType: process.env.PRISMA_CLIENT_ENGINE_TYPE || 'not set',
            queryEngineType: process.env.PRISMA_CLI_QUERY_ENGINE_TYPE || 'not set',
            advisoryLock: process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK || 'not set',
        },
        environment: process.env.NODE_ENV || 'unknown'
    });
} 