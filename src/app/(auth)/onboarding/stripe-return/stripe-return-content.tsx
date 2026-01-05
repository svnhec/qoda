"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, ShieldX, ArrowRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type Status = "processing" | "success" | "error"

export function StripeReturnContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>("processing")
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])

  useEffect(() => {
    const success = searchParams.get("success") !== "false"

    const runVerification = async () => {
      setTerminalLogs([])

      await new Promise((r) => setTimeout(r, 400))
      setTerminalLogs((prev) => [...prev, "> Handshake received..."])

      await new Promise((r) => setTimeout(r, 600))
      setTerminalLogs((prev) => [...prev, "> Verifying KYB tokens..."])

      await new Promise((r) => setTimeout(r, 500))
      setTerminalLogs((prev) => [...prev, "> Encrypting keys..."])

      await new Promise((r) => setTimeout(r, 700))
      setTerminalLogs((prev) => [...prev, "> Validating issuing capabilities..."])

      await new Promise((r) => setTimeout(r, 600))

      if (success) {
        setTerminalLogs((prev) => [...prev, "> card_issuing: ENABLED"])
        await new Promise((r) => setTimeout(r, 300))
        setTerminalLogs((prev) => [...prev, "> transfers: ENABLED"])
        await new Promise((r) => setTimeout(r, 300))
        setTerminalLogs((prev) => [...prev, "> VERIFICATION COMPLETE"])
        setStatus("success")
      } else {
        setTerminalLogs((prev) => [...prev, "> ERROR: KYB_VERIFICATION_FAILED"])
        await new Promise((r) => setTimeout(r, 300))
        setTerminalLogs((prev) => [...prev, "> UPLINK REJECTED"])
        setStatus("error")
      }
    }

    runVerification()
  }, [searchParams])

  const handleContinue = () => {
    // Automatically redirect to funding after successful verification
    setTimeout(() => {
      router.push("/onboarding/funding")
    }, 500)
  }

  const handleRetry = () => {
    router.push("/onboarding/stripe-connect")
  }

  return (
    <motion.div
      className="w-full max-w-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring" as const, stiffness: 80, damping: 20 }}
    >
      <div
        className={`rounded-2xl overflow-hidden border-2 transition-colors duration-500 ${
          status === "success"
            ? "border-primary bg-primary/5"
            : status === "error"
              ? "border-red-500 bg-red-500/5"
              : "border-white/10 bg-black/50"
        }`}
      >
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-black/50 border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs font-mono text-muted-foreground ml-2">qoda_verification_protocol.sh</span>
        </div>

        {/* Terminal Body */}
        <div className="p-6 font-mono text-sm min-h-[300px]">
          {/* Logs */}
          <div className="space-y-1 mb-6">
            {terminalLogs.map((log, i) => (
              <motion.p
                key={i}
                className={
                  log.includes("ENABLED") || log.includes("COMPLETE")
                    ? "text-primary glow-text-green"
                    : log.includes("ERROR") || log.includes("REJECTED") || log.includes("FAILED")
                      ? "text-red-500 glow-text-red"
                      : "text-zinc-400"
                }
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                {log}
              </motion.p>
            ))}
          </div>

          {/* Status Line with Blinking Cursor */}
          {status === "processing" && (
            <div className="flex items-center gap-1 text-yellow-500">
              <span>SYSTEM DIAGNOSTIC IN PROGRESS</span>
              <motion.span
                className="inline-block w-2.5 h-5 bg-yellow-500"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY }}
              />
            </div>
          )}

          {/* Success State */}
          <AnimatePresence>
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
              >
                <div className="flex items-center justify-center mb-6">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center glow-green"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" as const, delay: 0.4 }}
                  >
                    <ShieldCheck className="w-10 h-10 text-primary" />
                  </motion.div>
                </div>
                <p className="text-center text-xl text-primary glow-text-green font-bold tracking-wider mb-2">
                  IDENTITY VERIFIED
                </p>
                <p className="text-center text-sm text-primary/80 mb-8">ISSUING PROTOCOLS ACTIVE</p>
                <Button
                  onClick={handleContinue}
                  autoFocus
                  className="w-full h-14 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-wider"
                >
                  Proceed to Funding
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error State */}
          <AnimatePresence>
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
              >
                <div className="flex items-center justify-center mb-6">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center glow-red"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" as const, delay: 0.4 }}
                  >
                    <ShieldX className="w-10 h-10 text-red-500" />
                  </motion.div>
                </div>
                <p className="text-center text-xl text-red-500 glow-text-red font-bold tracking-wider mb-2">
                  UPLINK REJECTED
                </p>
                <p className="text-center text-sm text-red-500/80 mb-8">MANUAL REVIEW REQUIRED</p>
                <Button
                  onClick={handleRetry}
                  className="w-full h-14 text-base font-bold bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50 uppercase tracking-wider"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Retry Connection
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Contact{" "}
                  <a href="mailto:support@qoda.io" className="text-red-500 hover:underline">
                    support@qoda.io
                  </a>{" "}
                  if the issue persists
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
