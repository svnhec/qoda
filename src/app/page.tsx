"use client"

import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Check, ExternalLink, AlertTriangle, CreditCard, Activity, Eye } from "lucide-react"
import { useEffect, useState } from "react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 20,
    },
  },
}

// Terminal typing animation component
function TerminalTyper() {
  const commands = [
    { cmd: '$ qoda agents create --name "LeadGenBot"', response: "> Agent created. Card issued ending in 4242." },
    { cmd: "$ qoda limit set --agent LeadGenBot --daily 50", response: "> Daily limit set: $50.00" },
    {
      cmd: "$ qoda transactions --agent LeadGenBot --last 5",
      response:
        "> Fetching transactions...\n  OpenAI API     $0.24    2s ago\n  Anthropic      $0.18    8s ago\n  Replicate      $1.20    1m ago",
    },
    { cmd: "$ qoda balance", response: "> Available: $4,827.50\n> Reserved:  $172.50\n> Total:     $5,000.00" },
  ]

  const [currentCommand, setCurrentCommand] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [showResponse, setShowResponse] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(true)

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible((v) => !v)
    }, 530)
    return () => clearInterval(cursorInterval)
  }, [])

  useEffect(() => {
    let timeout: NodeJS.Timeout
    const cmd = commands[currentCommand]

    if (!showResponse) {
      // Type the command
      let charIndex = 0
      const cmdText = cmd?.cmd ?? ""
      const typeInterval = setInterval(() => {
        if (charIndex <= cmdText.length) {
          setDisplayText(cmdText.slice(0, charIndex))
          charIndex++
        } else {
          clearInterval(typeInterval)
          timeout = setTimeout(() => setShowResponse(true), 300)
        }
      }, 50)
      return () => {
        clearInterval(typeInterval)
        clearTimeout(timeout)
      }
    } else {
      // Show response, then move to next command
      timeout = setTimeout(() => {
        setShowResponse(false)
        setDisplayText("")
        setCurrentCommand((c) => (c + 1) % commands.length)
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [currentCommand, showResponse])

  return (
    <div className="font-mono text-sm">
      <div className="text-primary">
        {displayText}
        <span className={`${cursorVisible ? "opacity-100" : "opacity-0"} transition-opacity`}>▊</span>
      </div>
      {showResponse && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground mt-2 whitespace-pre-line"
        >
          {commands[currentCommand]?.response}
        </motion.div>
      )}
    </div>
  )
}

// Animated counter component
function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => `$${latest.toFixed(2)}`)
  const [displayValue, setDisplayValue] = useState("$0.00")

  useEffect(() => {
    const controls = animate(count, value, { duration })
    const unsubscribe = rounded.on("change", (v) => setDisplayValue(v))
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, duration, count, rounded])

  return <span>{displayValue}</span>
}

