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

    // Redirect to the appropriate NextAuth callback handler
    return NextResponse.redirect(
        new URL(`/api/auth/callback/${provider}?${searchParamsString}`,
            process.env.NEXTAUTH_URL || request.nextUrl.origin)
    );
} 