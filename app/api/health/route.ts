import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

export async function GET() {
    try {
        // Basic health check - try to connect to database
        let dbStatus = 'Unknown';
        try {
            await prisma.$queryRaw`SELECT 1`;
            dbStatus = 'Connected';
        } catch (e) {
            dbStatus = 'Error';
        }

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            database: dbStatus,
            version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
        });
    } catch (error) {
        console.error('Health check failed:', error);
        return NextResponse.json(
            {
                status: 'unhealthy',
                error: 'Health check failed',
            },
            { status: 500 }
        );
    }
} 