import { NextRequest, NextResponse } from 'next/server';

// Define protected routes - updated for new structure
const protectedRoutes = ['/dashboard', '/dial', '/history'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Check for session cookie using simple cookie parsing
    // better-auth uses 'better-auth.session_token' cookie name
    const sessionCookie = request.cookies.get('better-auth.session_token');

    if (!sessionCookie?.value) {
      // Redirect to login with return URL
      const url = new URL('/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).)',
  ],
};
