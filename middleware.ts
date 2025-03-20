import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

interface Plan {
  plan_id: string;
}

async function validatePlan(planId: string) {
  // Validate plan existence and status
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/subscriptions/plans`);
  const { plans } = await response.json();
  return plans.some((plan: Plan) => plan.plan_id === planId);
}

export async function middleware(request: NextRequest) {
  // Skip auth checks for Next.js API routes related to authentication
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });
  const isAuthenticated = !!token;
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth/');
  const isDebugPage = request.nextUrl.pathname.startsWith('/debug');
  const isRootPage = request.nextUrl.pathname === '/';
  const isProtectedRoute = !isAuthPage && !isDebugPage && !isRootPage;

  // Redirect authenticated users from auth pages to main app
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/c', request.url));
  }

  // Allow access to debug pages regardless of auth status
  if (isDebugPage) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users from protected routes to login
  if (!isAuthenticated && isProtectedRoute) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
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

  // Verify user exists for protected routes
  if (token?.email && isProtectedRoute) {
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) except api/auth routes which need to be checked
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/debug (debug API routes)
     */
    '/((?!api/debug|_next/static|_next/image|favicon.ico).*)',
    '/api/auth/:path*',
    '/api/chat/:path*',
    '/api/subscriptions/:path*',
    '/api/webhook'
  ],
};
