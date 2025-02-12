import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Allow test tokens in development/test environment
  if (process.env.NODE_ENV !== 'production' && authHeader?.startsWith('Bearer mock_session_')) {
    return NextResponse.next();
  }

  // Continue with normal auth flow
  return NextResponse.next();
}

export default withAuth(
  function middleware(request: NextRequest) {
    //... your middleware logic...
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/api/:path*']
};
