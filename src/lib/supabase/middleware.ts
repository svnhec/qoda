/**
 * SWITCHBOARD SUPABASE MIDDLEWARE
 * =============================================================================
 * Next.js middleware for Supabase authentication.
 * Refreshes auth session on every request and protects routes.
 * =============================================================================
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Create a Supabase client for middleware.
 * Uses cookies from the request/response cycle.
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, response };
}

/**
 * Middleware function to refresh auth session and protect routes.
 * 
 * Protected routes:
 * - /dashboard/* - Requires authentication
 * 
 * Public routes:
 * - /auth/* - Authentication pages
 * - /api/* - API routes (handled separately)
 * - / - Landing page
 */
export async function updateSession(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);

  // Refresh the session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Check if accessing protected route
  const isProtectedRoute = pathname.startsWith("/dashboard");
  const isAuthRoute = pathname.startsWith("/auth");
  const isSignOutRoute = pathname === "/auth/signout";

  // If accessing protected route without auth, redirect to login
  if (isProtectedRoute && (!user || authError)) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing auth routes while authenticated, redirect to dashboard
  // IMPORTANT: Allow /auth/signout to be accessed while authenticated.
  if (isAuthRoute && !isSignOutRoute && user && !authError) {
    const redirectUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Allow the request to proceed
  return response;
}