// Live transaction feed for features
function LiveTransactionFeed() {
  const transactions = [
    { agent: "GPT-4-Turbo", merchant: "OpenAI", amount: "$0.24", status: "approved" },
    { agent: "Claude-3", merchant: "Anthropic", amount: "$0.18", status: "approved" },
    { agent: "LeadGenBot", merchant: "Replicate", amount: "$1.20", status: "approved" },
    { agent: "DataMiner", merchant: "OpenAI", amount: "$0.08", status: "approved" },
    { agent: "ContentBot", merchant: "Anthropic", amount: "$0.32", status: "approved" },
  ]

  const [visibleTxs, setVisibleTxs] = useState(transactions.slice(0, 3))
  const [key, setKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleTxs((prev) => {
        const newTx = transactions[Math.floor(Math.random() * transactions.length)]
        if (!newTx) return prev
        return [newTx, ...prev.slice(0, 2)]
      })
      setKey((k) => k + 1)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-1">
      {visibleTxs.map((tx, i) => (
        <motion.div
          key={`${key}-${i}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04] last:border-0"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary live-indicator" />
            <span className="text-muted-foreground">{tx.agent}</span>
          </div>
          <span className="text-muted-foreground">{tx.merchant}</span>
          <span className="tabular-nums text-primary glow-text-green">{tx.amount}</span>
        </motion.div>
      ))}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Scanline effect */}
      <div className="scanline" />

      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px]"
          style={{
            background: "radial-gradient(ellipse at top, oklch(0.8 0.2 155 / 0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav
        className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center glow-green">
            <span className="text-primary font-bold text-xl">Q</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Qoda</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-neutral-400">
          <Link href="#features" className="hover:text-white transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="/legal/terms" className="hover:text-white transition-colors flex items-center gap-1">
            Legal <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-sm text-neutral-300 hover:text-white hover:bg-white/5">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-primary text-black hover:bg-primary/90 glow-green text-sm px-6">Get Started</Button>
          </Link>
        </div>
      </motion.nav>

      <motion.section
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-8 md:pt-24 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Badge
            variant="outline"
            className="mb-8 px-4 py-2 text-xs uppercase tracking-widest border-primary/30 text-primary bg-primary/5"
          >
            <motion.span
              className="w-2 h-2 rounded-full bg-primary mr-2 inline-block"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />
            Now in Public Beta
          </Badge>
        </motion.div>

        <motion.h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-6 text-white text-balance"
          variants={itemVariants}
        >
          Stop <span className="text-red-500 glow-text-red">burning cash</span> on <br className="hidden md:block" />
          hallucinating <span className="text-primary glow-text-green">agents</span>.
        </motion.h1>

        <motion.p
          className="text-base md:text-lg text-neutral-400 max-w-2xl mb-10 text-balance"
          variants={itemVariants}
        >
          The first financial operating system built for the autonomous age. Issue cards, enforce velocity limits, and
          kill runaway spend in milliseconds.
        </motion.p>

        <motion.div className="flex flex-col sm:flex-row gap-4" variants={itemVariants}>
          <Link href="/signup">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                className="bg-primary text-black hover:bg-primary/90 glow-green text-base px-8 py-6 font-semibold"
              >
                Initialize Qoda
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
          </Link>
          <Link href="#terminal">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-base px-8 py-6 bg-transparent text-white"
              >
                Try the CLI
              </Button>
            </motion.div>
          </Link>
        </motion.div>

        <motion.div className="relative mt-16 md:mt-24 w-full max-w-5xl" variants={itemVariants}>
          {/* Massive neon glow behind */}
          <div
            className="absolute inset-0 -inset-x-20 -inset-y-10 rounded-3xl"
            style={{
              background: "radial-gradient(ellipse at top, oklch(0.8 0.2 155 / 0.15) 0%, transparent 60%)",
              filter: "blur(60px)",
            }}
          />

          {/* 3D Perspective Container */}
          <motion.div
            className="relative"
            initial={{ rotateX: 20, opacity: 0, y: 60 }}
            animate={{ rotateX: 12, opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              transformStyle: "preserve-3d",
              perspective: "1500px",
            }}
          >
            {/* Dashboard Container */}
            <div
              className="relative rounded-2xl overflow-hidden border border-white/10"
              style={{
                transform: "rotateX(8deg)",
                boxShadow: "0 0 100px -20px oklch(0.8 0.2 155 / 0.3), 0 25px 50px -12px rgba(0,0,0,0.8)",
              }}
            >
              {/* Glass reflection overlay */}
              <div
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, oklch(1 0 0 / 0.1) 0%, transparent 50%, transparent 100%)",
                }}
              />

              {/* Dashboard Content */}
              <div className="bg-black/90 backdrop-blur-xl p-6 md:p-8">
                {/* Window chrome */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Mission Control v2.0</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary live-indicator" />
                    <span className="text-[10px] text-primary">LIVE</span>
                  </div>
                </div>

                {/* Main burn rate metric */}
                <div className="text-center py-6 md:py-10">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] mb-3">Current Burn Rate</p>
                  <p className="text-5xl md:text-7xl font-bold tabular-nums glow-text-green text-primary">
                    <AnimatedCounter value={2847.5} duration={2.5} />
                  </p>
                  <p className="text-sm text-primary mt-3 flex items-center justify-center gap-2">
                    <Activity className="w-4 h-4" />
                    +12.4% velocity
                  </p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {[
                    { label: "Active Agents", value: "12", trend: "+2" },
                    { label: "Cards Online", value: "8", trend: "0" },
                    { label: "MTD Spend", value: "$24.8k", trend: "+18%" },
                    { label: "Anomalies", value: "0", trend: "—" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center"
                    >
                      <p className="text-2xl md:text-3xl font-bold tabular-nums text-white">{stat.value}</p>
                      <p className="text-[9px] text-neutral-500 uppercase tracking-wider mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-16 md:mt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <p className="text-xs text-neutral-600 font-mono">
            {"// Trusted by "}
            <span className="text-neutral-500">OpenAI</span>
            {", "}
            <span className="text-neutral-500">Anthropic</span>
            {", "}
            <span className="text-neutral-500">Vercel</span>
            {", "}
            <span className="text-neutral-500">Replicate</span>
            {", "}
            <span className="text-neutral-500">Hugging Face</span>
            {" ..."}
          </p>
        </motion.div>
      </motion.section>

      <motion.section
        className="relative z-10 py-24 md:py-32 max-w-6xl mx-auto px-6"
        id="features"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.div className="text-center mb-20" variants={itemVariants}>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">
            Built for <span className="text-primary glow-text-green">Autonomous</span> Finance
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto">
            Real components from the actual interface. No abstract icons.
          </p>
        </motion.div>

        {/* Feature 1: Velocity Control - Left Text, Right Visual */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24 md:mb-32"
          variants={itemVariants}
        >
          <div>
            <Badge variant="outline" className="mb-4 text-xs border-red-500/30 text-red-400">
              <AlertTriangle className="w-3 h-3 mr-1" />
              VELOCITY CONTROL
            </Badge>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Kill runaway spend instantly</h3>
            <p className="text-neutral-400 mb-6">
              Set per-agent velocity limits. When an agent exceeds its daily cap, transactions are blocked in
              milliseconds—not minutes.
            </p>
            <ul className="space-y-3">
              {["Real-time anomaly detection", "Per-agent daily & monthly caps", "Instant freeze controls"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-neutral-300">
                    <Check className="w-4 h-4 text-primary" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Visual: Transaction Declined Card */}
          <motion.div className="relative" whileHover={{ scale: 1.02 }} transition={{ type: "spring" as const, stiffness: 300 }}>
            <div className="absolute inset-0 bg-red-500/10 blur-[60px] rounded-3xl" />
            <div className="relative bg-black/60 backdrop-blur-xl border border-red-500/20 rounded-2xl p-6 glow-red">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-red-500 font-semibold">TRANSACTION BLOCKED</span>
                    <motion.div
                      className="w-2 h-2 rounded-full bg-red-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                    />
                  </div>
                  <p className="text-sm text-neutral-400 mb-3">Agent_007 exceeded daily limit ($500)</p>
                  <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-neutral-500">Attempted</span>
                      <span className="text-red-400 tabular-nums glow-text-red">$127.50</span>
                    </div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-neutral-500">Daily Limit</span>
                      <span className="text-neutral-300 tabular-nums">$500.00</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Spent Today</span>
                      <span className="text-neutral-300 tabular-nums">$487.32</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Feature 2: Instant Issuance - Right Text, Left Visual */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24 md:mb-32"
          variants={itemVariants}
        >
          {/* Visual: Virtual Card + Terminal */}
          <motion.div
            className="relative order-2 lg:order-1"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring" as const, stiffness: 300 }}
          >
            <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-3xl" />
            <div className="relative space-y-4">
              {/* Virtual Card */}
              <motion.div
                className="bg-gradient-to-br from-neutral-900 to-black border border-white/10 rounded-2xl p-6 glow-green"
                animate={{ rotateY: [0, 3, 0] }}
                transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <span className="text-primary font-bold">Q</span>
                  </div>
                  <span className="text-[10px] text-primary uppercase tracking-wider">Virtual</span>
                </div>
                <p className="text-lg text-white/40 tracking-[0.3em] tabular-nums mb-4 blur-[2px]">
                  4242 4242 4242 4242
                </p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase">Agent</p>
                    <p className="text-sm text-white">LeadGenBot</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-500 uppercase">Limit</p>
                    <p className="text-sm text-primary tabular-nums">$500/day</p>
                  </div>
                </div>
              </motion.div>

              {/* Terminal */}
              <div className="bg-black/80 border border-white/10 rounded-xl p-4 font-mono text-xs">
                <div className="flex items-center gap-2 mb-3 text-neutral-500">
                  <span className="text-[10px]">▶</span>
                  <span>Terminal</span>
                </div>
                <p className="text-neutral-500">$ qoda card issue --agent LeadGenBot</p>
                <p className="text-primary mt-1">{"> Card issued ending in 4242"}</p>
                <p className="text-neutral-600 mt-1">{"> Latency: 120ms"}</p>
              </div>
            </div>
          </motion.div>

          <div className="order-1 lg:order-2">
            <Badge variant="outline" className="mb-4 text-xs border-primary/30 text-primary">
              <CreditCard className="w-3 h-3 mr-1" />
              INSTANT ISSUANCE
            </Badge>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Deploy cards in milliseconds</h3>
            <p className="text-neutral-400 mb-6">
              Spin up virtual cards for any agent instantly. Each card has its own limits, permissions, and spend
              tracking—all via API or CLI.
            </p>
            <ul className="space-y-3">
              {["Sub-200ms card provisioning", "Per-card velocity limits", "Full Stripe Issuing integration"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-neutral-300">
                    <Check className="w-4 h-4 text-primary" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </motion.div>

        {/* Feature 3: Live Observability - Left Text, Right Visual */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center" variants={itemVariants}>
          <div>
            <Badge variant="outline" className="mb-4 text-xs border-info/30 text-info">
              <Eye className="w-3 h-3 mr-1" />
              LIVE OBSERVABILITY
            </Badge>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">See everything in real-time</h3>
            <p className="text-neutral-400 mb-6">
              WebSocket-powered transaction feeds with zero latency. Watch every API call, every spend event, every
              anomaly—as it happens.
            </p>
            <ul className="space-y-3">
              {["WebSocket live feeds", "Per-agent transaction logs", "Exportable audit trails"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-neutral-300">
                  <Check className="w-4 h-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Visual: Live Transaction Feed */}
          <motion.div className="relative" whileHover={{ scale: 1.02 }} transition={{ type: "spring" as const, stiffness: 300 }}>
            <div className="absolute inset-0 bg-info/10 blur-[60px] rounded-3xl" />
            <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary live-indicator" />
                  <span className="text-xs text-neutral-400 uppercase tracking-wider">Live Feed</span>
                </div>
                <span className="text-[10px] text-neutral-500 tabular-nums">~50ms latency</span>
              </div>
              <LiveTransactionFeed />
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      <motion.section
        className="relative z-10 py-24 md:py-32 border-y border-white/[0.04]"
        id="terminal"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-xs border-white/10 text-neutral-400">
              {"<"}TERMINAL{"/>"}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Command Line</h2>
            <p className="text-neutral-400">Full CLI access for developers who prefer the terminal.</p>
          </div>

          {/* Terminal Window */}
          <motion.div
            className="relative"
            initial={{ y: 40, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0 bg-primary/5 blur-[80px] rounded-3xl" />
            <div className="relative bg-black border border-white/10 rounded-2xl overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-4 text-[10px] text-neutral-500">qoda-cli — zsh — 80×24</span>
              </div>

              {/* Terminal content */}
              <div className="p-6 min-h-[240px]">
                <TerminalTyper />
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="relative z-10 py-24 md:py-32"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white">Ready to take control?</h2>
          <p className="text-neutral-400 mb-10 max-w-xl mx-auto">
            Join the agencies already managing millions in AI spend with Qoda.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/signup">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  className="bg-primary text-black hover:bg-primary/90 glow-green text-base px-8 py-6 font-semibold"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-neutral-500">
            {["No credit card required", "14-day free trial", "Cancel anytime"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="text-primary font-bold">Q</span>
              </div>
              <span className="text-sm text-neutral-500">© 2026 Qoda. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <Link href="/legal/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/legal/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/legal/acceptable-use" className="hover:text-white transition-colors">
                AUP
              </Link>
              <Link href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}