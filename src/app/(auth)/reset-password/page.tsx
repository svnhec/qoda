"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, ShieldCheck, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  // Password strength calculation
  const strength = useMemo(() => {
    if (!password)
      return { level: 0, label: "NONE", color: "bg-white/10", textColor: "text-muted-foreground", entropy: 0 }

    let score = 0
    let entropy = 0

    // Length
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1
    if (password.length >= 16) score += 1
    entropy += password.length * 4

    // Character variety
    if (/[a-z]/.test(password)) {
      score += 1
      entropy += 26
    }
    if (/[A-Z]/.test(password)) {
      score += 1
      entropy += 26
    }
    if (/[0-9]/.test(password)) {
      score += 1
      entropy += 10
    }
    if (/[^a-zA-Z0-9]/.test(password)) {
      score += 2
      entropy += 32
    }

    if (score <= 2)
      return {
        level: 1,
        label: "VULNERABLE",
        color: "bg-red-500",
        textColor: "text-red-500 glow-text-red",
        entropy: Math.min(entropy, 40),
      }
    if (score <= 4)
      return {
        level: 2,
        label: "WEAK",
        color: "bg-orange-500",
        textColor: "text-orange-500",
        entropy: Math.min(entropy, 64),
      }
    if (score <= 6)
      return {
        level: 3,
        label: "MODERATE",
        color: "bg-yellow-500",
        textColor: "text-yellow-500",
        entropy: Math.min(entropy, 96),
      }
    return {
      level: 4,
      label: "SECURE",
      color: "bg-primary",
      textColor: "text-primary glow-text",
      entropy: Math.min(entropy, 128),
    }
  }, [password])

  const passwordsMatch = password && confirmPassword && password === confirmPassword
  const passwordsMismatch = password && confirmPassword && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password || !confirmPassword) {
      setError("All fields are required")
      return
    }

    if (password !== confirmPassword) {
      setError("CHECKSUM MISMATCH")
      return
    }

    if (strength.level < 3) {
      setError("Password entropy too low")
      return
    }

    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 2000))
    setIsLoading(false)
    setSuccess(true)

    // Redirect after success
    setTimeout(() => router.push("/login"), 3000)
  }

  if (success) {
    return (
      <motion.div
        className={cn(
          "relative z-10 w-full max-w-md mx-4",
          "glass-card-intense p-8 md:p-10",
          "border border-primary/30",
        )}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 80 }}
        style={{ boxShadow: "0 0 80px oklch(0.8 0.2 155 / 0.15)" }}
      >
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div
            className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6 glow-green"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <ShieldCheck className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-xl font-bold tracking-tight mb-2 uppercase glow-text">Credentials Updated</h1>
          <p className="text-sm text-muted-foreground mb-2">
            Your security credentials have been successfully overwritten.
          </p>
          <p className="text-xs text-primary font-mono">Redirecting to login...</p>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={cn("relative z-10 w-full max-w-md mx-4", "glass-card-intense p-8 md:p-10", "border border-white/10")}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 80, damping: 20 }}
    >
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-2 uppercase">Overwrite Security Credentials</h1>
        <p className="text-sm text-muted-foreground">Define your new authentication key.</p>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm text-center font-mono"
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
          >
            <span className="glow-text-red">ERROR: {error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* New Password Field */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
            New Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              className={cn(
                "bg-slate-900 border-white/10 h-12 text-base font-mono pr-12 tracking-widest",
                "focus:border-primary focus:ring-primary/20",
                "placeholder:text-muted-foreground/50 placeholder:tracking-normal",
                password && "border-primary/50",
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Security Entropy Meter */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground uppercase tracking-wider">Security Entropy</span>
              <span className={cn("font-mono", strength.textColor)}>{strength.label}</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
              <motion.div
                className={cn("h-full rounded-full", strength.color)}
                initial={{ width: 0 }}
                animate={{ width: `${(strength.level / 4) * 100}%` }}
                transition={{ type: "spring", stiffness: 100 }}
                style={{
                  boxShadow: strength.level >= 4 ? "0 0 10px oklch(0.8 0.2 155 / 0.5)" : undefined,
                }}
              />
            </div>
            {strength.level >= 4 && (
              <motion.div
                className="text-xs font-mono text-primary glow-text text-right"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Entropy: {strength.entropy}-bit
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Confirm Password Field */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider text-muted-foreground">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••••••"
              className={cn(
                "bg-slate-900 border-white/10 h-12 text-base font-mono pr-12 tracking-widest",
                "focus:border-primary focus:ring-primary/20",
                "placeholder:text-muted-foreground/50 placeholder:tracking-normal",
                passwordsMatch && "border-primary/50",
                passwordsMismatch && "border-red-500/50",
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Checksum Status */}
          <AnimatePresence>
            {passwordsMismatch && (
              <motion.div
                className="text-xs font-mono text-red-500 glow-text-red"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                CHECKSUM MISMATCH
              </motion.div>
            )}
            {passwordsMatch && (
              <motion.div
                className="text-xs font-mono text-primary glow-text"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                CHECKSUM VERIFIED
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Submit Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Button
            type="submit"
            disabled={isLoading || !passwordsMatch || strength.level < 3}
            className={cn(
              "w-full h-12 text-base font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isLoading && "glow-green",
            )}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.span
                  key="loading"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encrypting...</span>
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Update Credentials
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </form>

      {/* Back to Login */}
      <motion.p
        className="text-center text-sm text-muted-foreground mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Link href="/login" className="hover:text-primary transition-colors">
          &larr; Return to Login
        </Link>
      </motion.p>
    </motion.div>
  )
}
