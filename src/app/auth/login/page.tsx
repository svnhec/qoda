/**
 * LOGIN PAGE - Qoda Authentication
 * =============================================================================
 * Clean, professional login with magic link + Google OAuth
 * Split-screen layout: Form left, Visual right
 * =============================================================================
 */

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthVisual } from "@/components/auth/auth-visual";
import Link from "next/link";
import { Activity } from "lucide-react";

function LoginContent({ searchParams }: { searchParams: { redirect?: string; error?: string } }) {
  return (
    <div className="min-h-screen flex">
      {/* LEFT: Form Section */}
      <div className="w-full lg:w-[45%] min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-20 relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />

        <div className="relative z-10 w-full max-w-md mx-auto space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-white">Qoda</span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to access your financial command center
            </p>
          </div>

          {/* Error Message */}
          {searchParams.error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                {searchParams.error === "access_denied"
                  ? "Authentication failed. Please try again."
                  : searchParams.error}
              </p>
            </div>
          )}

          {/* Login Form */}
          <LoginForm redirectTo={searchParams.redirect} />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                New to Qoda?
              </span>
            </div>
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/auth/signup"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Create your organization →
            </Link>
          </p>

          {/* Trust indicators */}
          <div className="pt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              SOC2 Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              256-bit Encryption
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: Visual Section (hidden on mobile) */}
      <div className="hidden lg:block lg:w-[55%] min-h-screen relative overflow-hidden">
        <AuthVisual />
      </div>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent searchParams={params} />
    </Suspense>
  );
}
