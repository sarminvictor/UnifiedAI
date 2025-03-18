import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';
import { getToken } from 'next-auth/jwt';

// Paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/subscriptions',
  '/settings',
  '/chat',
];

// Paths that are always accessible
const publicPaths = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/api/auth',
  '/api/webhook',
];

export async function middleware(request: NextRequest) {
  try {
    // Get the pathname from the URL
    const { pathname } = request.nextUrl;

    // Check if the pathname is a protected path
    const isProtectedPath = protectedPaths.some(path =>
      pathname === path || pathname.startsWith(`${path}/`)
    );

    // Check if the pathname is a public path
    const isPublicPath = publicPaths.some(path =>
      pathname === path || pathname.startsWith(`${path}/`)
    );

    // If the path is not protected or is public, allow access
    if (!isProtectedPath || isPublicPath) {
      return NextResponse.next();
    }

    // Check NextAuth session
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    // If NextAuth session exists, allow access
    if (token) {
      return NextResponse.next();
    }

    // If no NextAuth session, try Supabase
    const { supabase, response } = createClient(request);
    const { data: { session } } = await supabase.auth.getSession();

    // If no session from either auth method and trying to access protected path, redirect to login
    if (!session && isProtectedPath) {
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // User has Supabase session, allow access to protected routes
    return response;
  } catch (error) {
    console.error('Middleware error:', error);

    // In case of error, allow the request to proceed
    // The server component will handle authentication if needed
    return NextResponse.next();
  }
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    // Exclude specific static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
