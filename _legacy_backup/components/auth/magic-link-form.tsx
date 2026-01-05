/**
 * MAGIC LINK FORM COMPONENT
 * =============================================================================
 * Email input with validation and shake animation on error.
 *
 * Features:
 * - Email validation with regex
 * - Shake animation on invalid email: animate={{ x: [-10, 10, -10, 10, 0] }}
 * - Debounced validation (300ms)
 * - Loading states and success feedback
 * =============================================================================
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { createBrowserClient } from "@supabase/ssr";

interface MagicLinkFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  showSuccessAnimation?: boolean;
}

export function MagicLinkForm({ onSuccess, redirectTo, showSuccessAnimation }: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
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
      setError(""); // Clear error when typing
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      // Trigger shake animation for invalid email
      setShake(true);
      setError("Please enter a valid email address");
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (isLoading) return;

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
          setError("Too many attempts. Please wait 2 minutes.");
        } else {
          setError(authError.message);
        }
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      onSuccess?.();
    } catch {
      setError("Something went wrong. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setIsLoading(false);
    }
  };

  // Success state with animation
  if (isSuccess && showSuccessAnimation) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 py-8"
      >
        {/* Animated envelope */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10"
        >
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </motion.div>

        {/* Success text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <h2 className="text-xl font-semibold text-white">Check your email</h2>
          <p className="text-white/50 text-sm">
            We sent a magic link to <span className="text-white">{email}</span>
          </p>
        </motion.div>

        {/* Reset button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={() => {
            setIsSuccess(false);
            setEmail("");
            setError("");
          }}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Use a different email
        </motion.button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Input with Shake Animation */}
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="relative"
      >
        <input
          ref={inputRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValid && !isLoading) {
              handleSubmit(e);
            }
          }}
          placeholder="Enter your work email"
          className={`w-full px-4 py-4 text-lg bg-white/5 border rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-1 transition-all duration-200 ${
            error
              ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
              : "border-white/10 focus:border-lime-500/50 focus:ring-lime-500/20"
          }`}
          disabled={isLoading}
        />

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-6 left-0 text-xs text-red-400"
          >
            {error}
          </motion.div>
        )}
      </motion.div>

      {/* Submit Button */}
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
  );
}
