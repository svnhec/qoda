"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldCheck, Send } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Email address required")
      return
    }

    if (!email.includes("@")) {
      setError("Invalid email format")
      return
    }

    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 2000))
    setIsLoading(false)
    setSent(true)
  }

  if (sent) {
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
        style={{ boxShadow: "0 0 60px oklch(0.8 0.2 155 / 0.1)" }}
      >
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div
            className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6 glow-green"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <ShieldCheck className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-xl font-bold tracking-tight mb-2 uppercase">Recovery Signal Transmitted</h1>
          <p className="text-sm text-muted-foreground mb-6">
            If an account exists for <span className="font-mono text-primary">{email}</span>, a password override link
            has been dispatched.
          </p>
          <Link href="/login">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 bg-transparent">
              &larr; Return to Login
            </Button>
          </Link>
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
        <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-yellow-500" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-2 uppercase">Initiate Recovery Sequence</h1>
        <p className="text-sm text-muted-foreground">
          Enter your registered identity to receive a password override link.
        </p>
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
        {/* Email Field */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
            Authorized Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@qoda.io"
            className={cn(
              "bg-slate-900 border-white/10 h-12 text-base font-mono",
              "focus:border-primary focus:ring-primary/20",
              "placeholder:text-muted-foreground/50",
              email && "border-primary/50",
            )}
          />
        </motion.div>

        {/* Submit Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full h-12 text-base font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
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
                  <span>Transmitting...</span>
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Send className="w-4 h-4" />
                  Send Recovery Signal
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
        transition={{ delay: 0.5 }}
      >
        <Link href="/login" className="hover:text-primary transition-colors">
          &larr; Return to Login
        </Link>
      </motion.p>
    </motion.div>
  )
}
