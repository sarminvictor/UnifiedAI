import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

// This handler ensures that POST requests to /api/auth/signin are properly redirected
// to the NextAuth.js handler at /api/auth/[...nextauth]/route.ts
export async function POST(request: Request) {
  try {
    // Get the form data or JSON from the request
    const contentType = request.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await request.json();
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      data = Object.fromEntries(formData);
    }

    // Get the callbackUrl from the request
    const url = new URL(request.url);
    const callbackUrl = url.searchParams.get('callbackUrl') || '/';

    // Redirect to the nextauth API with the right parameters
    const redirectUrl = `/api/auth/callback/credentials?${new URLSearchParams({
      callbackUrl,
      ...(data || {})
    }).toString()}`;

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error('Signin route error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
