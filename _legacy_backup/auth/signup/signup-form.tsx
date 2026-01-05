"use client";

/**
 * SIGNUP FORM - Multi-step Registration
 * =============================================================================
 * Steps:
 * 1. Account (Email, Password) with strength meter
 * 2. Organization (Agency Name) with availability check
 * 3. Terms acceptance
 * =============================================================================
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, XCircle, ArrowLeft, ArrowRight } from "lucide-react";

interface Props {
  redirectTo?: string;
  error?: string;
}

type Step = 1 | 2 | 3;

export function SignupForm({ redirectTo, error: initialError }: Props) {
  // Form state
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Password strength calculation
  const getPasswordStrength = useCallback((pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 15;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 20;
    if (/\d/.test(pwd)) score += 20;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 20;

    if (score < 40) return { score, label: "Weak", color: "bg-destructive" };
    if (score < 70) return { score, label: "Fair", color: "bg-warning" };
    return { score, label: "Strong", color: "bg-accent" };
  }, []);

  const passwordStrength = getPasswordStrength(password);

  // Check organization slug availability
  useEffect(() => {
    if (!agencyName) {
      setSlugAvailable(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setIsCheckingSlug(true);
    debounceRef.current = setTimeout(async () => {
      const slug = agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);

      const { data } = await supabase
        .from("organizations")
        .select("slug")
        .eq("slug", slug)
        .single();

      setSlugAvailable(!data);
      setIsCheckingSlug(false);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [agencyName, supabase]);

  // Validation
  const validateStep = (): boolean => {
    if (step === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please enter a valid email address");
        return false;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return false;
      }
    }
    if (step === 2) {
      if (!agencyName.trim()) {
        setError("Please enter your agency name");
        return false;
      }
      if (slugAvailable === false) {
        setError("That agency name is already taken");
        return false;
      }
    }
    if (step === 3) {
      if (!agreeTerms) {
        setError("Please accept the Terms of Service");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    setError("");
    if (!validateStep()) return;

    if (step < 3) {
      setStep((step + 1) as Step);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
      setError("");
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback${redirectTo ? `?redirect=${redirectTo}` : ""}`,
          data: {
            agency_name: agencyName,
          },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("That email is already in use. Try logging in instead.");
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/onboarding");
        }, 1500);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-accent" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-white">Welcome to Qoda!</h3>
          <p className="text-sm text-muted-foreground">Setting up your command center...</p>
        </div>
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleNext(); }}
      className="p-6 space-y-5"
    >
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-border'}`} />
          </div>
        ))}
        <span className="text-xs text-muted-foreground ml-2">Step {step}/3</span>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            {error}
            {error.includes("already in use") && (
              <a href="/auth/login" className="block mt-1 text-primary hover:underline">
                Login here →
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 1: Account */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.com"
                className="input"
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="label">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                autoComplete="new-password"
              />

              {/* Password Strength Meter */}
              {password && (
                <div className="space-y-1">
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={
                      passwordStrength.score < 40 ? 'text-destructive' :
                        passwordStrength.score < 70 ? 'text-warning' : 'text-accent'
                    }>
                      {passwordStrength.label}
                    </span>
                    <span className="text-muted-foreground">
                      {password.length < 8 && "8+ characters"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Organization */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="agencyName" className="label">Agency name</label>
              <div className="relative">
                <input
                  type="text"
                  id="agencyName"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="Acme AI Agency"
                  className={`input pr-10 ${slugAvailable === false ? 'input-error' : ''}`}
                  autoFocus
                />
                {/* Availability indicator */}
                {agencyName && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingSlug ? (
                      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    ) : slugAvailable ? (
                      <CheckCircle className="w-5 h-5 text-accent" />
                    ) : slugAvailable === false ? (
                      <XCircle className="w-5 h-5 text-destructive" />
                    ) : null}
                  </div>
                )}
              </div>
              {agencyName && (
                <p className="helper-text">
                  Your workspace: <span className="text-foreground font-mono">{agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.qoda.io</span>
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 3: Terms */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="p-4 rounded-lg bg-secondary border border-border">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                  I understand that Qoda uses Stripe for payments and card issuing.
                </span>
              </label>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              By creating an account, you consent to receive product updates. Unsubscribe anytime.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-2">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : step === 3 ? (
            "Create Account"
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
