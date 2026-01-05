"use client";

/**
 * Login Form - Qoda Design
 * =============================================================================
 * Magic link first with SSO options (GitHub, Google).
 * Features:
 * - Auto-focus email input
 * - 300ms validation debounce
 * - Loading spinner on submit
 * - Success state with "Check your email" message
 * - Error states (not found, rate limit)
 * =============================================================================
 */

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface Props {
  redirectTo?: string;
  error?: string;
}

export function LoginForm({ redirectTo, error: initialError }: Props) {
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState(initialError || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced validation (300ms)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setIsValid(emailRegex.test(email));
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [email]);

  // Handle Magic Link
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback${redirectTo ? `?redirect=${redirectTo}` : ""}`,
        },
      });

      if (authError) {
        if (authError.message.includes("rate limit")) {
          setError("Too many login attempts. Cool down for 2 minutes.");
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      setIsSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  // Handle SSO
  const handleSSO = async (provider: "github" | "google") => {
    setIsLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback${redirectTo ? `?redirect=${redirectTo}` : ""}`,
        },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  // Success state
  if (isSent) {
    return (
      <div className="text-center space-y-6 py-8">
        {/* Envelope icon with animation */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 animate-bounce">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Check your email</h2>
          <p className="text-white/50 text-sm">
            We sent a magic link to <span className="text-white">{email}</span>
          </p>
        </div>

        <button
          onClick={() => {
            setIsSent(false);
            setEmail("");
          }}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
          {error.includes("couldn't find") && (
            <a href="/auth/signup" className="block mt-1 text-cyan-400 hover:underline">
              Create an account →
            </a>
          )}
        </div>
      )}

      {/* SSO Buttons - Monochrome until hover */}
      <div className="space-y-3">
        <button
          onClick={() => handleSSO("github")}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-[#24292e] hover:text-white hover:border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {/* GitHub icon - monochrome until hover */}
          <svg className="w-5 h-5 text-white/50 group-hover:text-white transition-colors duration-200" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
          </svg>
          <span className="font-medium">Continue with GitHub</span>
        </button>

        <button
          onClick={() => handleSSO("google")}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white hover:text-[#4285F4] hover:border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {/* Google icon - monochrome until hover */}
          <svg className="w-5 h-5 text-white/50 group-hover:text-[#4285F4] transition-colors duration-200" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="font-medium">Continue with Google</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 bg-[#050505] text-white/40">or</span>
        </div>
      </div>

      {/* Magic Link Form */}
      <form onSubmit={handleMagicLink} className="space-y-6">
        {/* Large, Singular Email Field */}
        <div className="relative">
          <input
            ref={inputRef}
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid && !isLoading) {
                handleMagicLink(e);
              }
            }}
            placeholder="Enter your work email"
            className="w-full px-4 py-4 text-lg bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20 transition-all duration-200"
            disabled={isLoading}
          />
        </div>

        {/* Primary Magic Link CTA */}
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={`w-full py-4 text-lg font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
            isValid && !isLoading
              ? "bg-gradient-to-r from-cyan-400 to-emerald-500 text-obsidian hover:from-cyan-300 hover:to-emerald-400 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Sending magic link...</span>
            </>
          ) : (
            "Send Magic Link"
          )}
        </button>
      </form>

      {/* Password fallback */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            // Could toggle to password form
          }}
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          Sign in with password instead
        </button>
      </div>
    </div>
  );
}
