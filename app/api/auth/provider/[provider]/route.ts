import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/runtime-config';

// Mark this as dynamic to prevent static rendering
export const dynamic = 'force-dynamic';

/**
 * This route allows direct authentication with providers through a special URL
 * It handles any OAuth provider and builds the correct URLs dynamically
 * This helps overcome domain mismatch issues in preview deployments
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { provider: string } }
) {
    try {
        // Extract the provider from the URL parameters
        const provider = params.provider;

        // Get search parameters from the request URL
        const searchParams = new URL(request.url).searchParams;
        const callbackUrl = searchParams.get('callbackUrl') || '/';

        // Log request information for debugging
        console.log(`Direct provider route called for ${provider}`);
        console.log(`  Request URL: ${request.url}`);
        console.log(`  Callback URL: ${callbackUrl}`);

        // Get the base URL dynamically
        const baseUrl = getBaseUrl();
        console.log(`  Base URL: ${baseUrl}`);

        // Build the NextAuth sign-in URL for the requested provider
        const signInUrl = new URL(`${baseUrl}/api/auth/signin/${provider}`);

        // Forward any query parameters
        searchParams.forEach((value, key) => {
            if (key !== 'provider') {
                signInUrl.searchParams.set(key, value);
            }
        });

        // Always include the callback URL
        if (!signInUrl.searchParams.has('callbackUrl')) {
            signInUrl.searchParams.set('callbackUrl', callbackUrl);
        }

        console.log(`  Redirecting to: ${signInUrl.toString()}`);

        // Redirect to the NextAuth sign-in URL
        return NextResponse.redirect(signInUrl);
    } catch (error) {
        console.error('Error in direct provider auth route:', error);

        // Return an error response
        return NextResponse.json(
            {
                error: 'Failed to process authentication request',
                provider: params.provider,
                details: String(error)
            },
            { status: 500 }
        );
    }
} 