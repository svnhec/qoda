"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Shield, Lock, CreditCard, ExternalLink, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function StripeConnectPage() {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleLaunchStripe = () => {
    setIsConnecting(true)
    // In production, this would redirect to Stripe Connect onboarding
    setTimeout(() => {
      window.location.href = "/onboarding/stripe-return?success=true"
    }, 1500)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Back button */}
      <motion.div className="fixed top-6 left-6" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Link
          href="/onboarding"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Setup
        </Link>
      </motion.div>

      {/* Step indicator */}
      <motion.div
        className="fixed top-6 right-6 text-xs text-muted-foreground uppercase tracking-wider"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Step 2 of 4 — Infrastructure
      </motion.div>

      {/* Main card */}
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
      >
        <div className="glass-card p-8 md:p-10">
          {/* Connection diagram */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {/* Your Agency */}
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-2">
                <span className="text-primary font-bold text-2xl">Q</span>
              </div>
              <span className="text-xs text-muted-foreground">Your Agency</span>
            </motion.div>

            {/* Connection line */}
            <div className="flex-1 relative h-2 mx-4">
              <div className="absolute inset-0 bg-white/5 rounded-full" />
              <motion.div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  background: isConnecting
                    ? "linear-gradient(90deg, oklch(0.8 0.2 155), #635BFF)"
                    : "linear-gradient(90deg, oklch(0.8 0.2 155 / 0.3), oklch(0.5 0.1 0 / 0.3))",
                }}
                initial={{ width: "0%" }}
                animate={{ width: isConnecting ? "100%" : "30%" }}
                transition={{ duration: isConnecting ? 1 : 0.5 }}
              />
              {/* Pulse effect when connecting */}
              {isConnecting && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#635BFF]/30"
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                />
              )}
              {/* Status indicator */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2"
                style={{
                  borderColor: isConnecting ? "#635BFF" : "oklch(0.5 0.1 0)",
                  backgroundColor: isConnecting ? "#635BFF" : "transparent",
                }}
                animate={isConnecting ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5, repeat: isConnecting ? Number.POSITIVE_INFINITY : 0 }}
              />
            </div>

            {/* Banking Network */}
            <motion.div
              className="flex flex-col items-center"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-[#635BFF]/10 border border-[#635BFF]/30 flex items-center justify-center mb-2">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#635BFF">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                </svg>
              </div>
              <span className="text-xs text-muted-foreground">Banking Network</span>
            </motion.div>
          </div>

          {/* Status text */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <motion.span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isConnecting ? "#635BFF" : "oklch(0.5 0.1 0)" }}
                animate={isConnecting ? { opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
              />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                {isConnecting ? "ESTABLISHING CONNECTION..." : "DISCONNECTED"}
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold mb-3 uppercase tracking-wide">Establish Financial Uplink</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To issue virtual cards, Qoda requires Identity Verification (KYB) via our banking partner, Stripe. This
              process is encrypted and takes 2-5 minutes.
            </p>
          </motion.div>

          {/* Launch Button */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Button
              onClick={handleLaunchStripe}
              disabled={isConnecting}
              className="w-full h-14 text-base font-semibold relative overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, #635BFF 0%, #8B5CF6 100%)",
                boxShadow: "0 0 30px rgba(99, 91, 255, 0.4), 0 0 60px rgba(99, 91, 255, 0.2)",
              }}
            >
              {/* Glow effect on hover */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, #7C73FF 0%, #9D8CFF 100%)",
                }}
              />
              <span className="relative flex items-center justify-center gap-2">
                {isConnecting ? (
                  <>
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                    Connecting to Stripe...
                  </>
                ) : (
                  <>
                    Launch Stripe Verification Portal
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </span>
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4 text-primary" />
              <span>SOC2 Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-4 h-4 text-primary" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="w-4 h-4 text-[#635BFF]" />
              <span>Stripe Issuing</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
