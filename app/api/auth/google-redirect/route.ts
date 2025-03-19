import { NextResponse } from 'next/server';

// This route provides a direct redirect to Google OAuth
// that handles domain mismatches between preview and production URLs
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const callbackUrl = url.searchParams.get('callbackUrl') || '/';

        // Get the current hostname
        const currentHost = url.hostname;
        console.log('Current host for Google redirect:', currentHost);

        // Determine if we're on the production domain or preview domain
        const isPrimaryDomain = currentHost === 'unified-ai-lac.vercel.app';

        // Ensure NEXTAUTH_URL is properly formed with the current domain
        let baseUrl = isPrimaryDomain
            ? 'https://unified-ai-lac.vercel.app'
            : `https://${currentHost}`;

        console.log(`Using base URL: ${baseUrl} for Google OAuth redirect`);

        // Create the Google OAuth signin URL
        const googleAuthUrl = new URL('/api/auth/signin/google', baseUrl);
        googleAuthUrl.searchParams.set('callbackUrl', callbackUrl);

        // Log the full redirect URL
        console.log('Redirecting to Google OAuth:', googleAuthUrl.toString());

        // Perform the redirect
        return NextResponse.redirect(googleAuthUrl);
    } catch (error) {
        console.error('Error in Google redirect:', error);
        return NextResponse.json(
            { error: 'Failed to redirect to Google OAuth' },
            { status: 500 }
        );
    }
} 