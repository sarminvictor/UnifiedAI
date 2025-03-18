import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prismaClient';

export async function GET() {
    // Only enable in development for security
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    try {
        // Check NextAuth environment variables
        const authEnvCheck = {
            hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
            hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
            nextAuthUrl: process.env.NEXTAUTH_URL,
            hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        };

        // Test NextAuth session
        const session = await getServerSession();
        const hasSession = !!session;

        // Test Prisma adapter (check if tables exist)
        const tableStatus = {
            userTableExists: false,
            accountTableExists: false,
            sessionTableExists: false,
            verificationTokenTableExists: false
        };

        try {
            // Check if User table exists and has records
            const userCount = await prisma.user.count();
            tableStatus.userTableExists = true;
        } catch (e) {
            console.error('Error accessing User table:', e);
        }

        try {
            // Check if Account table exists
            // @ts-ignore - Model may not exist in the Prisma client yet
            await prisma.account.findFirst();
            tableStatus.accountTableExists = true;
        } catch (e) {
            console.error('Error accessing Account table:', e);
        }

        try {
            // Check if Session table exists
            // @ts-ignore - Model may not exist in the Prisma client yet
            await prisma.session.findFirst();
            tableStatus.sessionTableExists = true;
        } catch (e) {
            console.error('Error accessing Session table:', e);
        }

        try {
            // Check if VerificationToken table exists
            // @ts-ignore - Model may not exist in the Prisma client yet
            await prisma.verificationToken.findFirst();
            tableStatus.verificationTokenTableExists = true;
        } catch (e) {
            console.error('Error accessing VerificationToken table:', e);
        }

        // Provide diagnostic information
        return NextResponse.json({
            success: true,
            authEnvironment: authEnvCheck,
            session: {
                exists: hasSession,
                user: session?.user ? {
                    id: session.user.id,
                    email: session.user.email,
                    hasCredits: !!session.user.credits_remaining
                } : null
            },
            adapterStatus: tableStatus,
            recommendations: [
                ...(!tableStatus.accountTableExists ? ['The Account table is missing - required for OAuth.'] : []),
                ...(!tableStatus.sessionTableExists ? ['The Session table is missing - required for NextAuth.'] : []),
                ...(!authEnvCheck.hasNextAuthSecret ? ['NEXTAUTH_SECRET is missing - required for JWT.'] : []),
                ...(!authEnvCheck.hasNextAuthUrl ? ['NEXTAUTH_URL is missing - required for callbacks.'] : []),
            ]
        });
    } catch (error) {
        console.error('Auth debug endpoint error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : null) : null,
        }, { status: 500 });
    }
} 