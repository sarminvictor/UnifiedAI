import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';
import { getServerSession } from '@/lib/auth';

export async function GET() {
    // Only enable in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    try {
        // Check environment variables (masked for security)
        const envCheck = {
            hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
            hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
            nextAuthUrl: process.env.NEXTAUTH_URL,
            hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            databaseUrl: process.env.DATABASE_URL?.substring(0, 15) + '...' // Only show beginning for security
        };

        // Check database connection
        const dbConnectionTest = await prisma.$queryRaw`SELECT 1 as connected`;

        // Check auth session
        const session = await getServerSession();
        const hasSession = !!session;

        // Next Auth table counts with error handling
        let userCount = 0;
        let accountCount = 0;
        let sessionCount = 0;
        let verificationTokenCount = 0;

        try {
            userCount = await prisma.user.count();
        } catch (e) {
            console.error('Error counting users:', e);
        }

        try {
            // @ts-ignore - Model may not exist in the Prisma client yet
            accountCount = await prisma.account.count();
        } catch (e) {
            console.error('Error counting accounts:', e);
        }

        try {
            // @ts-ignore - Model may not exist in the Prisma client yet
            sessionCount = await prisma.session.count();
        } catch (e) {
            console.error('Error counting sessions:', e);
        }

        try {
            // @ts-ignore - Model may not exist in the Prisma client yet
            verificationTokenCount = await prisma.verificationToken.count();
        } catch (e) {
            console.error('Error counting verification tokens:', e);
        }

        return NextResponse.json({
            success: true,
            environmentVariables: envCheck,
            databaseConnection: dbConnectionTest ? 'Connected' : 'Failed',
            nextAuthTables: {
                userCount,
                accountCount,
                sessionCount,
                verificationTokenCount
            },
            hasSession,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Debug endpoint error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : null,
        }, { status: 500 });
    }
} 