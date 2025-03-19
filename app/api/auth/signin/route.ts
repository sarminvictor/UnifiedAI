import { NextResponse } from 'next/server';

// Mark as dynamic
export const dynamic = 'force-dynamic';

// This handler ensures that POST requests to /api/auth/signin are properly redirected
// to the NextAuth.js handler at /api/auth/[...nextauth]/route.ts
export async function POST(request: Request) {
  try {
    console.log('POST to /api/auth/signin received');

    // Get the form data or JSON from the request
    const contentType = request.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await request.json();
      console.log('JSON data received:', JSON.stringify(data, null, 2));
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      data = Object.fromEntries(formData);
      console.log('Form data received:', JSON.stringify(data, null, 2));
    }

    // Get the callbackUrl from the request
    const url = new URL(request.url);
    const callbackUrl = url.searchParams.get('callbackUrl') || '/';
    const provider = url.searchParams.get('provider') || 'credentials';

    console.log('Redirecting to auth with provider:', provider);

    if (provider !== 'credentials') {
      // For OAuth providers, redirect to the OAuth flow
      return NextResponse.redirect(
        new URL(`/api/auth/signin/${provider}?${new URLSearchParams({
          callbackUrl
        }).toString()}`, request.url)
      );
    }

    // For credentials, redirect to the credentials callback
    return NextResponse.redirect(
      new URL(`/api/auth/callback/credentials?${new URLSearchParams({
        callbackUrl,
        ...(data || {})
      }).toString()}`, request.url)
    );
  } catch (error) {
    console.error('Signin route error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: String(error) },
      { status: 500 }
    );
  }
}

// Also handle GET requests to properly redirect to the signin page or provider
export async function GET(request: Request) {
  try {
    console.log('GET to /api/auth/signin received');

    const url = new URL(request.url);
    const callbackUrl = url.searchParams.get('callbackUrl') || '/';
    const provider = url.searchParams.get('provider');

    if (provider) {
      console.log('Redirecting to provider:', provider);
      // Redirect to the specific provider signin
      return NextResponse.redirect(
        new URL(`/api/auth/signin/${provider}?${new URLSearchParams({
          callbackUrl
        }).toString()}`, request.url)
      );
    }

    // If no provider specified, redirect to the signin page
    return NextResponse.redirect(
      new URL(`/auth/signin?${new URLSearchParams({
        callbackUrl
      }).toString()}`, request.url)
    );
  } catch (error) {
    console.error('Signin route error (GET):', error);
    return NextResponse.json(
      { error: 'Authentication redirect failed' },
      { status: 500 }
    );
  }
}
