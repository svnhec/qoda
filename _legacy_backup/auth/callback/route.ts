/**
 * Auth Callback Route Handler
 * =============================================================================
 * Handles OAuth callbacks and email confirmation redirects from Supabase Auth.
 * 
 * This route is called when:
 * - Users click the confirmation link in their email
 * - OAuth providers (Google, GitHub, etc.) redirect back after authentication
 * - Magic link authentication completes
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  
  // Get the authorization code from the URL
  const code = searchParams.get("code");
  // Get the redirect path (defaults to dashboard)
  const redirectTo = searchParams.get("redirect") || searchParams.get("next") || "/dashboard";
  // Get any error information
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle error cases from Supabase/OAuth provider
  if (error) {
    console.error("[Auth Callback] Error:", error, errorDescription);
    // Redirect to login with error message
    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(loginUrl);
  }

  // If no code, redirect to login
  if (!code) {
    console.error("[Auth Callback] No code provided");
    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("error", "No authorization code provided");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabase = await createClient();

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[Auth Callback] Session exchange failed:", exchangeError.message);
      const loginUrl = new URL("/auth/login", origin);
      loginUrl.searchParams.set("error", exchangeError.message);
      return NextResponse.redirect(loginUrl);
    }

    // Success! Redirect to the intended destination
    // Ensure the redirect path is relative to prevent open redirect vulnerabilities
    const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/dashboard";
    
    return NextResponse.redirect(new URL(safeRedirect, origin));
  } catch (err) {
    console.error("[Auth Callback] Unexpected error:", err);
    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("error", "Authentication failed. Please try again.");
    return NextResponse.redirect(loginUrl);
  }
}
