"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { AlertTriangle, Home, ArrowLeft, Terminal } from "lucide-react"

export default function NotFound() {
  const [glitchText, setGlitchText] = useState("404")
  const [terminalLines, setTerminalLines] = useState<string[]>([])

  // Glitch effect on 404
  useEffect(() => {
    const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const glitched = "404"
          .split("")
          .map((char) => (Math.random() > 0.5 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : char))
          .join("")
        setGlitchText(glitched)
        setTimeout(() => setGlitchText("404"), 100)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Terminal boot sequence
  useEffect(() => {
    const lines = [
      "$ qoda --status",
      "ERROR: Route not found in navigation matrix",
      "SCANNING: /dashboard/*",
      "SCANNING: /auth/*",
      "RESULT: No matching endpoint detected",
      "",
      "RECOMMENDATION: Return to known coordinates",
    ]

    lines.forEach((line, i) => {
      setTimeout(() => {
        setTerminalLines((prev) => [...prev, line])
      }, i * 400)
    })
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Scanline effect */}
      <div className="scanline" />

      {/* Noise overlay */}
      <div className="noise-overlay" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 text-center space-y-8 max-w-2xl"
      >
        {/* Glitchy 404 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="relative"
        >
          <h1 className="text-[150px] sm:text-[200px] font-mono font-bold text-emerald-500/20 leading-none select-none">
            {glitchText}
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className="h-20 w-20 text-red-500 animate-pulse" />
          </div>
        </motion.div>

        {/* Error message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-mono font-bold text-white">NAVIGATION_ERROR</h2>
          <p className="text-muted-foreground">The requested coordinates do not exist in this system</p>
        </div>

        {/* Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-white/10 bg-black/60 overflow-hidden text-left max-w-md mx-auto"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs font-mono text-muted-foreground flex items-center gap-2">
              <Terminal className="h-3 w-3" />
              system_diagnostic
            </span>
          </div>
          <div className="p-4 font-mono text-xs space-y-1 min-h-[160px]">
            {terminalLines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={
                  line.startsWith("ERROR")
                    ? "text-red-400"
                    : line.startsWith("RESULT")
                      ? "text-yellow-400"
                      : line.startsWith("RECOMMENDATION")
                        ? "text-emerald-400"
                        : "text-zinc-500"
                }
              >
                {line}
                {i === terminalLines.length - 1 && <span className="animate-pulse">█</span>}
              </motion.p>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-3"
        >
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="gap-2 bg-transparent border-white/10 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button asChild className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-black glow">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Mission Control
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}