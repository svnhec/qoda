/**
 * LOGIN FORM COMPONENT
 * =============================================================================
 * Handles both Magic Link and Google OAuth authentication
 * Clean, accessible, with proper loading states
 * =============================================================================
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserClient } from "@supabase/ssr";
import { Mail, Loader2, CheckCircle, Chrome } from "lucide-react";

interface LoginFormProps {
    redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    // Magic Link Handler
    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isValidEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }

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
                    setError("Too many attempts. Please wait a few minutes.");
                } else {
                    setError(authError.message);
                }
                setIsLoading(false);
                return;
            }

            setIsSuccess(true);
        } catch {
            setError("Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    // Google OAuth Handler
    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        setError("");

        try {
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback${redirectTo ? `?redirect=${redirectTo}` : ""}`,
                },
            });

            if (authError) {
                setError(authError.message);
                setIsGoogleLoading(false);
            }
        } catch {
            setError("Failed to connect with Google. Please try again.");
            setIsGoogleLoading(false);
        }
    };

    // Success State
    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4 py-8"
            >
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-accent" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">Check your email</h3>
                    <p className="text-muted-foreground text-sm">
                        We sent a magic link to <span className="text-white">{email}</span>
                    </p>
                </div>
                <button
                    onClick={() => {
                        setIsSuccess(false);
                        setEmail("");
                    }}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                    Use a different email
                </button>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Google OAuth Button */}
            <button
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Chrome className="w-5 h-5" />
                )}
                Continue with Google
            </button>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        or continue with email
                    </span>
                </div>
            </div>

            {/* Magic Link Form */}
            <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                    <label htmlFor="email" className="label">
                        Email address
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError("");
                            }}
                            placeholder="you@company.com"
                            className={`input pl-10 ${error ? "input-error" : ""}`}
                            disabled={isLoading}
                            autoComplete="email"
                            autoFocus
                        />
                    </div>
                    <AnimatePresence>
                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="error-text"
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="btn-primary w-full py-3"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending magic link...
                        </>
                    ) : (
                        "Send magic link"
                    )}
                </button>
            </form>

            {/* Helper text */}
            <p className="text-xs text-muted-foreground text-center">
                By continuing, you agree to our{" "}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
        </div>
    );
}
