import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth.config';

// Mark this route as dynamic to avoid static generation errors
export const dynamic = 'force-dynamic';

// This endpoint provides information about the auth configuration
// It's useful for debugging authentication issues
export async function GET() {
    try {
        // Extract just the necessary info without exposing secrets
        const safeAuthConfig = {
            providers: authOptions.providers.map(provider => ({
                id: provider.id,
                name: provider.name,
                type: provider.type
            })),
            callbackUrl: process.env.NEXTAUTH_URL,
            pages: authOptions.pages,
            session: {
                strategy: authOptions.session?.strategy
            }
        };

        // Also include some diagnostic information
        const diagnostics = {
            environment: process.env.NODE_ENV,
            nextAuthUrl: process.env.NEXTAUTH_URL,
            hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
            googleClientIdFirstChars: process.env.GOOGLE_CLIENT_ID ?
                `${process.env.GOOGLE_CLIENT_ID.substring(0, 8)}...` : null,
            hostname: process.env.VERCEL_URL || process.env.NEXTAUTH_URL || 'unknown'
        };

        return NextResponse.json({
            config: safeAuthConfig,
            diagnostics
        });
    } catch (error) {
        console.error('Error in auth-config debug endpoint:', error);
        return NextResponse.json(
            { error: 'Failed to generate auth configuration debug info' },
            { status: 500 }
        );
    }
} 