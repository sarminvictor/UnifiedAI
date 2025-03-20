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
  // Get the pathname of the request
  const { pathname } = request.nextUrl;

  // Allow access to static assets and API routes (except those that need auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/debug/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/static/')
  ) {
    return NextResponse.next();
  }

  // Check for authentication token
  const token = await getToken({ req: request });

  // Define authentication routes that should be accessible without auth
  const isAuthRoute =
    pathname.startsWith('/auth/') ||
    pathname === '/auth' ||
    pathname.startsWith('/debug/') ||
    pathname === '/debug';

  // Define payment callback routes (should remain accessible)
  const isPaymentRoute =
    pathname === '/payment/success' ||
    pathname === '/payment/failed';

  // Define public routes that don't require authentication
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/');

  // Allow authenticated users to access payment routes
  if (isPaymentRoute && token) {
    return NextResponse.next();
  }

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to signin for all protected routes
  if (!token && !isAuthRoute && !isPublicRoute) {
    // Save the original URL as the callback URL
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth routes to the app
  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Handle subscription-related routes
  if (pathname.startsWith('/api/subscriptions')) {
    // Skip validation for plans listing
    if (pathname === '/api/subscriptions/plans') {
      return NextResponse.next();
    }

    // Validate plan ID for subscription operations
    const url = new URL(request.url);
    const planId = url.searchParams.get('planId');

    if (planId && !(await validatePlan(planId))) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 404 });
    }
  }

  // Verify user exists for all authenticated routes
  if (token?.email && !isAuthRoute && !isPublicRoute) {
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
      console.error('Error verifying user:', error);
      // If verification fails, redirect to sign in as a fallback
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  // Allow the request to continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - static (static files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|static).*)',
  ],
};
