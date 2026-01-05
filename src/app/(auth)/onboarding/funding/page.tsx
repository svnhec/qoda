"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, DollarSign, Shield, Zap, Check, Building2, CreditCard, AlertTriangle, Rocket } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const quickAmounts = [100, 250, 500, 1000]

type PaymentMethod = "ach" | "card"

export default function FundingOnboardingPage() {
  const router = useRouter()
  const [amount, setAmount] = useState<number>(100)
  const [customAmount, setCustomAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ach")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleAmountSelect = (value: number) => {
    setAmount(value)
    setCustomAmount("")
  }

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setCustomAmount(value)
    if (value) {
      setAmount(Number.parseInt(value, 10))
    }
  }

  const handleFund = async () => {
    if (amount < 100) return
    setIsProcessing(true)
    await new Promise((r) => setTimeout(r, 2500))
    setIsProcessing(false)
    setIsComplete(true)
  }

  const handleComplete = () => {
    console.log('handleComplete called - redirecting to login')
    // Since users may not be fully authenticated yet (email verification),
    // redirect to login with a success message
    const message = encodeURIComponent("Onboarding complete! Please sign in to access your dashboard.");
    const redirectUrl = `/auth/login?message=${message}&redirect=/dashboard`;
    console.log('Redirecting to:', redirectUrl)
    router.push(redirectUrl);
  }

  const isUnderMinimum = amount < 100

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Back button */}
      <motion.div className="fixed top-6 left-6" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Link
          href="/onboarding/stripe-connect"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
      </motion.div>

      {/* Step indicator */}
      <motion.div
        className="fixed top-6 right-6 text-xs text-muted-foreground uppercase tracking-wider font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Step 4 of 4 — System Fuel
      </motion.div>

      <AnimatePresence mode="wait">
        {!isComplete ? (
          <motion.div
            key="funding-form"
            className="w-full max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring" as const, stiffness: 80, damping: 20 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 uppercase tracking-wider font-mono">
                INITIALIZE LEDGER BALANCE
              </h1>
              <p className="text-sm text-muted-foreground">
                Minimum $100 required to activate card issuing capabilities.
              </p>
            </div>

            <div className="glass-card p-6 md:p-8">
              {/* Amount Input - Large and Central */}
              <div className="mb-6">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block font-mono">
                  Deposit Amount
                </Label>
                <div className="relative mb-4">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
                  <Input
                    type="text"
                    value={customAmount || amount.toString()}
                    onChange={handleCustomAmountChange}
                    className={cn(
                      "pl-14 h-20 text-4xl font-mono font-bold text-center bg-black/50 border-2 transition-colors",
                      isUnderMinimum ? "border-red-500 text-red-500" : "border-primary/30 text-primary",
                    )}
                  />
                </div>

                {isUnderMinimum && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-500 text-sm font-mono mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span className="glow-text-red">MINIMUM_CAPITAL_REQUIRED: $100</span>
                  </motion.div>
                )}

                {/* Quick Select Amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((value) => (
                    <motion.button
                      key={value}
                      onClick={() => handleAmountSelect(value)}
                      className={cn(
                        "h-11 rounded-xl font-mono font-bold text-sm transition-all",
                        amount === value && !customAmount
                          ? "bg-primary/20 border-2 border-primary text-primary"
                          : "bg-white/5 border border-white/10 text-muted-foreground hover:border-white/20",
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      ${value}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Payment Method - Stripe Elements Container */}
              <div className="mb-6">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block font-mono">
                  Payment Method
                </Label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <motion.button
                    onClick={() => setPaymentMethod("ach")}
                    className={cn(
                      "p-4 rounded-xl text-left transition-all relative",
                      paymentMethod === "ach"
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-white/5 border border-white/10 hover:border-white/20",
                    )}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <Building2
                        className={cn("w-5 h-5", paymentMethod === "ach" ? "text-primary" : "text-muted-foreground")}
                      />
                      <span
                        className={cn(
                          "font-semibold text-sm",
                          paymentMethod === "ach" ? "text-primary" : "text-foreground",
                        )}
                      >
                        Bank (ACH)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">No fees</p>
                    {paymentMethod === "ach" && (
                      <motion.div className="absolute top-2 right-2" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check className="w-4 h-4 text-primary" />
                      </motion.div>
                    )}
                  </motion.button>

                  <motion.button
                    onClick={() => setPaymentMethod("card")}
                    className={cn(
                      "p-4 rounded-xl text-left transition-all relative",
                      paymentMethod === "card"
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-white/5 border border-white/10 hover:border-white/20",
                    )}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <CreditCard
                        className={cn("w-5 h-5", paymentMethod === "card" ? "text-primary" : "text-foreground")}
                      />
                      <span
                        className={cn(
                          "font-semibold text-sm",
                          paymentMethod === "card" ? "text-primary" : "text-foreground",
                        )}
                      >
                        Credit Card
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">2.9% + $0.30</p>
                    {paymentMethod === "card" && (
                      <motion.div className="absolute top-2 right-2" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check className="w-4 h-4 text-primary" />
                      </motion.div>
                    )}
                  </motion.button>
                </div>

                <motion.div
                  className="bg-zinc-900/80 rounded-xl p-4 border border-white/5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {paymentMethod === "ach" ? (
                    <div className="text-center py-6">
                      <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Connect your bank account securely via Plaid</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-11 rounded-lg bg-zinc-800 border border-white/10 flex items-center px-4">
                        <span className="text-sm text-zinc-500 font-mono">4242 4242 4242 4242</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-11 rounded-lg bg-zinc-800 border border-white/10 flex items-center px-4">
                          <span className="text-sm text-zinc-500 font-mono">MM / YY</span>
                        </div>
                        <div className="h-11 rounded-lg bg-zinc-800 border border-white/10 flex items-center px-4">
                          <span className="text-sm text-zinc-500 font-mono">CVC</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              <div className="bg-black/50 rounded-xl p-4 mb-6 font-mono text-sm border border-white/5">
                <div className="flex justify-between mb-2">
                  <span className="text-zinc-500">Deposit Amount</span>
                  <span className="tabular-nums text-foreground">${amount.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-zinc-500">Processing Fee</span>
                  <span className="tabular-nums text-primary">$0.00</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>Funds Available</span>
                  <span>{paymentMethod === "ach" ? "2-3 Business Days" : "Instantly"}</span>
                </div>
              </div>

              <Button
                onClick={handleFund}
                disabled={isUnderMinimum || isProcessing}
                className={cn(
                  "w-full h-14 text-base font-bold uppercase tracking-wider relative overflow-hidden transition-all",
                  isUnderMinimum
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    />
                    Transferring Funds...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Transfer Funds & Activate System
                  </span>
                )}
              </Button>

              {/* Trust indicator */}
              <p className="text-xs text-center text-muted-foreground mt-4 flex items-center justify-center gap-2">
                <Shield className="w-3 h-3" />
                256-bit encryption. FDIC-insured funds.
              </p>
            </div>
          </motion.div>
        ) : (
          /* Enhanced success state - "Start Engine" moment */
          <motion.div
            key="success"
            className="w-full max-w-md text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring" as const, stiffness: 80, damping: 20 }}
          >
            {/* Animated rocket icon */}
            <motion.div
              className="relative w-32 h-32 mx-auto mb-8"
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              transition={{ type: "spring" as const, delay: 0.2 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20 blur-2xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
              <motion.div
                className="relative w-full h-full rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center glow-green"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" as const, delay: 0.3 }}
              >
                <Rocket className="w-16 h-16 text-primary" />
              </motion.div>
            </motion.div>

            <motion.h1
              className="text-3xl font-bold mb-2 text-primary glow-text-green uppercase tracking-wider font-mono"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              SYSTEM ACTIVATED
            </motion.h1>

            <motion.p
              className="text-muted-foreground mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Your ledger has been initialized successfully.
            </motion.p>

            <motion.div
              className="glass-card p-6 mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-mono">Initial Balance</p>
              <div className="text-5xl font-bold font-mono text-primary glow-text-green">
                ${amount.toLocaleString()}.00
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <Button
                onClick={handleComplete}
                className="w-full h-16 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider"
              >
                <Rocket className="w-6 h-6 mr-3" />
                Launch Mission Control
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
