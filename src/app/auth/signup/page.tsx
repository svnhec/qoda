/**
 * SIGNUP PAGE - Qoda Account Creation
 * =============================================================================
 * Multi-step signup with organization creation
 * Centered card layout with glassmorphism
 * =============================================================================
 */

import { Suspense } from "react";
import Link from "next/link";
import { SignupForm } from "./signup-form";
import { Activity } from "lucide-react";

function SignupContent({ searchParams }: { searchParams: { redirect?: string; error?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background">
        <div className="absolute inset-0 bg-grid-fade opacity-30" />
        <div className="absolute inset-0 bg-radial-gradient" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-strong rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <span className="font-bold text-white">Qoda</span>
              </Link>
              <Link
                href="/auth/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
            </div>

            <h1 className="text-xl font-bold text-white">Create your organization</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Join 500+ agencies managing $10M+ AI spend
            </p>
          </div>

          {/* Form */}
          <SignupForm redirectTo={searchParams.redirect} error={searchParams.error} />

          {/* Trust Indicators */}
          <div className="px-6 pb-6 pt-2">
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                SOC2
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                256-bit SSL
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                PCI DSS
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignupContent searchParams={params} />
    </Suspense>
  );
}
