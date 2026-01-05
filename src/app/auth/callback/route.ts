/**
 * AUTH CALLBACK ROUTE
 * =============================================================================
 * Handles Supabase auth callbacks for email confirmation and password reset.
 * Exchanges auth code for session and redirects appropriately.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { logAuditEvent } from "@/lib/db/audit";

/**
 * Handle auth callback from Supabase email links.
 * This route is called when users click email confirmation or password reset links.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const type = searchParams.get("type");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Create response to manipulate cookies
    const response = NextResponse.redirect(`${origin}/auth/login`);

    // Handle error cases
    if (error) {
      console.error("Auth callback error:", error, errorDescription);

      // Log the error
      await logAuditEvent({
        action: "auth_callback_error",
        resource_type: "auth_callback",
        status: "failure",
        error: errorDescription || error,
        metadata: {
          error_code: error,
          error_description: errorDescription,
          callback_type: type,
        },
      });

      // Redirect to login with error
      const loginUrl = new URL("/auth/login", origin);
      loginUrl.searchParams.set("error", errorDescription || error);
      return NextResponse.redirect(loginUrl);
    }

    // No code provided - redirect to login
    if (!code) {
      console.warn("Auth callback called without code");
      return NextResponse.redirect(`${origin}/auth/login`);
    }

    // Create Supabase client for server-side auth
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

    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Failed to exchange code for session:", exchangeError);

      await logAuditEvent({
        action: "auth_callback_exchange_failed",
        resource_type: "auth_callback",
        status: "failure",
        error: exchangeError.message,
        metadata: {
          callback_type: type,
          error_code: exchangeError.message,
        },
      });

      const loginUrl = new URL("/auth/login", origin);
      loginUrl.searchParams.set("error", "Failed to complete authentication");
      return NextResponse.redirect(loginUrl);
    }

    const { user, session } = data;

    if (!user || !session) {
      console.error("No user or session returned from code exchange");

      await logAuditEvent({
        action: "auth_callback_no_user_session",
        resource_type: "auth_callback",
        status: "failure",
        metadata: {
          callback_type: type,
          has_user: !!user,
          has_session: !!session,
        },
      });

      const loginUrl = new URL("/auth/login", origin);
      loginUrl.searchParams.set("error", "Authentication failed");
      return NextResponse.redirect(loginUrl);
    }

    // Log successful auth callback
    await logAuditEvent({
      action: "auth_callback_success",
      resource_type: "auth_callback",
      resource_id: user.id,
      user_id: user.id,
      status: "success",
      metadata: {
        callback_type: type,
        email: user.email,
        email_confirmed: user.email_confirmed_at ? true : false,
        provider: user.app_metadata?.provider,
      },
    });

    // Determine redirect destination based on callback type
    let redirectPath = "/dashboard";

    if (type === "recovery") {
      // Password reset - redirect to reset password page
      redirectPath = "/auth/reset-password";
    } else if (type === "signup") {
      // Email confirmation after signup - redirect to onboarding
      redirectPath = "/auth/onboarding";
    } else if (type === "invite") {
      // Team invite acceptance - redirect to dashboard
      redirectPath = "/dashboard";
    } else {
      // Default - redirect to dashboard
      redirectPath = "/dashboard";
    }

    // Check if there's a redirect parameter in the original request
    const redirectTo = searchParams.get("redirect");
    if (redirectTo && redirectTo.startsWith("/")) {
      // Only allow relative redirects to prevent open redirect attacks
      redirectPath = redirectTo;
    }

    const redirectUrl = new URL(redirectPath, origin);

    // Add success message for better UX
    if (type === "recovery") {
      redirectUrl.searchParams.set("message", "Password reset link confirmed. Please set your new password.");
    } else if (type === "signup") {
      redirectUrl.searchParams.set("message", "Email confirmed! Let's get you set up.");
    }

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("Auth callback route error:", error);

    // Log the unexpected error
    await logAuditEvent({
      action: "auth_callback_unexpected_error",
      resource_type: "auth_callback",
      status: "failure",
      error: error instanceof Error ? error.message : "Unknown error",
      metadata: {
        error_type: error instanceof Error ? error.constructor.name : typeof error,
      },
    });

    // Fail safe - redirect to login
    const origin = new URL(request.url).origin;
    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("error", "An unexpected error occurred");
    return NextResponse.redirect(loginUrl);
  }
}
