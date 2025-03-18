import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createClient } from '@/utils/supabase/middleware';

async function validatePlan(planId: string) {
  // Validate plan existence and status
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/subscriptions/plans`);
  const { plans } = await response.json();
  return plans.some((plan: { plan_id: string }) => plan.plan_id === planId);
}

export async function middleware(request: NextRequest) {
  // Skip authentication for specific routes
  const publicPaths = [
    '/auth/signin',
    '/auth/signup',
    '/auth/reset-password',
    '/auth/callback',
    '/api/auth/session',
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/reset-password',
    '/api/auth/verify-user',
    '/api/auth/csrf',
    '/api/webhook',
  ];

  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname.startsWith(path) ||
    request.nextUrl.pathname === path
  );

  // For all NextAuth related endpoints, bypass Supabase handling
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Supabase auth refresh (but don't do this for NextAuth routes)
  if (!request.nextUrl.pathname.startsWith('/api/auth')) {
    try {
      const clientResponse = createClient(request);
      await clientResponse.supabase.auth.getSession();

      // If this is public route, allow through after refreshing Supabase session
      if (isPublicPath) {
        return clientResponse.response;
      }
    } catch (error) {
      console.error('Supabase session refresh error:', error);
      // Continue with NextAuth check even if Supabase fails
    }
  }

  // NextAuth token check
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // If public path or API call without auth requirements, let it through
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Handle subscription-related routes
  if (request.nextUrl.pathname.startsWith('/api/subscriptions')) {
    // Skip validation for plans listing
    if (request.nextUrl.pathname === '/api/subscriptions/plans') {
      return NextResponse.next();
    }

    // Validate plan ID for subscription operations
    const url = new URL(request.url);
    const planId = url.searchParams.get('planId');

    if (planId && !(await validatePlan(planId))) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 404 });
    }
  }

  // Handle authentication
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Verify user exists
  try {
    const response = await fetch(`${request.nextUrl.origin}/api/auth/verify-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: token.email }),
    });

    const data = await response.json();

    if (!data.userExists) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  } catch (error) {
    console.error('User verification error:', error);
    // If verification fails, still continue (don't block users unnecessarily)
  }

  return NextResponse.next();
}

// Apply middleware to all routes that should be protected or need session refresh
export const config = {
  matcher: [
    // Refresh session for all routes except for specific excluded paths
    '/((?!_next/static|_next/image|favicon.ico|.well-known).*)',
  ],
};
