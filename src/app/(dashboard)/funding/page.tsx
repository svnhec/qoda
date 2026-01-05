"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield,
  CreditCard,
  Building2,
  Lock,
  Check,
  Clock,
  Plus,
  RefreshCw,
  Wallet,
  ChevronRight,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } },
}

const transactionHistory = [
  { id: "TXN-001", date: "2024-01-15", amount: 10000, method: "Bank Transfer (ACH)", status: "cleared" },
  { id: "TXN-002", date: "2024-01-10", amount: 5000, method: "Credit Card", status: "cleared" },
  { id: "TXN-003", date: "2024-01-08", amount: 2500, method: "Auto-Reload", status: "cleared" },
  { id: "TXN-004", date: "2024-01-05", amount: 5000, method: "Bank Transfer (ACH)", status: "processing" },
  { id: "TXN-005", date: "2024-01-02", amount: 10000, method: "Bank Transfer (ACH)", status: "cleared" },
]

export default function FundingPage() {
  const [amount, setAmount] = useState("5000")
  const [paymentMethod, setPaymentMethod] = useState<"ach" | "card">("ach")
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(true)
  const [autoReloadThreshold, setAutoReloadThreshold] = useState("1000")
  const [autoReloadAmount, setAutoReloadAmount] = useState("5000")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const currentBalance = 12450.0

  const handleAddFunds = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }, 2000)
  }

  const quickAmounts = [1000, 2500, 5000, 10000]

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Subtle shield background pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.02]">
          <Shield className="w-full h-full" />
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto space-y-8 relative z-10"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center glow-green">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Wallet & Funding</h1>
              <p className="text-sm text-muted-foreground font-mono">SECURE_VAULT_v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-4 h-4 text-primary" />
            <span className="font-mono">256-BIT ENCRYPTED</span>
          </div>
        </motion.div>

        {/* Hero Balance */}
        <motion.div variants={itemVariants}>
          <div className="glass-card-intense p-8 relative overflow-hidden">
            {/* Shield watermark */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5">
              <Shield className="w-48 h-48" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-primary live-indicator" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Available Issuing Balance
                </span>
              </div>
              <motion.div
                className="text-6xl lg:text-7xl font-bold text-primary glow-text-green tracking-tight"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" as const, stiffness: 100 }}
              >
                ${currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </motion.div>
              <p className="text-sm text-muted-foreground mt-2 font-mono">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>

            {/* Security badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Shield className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Protected</span>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Add Funds Card */}
          <motion.div variants={itemVariants}>
            <div className="glass-card p-6 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Add Funds</h2>
                  <p className="text-xs text-muted-foreground font-mono">TOP_UP_STATION</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Amount Input */}
                <div className="space-y-3">
                  <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Amount (USD)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-10 h-14 text-2xl font-mono bg-black/50 border-white/10 focus:border-primary"
                    />
                  </div>
                  {/* Quick amount buttons */}
                  <div className="flex gap-2">
                    {quickAmounts.map((quickAmount) => (
                      <button
                        key={quickAmount}
                        onClick={() => setAmount(quickAmount.toString())}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg border text-sm font-mono transition-all",
                          amount === quickAmount.toString()
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-white/10 text-muted-foreground hover:border-white/20",
                        )}
                      >
                        ${quickAmount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Payment Method
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod("ach")}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-left",
                        paymentMethod === "ach"
                          ? "border-primary bg-primary/5 glow-green"
                          : "border-white/10 hover:border-white/20",
                      )}
                    >
                      <Building2
                        className={cn(
                          "w-5 h-5 mb-2",
                          paymentMethod === "ach" ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <div className="font-medium text-sm">Bank Account</div>
                      <div className="text-xs text-muted-foreground font-mono">ACH Transfer</div>
                      <div className="text-[10px] text-primary mt-1">No fees</div>
                    </button>
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-left",
                        paymentMethod === "card"
                          ? "border-primary bg-primary/5 glow-green"
                          : "border-white/10 hover:border-white/20",
                      )}
                    >
                      <CreditCard
                        className={cn(
                          "w-5 h-5 mb-2",
                          paymentMethod === "card" ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <div className="font-medium text-sm">Credit Card</div>
                      <div className="text-xs text-muted-foreground font-mono">Instant</div>
                      <div className="text-[10px] text-yellow-500 mt-1">2.9% fee</div>
                    </button>
                  </div>
                </div>

                {/* Stripe Element Placeholder */}
                <div className="space-y-3">
                  <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {paymentMethod === "ach" ? "Bank Details" : "Card Details"}
                  </Label>
                  <div className="p-4 rounded-xl bg-black/50 border border-white/10">
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-white/5 rounded w-1/2" />
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        Powered by <span className="text-primary">Stripe</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Funds Button */}
                <AnimatePresence mode="wait">
                  {showSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="w-full py-4 rounded-xl bg-primary/20 border border-primary flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5 text-primary" />
                      <span className="font-mono text-primary">Funds Added Successfully</span>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Button
                        onClick={handleAddFunds}
                        disabled={isProcessing}
                        className="w-full h-14 text-lg font-mono bg-primary hover:bg-primary/90 glow-green"
                      >
                        {isProcessing ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5" />
                            Add ${Number(amount).toLocaleString()}
                          </div>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Auto-Reload Card */}
          <motion.div variants={itemVariants}>
            <div className="glass-card p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Auto-Reload</h2>
                    <p className="text-xs text-muted-foreground font-mono">SAFETY_NET_CONFIG</p>
                  </div>
                </div>
                <Switch
                  checked={autoReloadEnabled}
                  onCheckedChange={setAutoReloadEnabled}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <AnimatePresence>
                {autoReloadEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6"
                  >
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="text-sm text-muted-foreground">
                        When balance drops below{" "}
                        <span className="text-primary font-mono">${Number(autoReloadThreshold).toLocaleString()}</span>,
                        automatically add{" "}
                        <span className="text-primary font-mono">${Number(autoReloadAmount).toLocaleString()}</span>
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                          Reload Threshold
                        </Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={autoReloadThreshold}
                            onChange={(e) => setAutoReloadThreshold(e.target.value)}
                            className="pl-8 h-12 font-mono bg-black/50 border-white/10 focus:border-primary"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Trigger reload when balance falls below this amount
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                          Reload Amount
                        </Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            value={autoReloadAmount}
                            onChange={(e) => setAutoReloadAmount(e.target.value)}
                            className="pl-8 h-12 font-mono bg-black/50 border-white/10 focus:border-primary"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Amount to add when threshold is triggered
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full h-12 font-mono border-white/10 hover:bg-white/5 bg-transparent"
                    >
                      Save Auto-Reload Settings
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {!autoReloadEnabled && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <RefreshCw className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Enable auto-reload to ensure your agents never run out of funds
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Transaction History */}
        <motion.div variants={itemVariants}>
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Deposit History</h2>
                  <p className="text-xs text-muted-foreground font-mono">TRANSACTION_LOG</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="space-y-2">
              {transactionHistory.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-transparent hover:border-white/5 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        tx.status === "cleared" ? "bg-primary/10" : "bg-yellow-500/10",
                      )}
                    >
                      {tx.status === "cleared" ? (
                        <Check className="w-5 h-5 text-primary" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-mono text-sm">{tx.id}</div>
                      <div className="text-xs text-muted-foreground">{tx.method}</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-muted-foreground font-mono">{tx.date}</div>
                  </div>

                  <div className="text-right">
                    <div
                      className={cn(
                        "font-mono font-semibold",
                        tx.status === "cleared" ? "text-primary glow-text-green" : "text-yellow-500",
                      )}
                    >
                      +${tx.amount.toLocaleString()}
                    </div>
                    <div
                      className={cn(
                        "text-[10px] font-mono uppercase tracking-wider",
                        tx.status === "cleared" ? "text-primary" : "text-yellow-500",
                      )}
                    >
                      {tx.status}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
