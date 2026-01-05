"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { HeroMetric } from "@/components/dashboard/hero-metric"
import { SpendChart } from "@/components/dashboard/spend-chart"
import { LiveTransactionFeed } from "@/components/dashboard/live-transaction-feed"
import { AgentStatusList } from "@/components/dashboard/agent-status-list"
import { SystemStatus } from "@/components/dashboard/system-status"
import { ThemeToggle } from "@/components/theme-toggle"
import { useDashboardData, formatDashboardStats } from "@/hooks/use-dashboard-data"
import { parseCents } from "@/lib/types/currency"
import { Activity, Bot, Shield, Loader2, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
}

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const { stats, agents, transactions, alerts, isLoading, error, refresh } = useDashboardData()
  const formattedStats = formatDashboardStats(stats)

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  // Calculate burn rate from today's spend
  const todaySpendCents = stats ? parseCents(stats.today_spend_cents) : 0n
  const burnRate = Number(todaySpendCents) / 100

  // Determine risk score based on alerts
  const riskScore = formattedStats.unreadAlerts > 5 ? "High" : formattedStats.unreadAlerts > 2 ? "Medium" : "Low"

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-mono">LOADING DASHBOARD...</p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4 text-center max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AlertTriangle className="w-12 h-12 text-warning" />
          <h2 className="text-xl font-bold">Unable to Load Dashboard</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={refresh} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div className="min-h-screen p-6 md:p-10" initial="hidden" animate="visible" variants={containerVariants}>
      {/* Header bar */}
      <motion.header className="flex items-center justify-between mb-12" variants={itemVariants}>
        <div className="flex items-center gap-4">
          <motion.h1
            className="text-lg font-bold tracking-tight"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            QODA
          </motion.h1>
          <motion.span
            className="text-xs text-muted-foreground px-2 py-1 rounded bg-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            v2.0.4
          </motion.span>
        </div>

        <motion.div
          className="flex items-center gap-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <motion.span
              className="w-2 h-2 rounded-full bg-success"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">All Systems Nominal</span>
          </div>
          <motion.span
            className="text-2xl tabular-nums text-muted-foreground"
            key={formattedTime}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
          >
            {formattedTime}
          </motion.span>
          <ThemeToggle />
        </motion.div>
      </motion.header>

      {/* Hero Burn Rate - Massive centered metric */}
      <motion.section className="flex flex-col items-center justify-center py-12 md:py-16" variants={itemVariants}>
        <HeroMetric
          value={burnRate}
          label="Today's Spend"
          prefix="$"
          suffix="/24h"
          trend={{ value: formattedStats.todayTransactions, isPositive: true }}
        />
      </motion.section>

      {/* Quick stats row */}
      <motion.section
        className="flex flex-wrap items-center justify-center gap-8 md:gap-16 mb-12 py-6 border-y border-white/[0.04]"
        variants={itemVariants}
      >
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring" as const, stiffness: 400 }}
        >
          <Bot className="w-4 h-4 text-primary" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Agents</p>
            <p className="text-xl tabular-nums">
              {formattedStats.activeAgents}/{formattedStats.totalAgents}
            </p>
          </div>
        </motion.div>
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring" as const, stiffness: 400 }}
        >
          <Activity className="w-4 h-4 text-info" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly Spend</p>
            <p className="text-xl tabular-nums">{formattedStats.monthSpend}</p>
          </div>
        </motion.div>
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring" as const, stiffness: 400 }}
        >
          <Shield className="w-4 h-4 text-success" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk Score</p>
            <p className="text-xl tabular-nums">{riskScore}</p>
          </div>
        </motion.div>
      </motion.section>

      {/* Main content grid */}
      <motion.section className="grid gap-6 lg:grid-cols-3 mb-6" variants={itemVariants}>
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, type: "spring" as const, stiffness: 100 }}
        >
          <SpendChart />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, type: "spring" as const, stiffness: 100 }}
        >
          <LiveTransactionFeed transactions={transactions} />
        </motion.div>
      </motion.section>

      {/* Bottom row */}
      <motion.section className="grid gap-6 md:grid-cols-2" variants={itemVariants}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, type: "spring" as const, stiffness: 100 }}
        >
          <AgentStatusList agents={agents} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, type: "spring" as const, stiffness: 100 }}
        >
          <SystemStatus alerts={alerts} />
        </motion.div>
      </motion.section>
    </motion.div>
  )
}
