import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/runtime-config';

// This route provides a direct redirect to Google OAuth
// that handles domain mismatches between preview and production URLs
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const callbackUrl = url.searchParams.get('callbackUrl') || '/';

        // Get host information from multiple sources for reliability
        const host = request.headers.get('host') || '';
        const forwardedHost = request.headers.get('x-forwarded-host') || '';
        const referer = request.headers.get('referer') || '';

        console.log('Google redirect - Request details:');
        console.log('  URL:', request.url);
        console.log('  Host:', host);
        console.log('  X-Forwarded-Host:', forwardedHost);
        console.log('  Referer:', referer);
        console.log('  Headers:', JSON.stringify(Object.fromEntries(request.headers)));

        // Get current base URL using our helper
        const baseUrl = getBaseUrl();
        console.log('  Determined base URL:', baseUrl);

        // Create direct URL to Google OAuth signin with the proper callback URL
        const redirectUrl = new URL(`${baseUrl}/api/auth/signin/google`);
        redirectUrl.searchParams.set('callbackUrl', callbackUrl);

        // Log the final URL for debugging
        console.log('  Redirecting to:', redirectUrl.toString());

        // Perform the redirect
        return NextResponse.redirect(redirectUrl);
    } catch (error) {
        console.error('Error in Google redirect:', error);
        return NextResponse.json(
            { error: 'Failed to redirect to Google OAuth', details: String(error) },
            { status: 500 }
        );
    }
} 