import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth(
  function middleware(request: NextRequest) {
    //... your middleware logic...
  },
  {
    callbacks: {
      authorized: ({ token }) =>!!token,
    },
  }
);

export const config = { matcher: ['/user'] };