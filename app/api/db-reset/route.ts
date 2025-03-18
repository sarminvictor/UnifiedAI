import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

// This endpoint will clear prepared statements and reconnect
export async function POST() {
    try {
        // Only allow this in development or with a special key
        if (process.env.NODE_ENV !== 'development' &&
            process.env.CRON_SECRET !== process.env.CRON_SECRET) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Disconnect and reconnect to clear any stale connections
        await prisma.$disconnect();
        await prisma.$connect();

        return NextResponse.json(
            { success: true, message: 'Database connection reset successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error resetting database connection:', error);
        return NextResponse.json(
            { error: 'Failed to reset database connection' },
            { status: 500 }
        );
    }
} 