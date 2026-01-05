"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Mail, ExternalLink, RefreshCw, Radio } from "lucide-react"
import { cn } from "@/lib/utils"

export default function VerifyEmailPage() {
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const email = "user@example.com" // This would come from auth state

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [cooldown])

  const handleResend = async () => {
    if (cooldown > 0) return
    setResending(true)
    await new Promise((r) => setTimeout(r, 1500))
    setResending(false)
    setResent(true)
    setCooldown(60)
    setTimeout(() => setResent(false), 3000)
  }

  return (
    <motion.div
      className={cn("relative z-10 w-full max-w-lg mx-4", "glass-card-intense p-8 md:p-10", "border border-primary/30")}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring" as const, stiffness: 80, damping: 20 }}
      style={{ boxShadow: "0 0 80px oklch(0.8 0.2 155 / 0.15)" }}
    >
      {/* Pulsing border animation */}
      <motion.div
        className="absolute inset-0 rounded-2xl border border-primary/50 pointer-events-none"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />

      {/* Signal Dish Icon */}
      <motion.div
        className="flex justify-center mb-8"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring" as const }}
      >
        <div className="relative">
          <motion.div
            className="w-24 h-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center glow-green"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          >
            <Radio className="w-10 h-10 text-primary" />
          </motion.div>
          {/* Scanning rings */}
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              className="absolute inset-0 rounded-full border border-primary/20"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5 + ring * 0.3, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                delay: ring * 0.4,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-2 uppercase">
          Uplink Established: Verification Required
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A secure access token has been sent to <span className="font-mono text-primary glow-text">{email}</span>.
          <br />
          Please authorize the connection to proceed.
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          asChild
          className={cn(
            "w-full h-14 text-base font-medium",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "glow-green",
          )}
        >
          <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer">
            <Mail className="w-5 h-5 mr-2" />
            Open Mail Client
            <ExternalLink className="w-4 h-4 ml-2 opacity-50" />
          </a>
        </Button>

        <div className="text-center">
          <AnimatePresence mode="wait">
            {resent ? (
              <motion.span
                key="resent"
                className="text-sm text-primary glow-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Token resent successfully
              </motion.span>
            ) : (
              <motion.button
                key="resend"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className={cn(
                  "text-sm text-muted-foreground hover:text-primary transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center gap-2 mx-auto",
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <RefreshCw className={cn("w-3 h-3", resending && "animate-spin")} />
                {resending ? "Transmitting..." : cooldown > 0 ? `Resend Token (${cooldown}s)` : "Resend Token"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* System Status Ticker */}
      <motion.div
        className="mt-8 pt-6 border-t border-white/[0.06]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <motion.span
            className="w-2 h-2 rounded-full bg-yellow-500"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          />
          <span className="uppercase tracking-wider font-mono">System Status: Waiting for user authorization...</span>
        </div>
      </motion.div>

      {/* Back to Login */}
      <motion.p
        className="text-center text-sm text-muted-foreground mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Link href="/login" className="hover:text-primary transition-colors">
          &larr; Return to Login
        </Link>
      </motion.p>
    </motion.div>
  )
}
