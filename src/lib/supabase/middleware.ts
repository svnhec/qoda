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
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // We cannot proceed without these, but we shouldn't 500 the middleware
    // if it's on a non-auth path.
    return { supabase: null, response };
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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
 */
export async function updateSession(request: NextRequest) {
  try {
    const { supabase, response } = createMiddlewareClient(request);

    // If supabase client couldn't be created (missing env vars)
    if (!supabase) {
      return response;
    }

    // Refresh the session - wrapped in try-catch to ignore network errors in middleware
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Allow auth callback route to process without auth checks
    const isAuthCallback = pathname === "/auth/callback";
    const isProtectedRoute = pathname.startsWith("/dashboard") && !isAuthCallback;

    // If accessing protected route without auth, redirect to login
    if (isProtectedRoute && (!user || authError)) {
      const redirectUrl = new URL("/auth/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (error) {
    // Fail safe - allow request to proceed if middleware crashes
    console.error("Middleware error caught:", error);
    return NextResponse.next();
  }
}

