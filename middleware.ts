import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

async function validatePlan(planId: string) {
  // Validate plan existence and status
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/subscriptions/plans`);
  const { plans } = await response.json();
  return plans.some(plan => plan.plan_id === planId);
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Allow requests to the sign-in page
  if (request.nextUrl.pathname.startsWith('/auth/signin')) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/api/subscriptions/:path*'
  ],
};
