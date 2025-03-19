import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// This is a safeguard route to handle OAuth callbacks more explicitly
// This ensures they are properly redirected to NextAuth
export async function GET(
    request: NextRequest,
    { params }: { params: { provider: string[] } }
) {
    const provider = params.provider[0];
    const searchParams = request.nextUrl.searchParams;

    // Get all the search params 
    const searchParamsString = Array.from(searchParams.entries())
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

    // Log the callback attempt for debugging
    console.log(`OAuth callback received for provider: ${provider}`);
    console.log('Callback URL params:', searchParamsString);
    console.log('Request URL:', request.url);

    // Special handling for Google OAuth errors
    const error = searchParams.get('error');
    if (error) {
        console.error('OAuth error:', error);
        // Redirect to the error page with the error code
        return NextResponse.redirect(
            new URL(`/auth/error?error=${error}`,
                process.env.NEXTAUTH_URL || request.nextUrl.origin)
        );
    }

    // Handle OAuth state and code
    const state = searchParams.get('state');
    const code = searchParams.get('code');

    if (!state || !code) {
        console.error('Missing state or code in OAuth callback');
        return NextResponse.redirect(
            new URL('/auth/error?error=MissingOAuthParameters',
                process.env.NEXTAUTH_URL || request.nextUrl.origin)
        );
    }

    // Redirect to the appropriate NextAuth callback handler
    return NextResponse.redirect(
        new URL(`/api/auth/callback/${provider}?${searchParamsString}`,
            process.env.NEXTAUTH_URL || request.nextUrl.origin)
    );
} 