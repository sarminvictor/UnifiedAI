import { NextResponse } from 'next/server';
import prisma from '@/lib/prismaClient';

export async function GET() {
    try {
        // Check environment variables (sanitize sensitive info)
        const envVars = {
            // Database
            DATABASE_URL: process.env.DATABASE_URL ? '✓ Set (value hidden)' : '✗ Missing',

            // NextAuth
            NEXTAUTH_URL: process.env.NEXTAUTH_URL,
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✓ Set (value hidden)' : '✗ Missing',

            // OAuth providers
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✓ Set (value hidden)' : '✗ Missing',
            GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✓ Set (value hidden)' : '✗ Missing',

            // Stripe
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '✓ Set (value hidden)' : '✗ Missing',
            STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set (value hidden)' : '✗ Missing',

            // Supabase
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set (value hidden)' : '✗ Missing',

            // Node environment
            NODE_ENV: process.env.NODE_ENV,
            VERCEL_ENV: process.env.VERCEL_ENV,
        };

        // Test Prisma connection
        let dbStatus = 'Failed to connect';
        let userCount = 0;
        let prismaModels = Object.keys(prisma).filter(key => !key.startsWith('_'));

        try {
            // Simple query to check connection
            userCount = await prisma.user.count();
            dbStatus = 'Connected successfully';
        } catch (dbError: any) {
            dbStatus = `Error: ${dbError.message}`;
        }

        // Return diagnostic info
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            envVars,
            database: {
                status: dbStatus,
                userCount,
                availableModels: prismaModels,
                prismaClient: prisma ? 'Initialized' : 'Not initialized',
            }
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: 'Diagnostic check failed',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
} 