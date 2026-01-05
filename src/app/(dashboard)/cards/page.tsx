"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { mockAgents } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Eye,
  EyeOff,
  Copy,
  Plus,
  Pause,
  Play,
  CreditCard,
  Zap,
  Shield,
  TrendingUp,
  Check,
  LayoutGrid,
  List,
} from "lucide-react"
import { cn } from "@/lib/utils"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40, rotateX: -15 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 15,
    },
  },
}

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
}

export default function CardsPage() {
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set())
  const [selectedCard, setSelectedCard] = useState<(typeof mockAgents)[0] | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const toggleReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRevealedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyCardNumber = (id: string, lastFour: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`4242 8283 9194 ${lastFour}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Stats
  const activeCards = mockAgents.filter((a) => a.status === "active").length
  const totalLimit = mockAgents.reduce((acc, a) => acc + a.monthlyLimit, 0)
  const totalSpend = mockAgents.reduce((acc, a) => acc + a.currentMonthlySpend, 0)

  return (
    <div className="min-h-screen p-6 md:p-10">
      {/* Hero Section */}
      <motion.section
        className="flex flex-col items-center justify-center py-12 md:py-16"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring" as const, stiffness: 80, damping: 20 }}
      >
        <motion.div
          className="text-center relative"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Glow ring behind metric */}
          <motion.div
            className="absolute inset-0 -z-10 flex items-center justify-center"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
          >
            <div className="w-[300px] h-[200px] rounded-full bg-primary/20 blur-[80px]" />
          </motion.div>

          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Virtual Card Network</p>
          <div className="flex items-center justify-center gap-4 mb-4">
            <motion.span
              className="text-6xl md:text-8xl font-bold tabular-nums glow-text-green"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {activeCards}
            </motion.span>
            <span className="text-2xl text-muted-foreground">/{mockAgents.length}</span>
          </div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider">Active Cards Online</p>
        </motion.div>
      </motion.section>

      {/* Stats Row */}
      <motion.section
        className="flex flex-wrap items-center justify-center gap-8 md:gap-16 mb-12 py-6 border-y border-white/[0.04]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring" as const, stiffness: 400 }}
        >
          <Shield className="w-4 h-4 text-primary" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Limit</p>
            <p className="text-xl tabular-nums">{formatCurrency(totalLimit)}</p>
          </div>
        </motion.div>
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring" as const, stiffness: 400 }}
        >
          <TrendingUp className="w-4 h-4 text-info" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Spend</p>
            <p className="text-xl tabular-nums glow-text-green">{formatCurrency(totalSpend)}</p>
          </div>
        </motion.div>
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring" as const, stiffness: 400 }}
        >
          <Zap className="w-4 h-4 text-warning" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Utilization</p>
            <p className="text-xl tabular-nums">{((totalSpend / totalLimit) * 100).toFixed(1)}%</p>
          </div>
        </motion.div>
      </motion.section>

      {/* Action Bar with View Toggle */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-medium">Card Fleet</h2>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <motion.button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all",
                viewMode === "grid"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground",
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </motion.button>
            <motion.button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all",
                viewMode === "list"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground",
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <List className="w-3.5 h-3.5" />
              List
            </motion.button>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button className="gap-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20">
              <Plus className="h-4 w-4" />
              Issue New Card
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          /* Grid Mode - Original Card Visuals */
          <motion.div
            key="grid"
            className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            {mockAgents.map((agent) => {
              const isRevealed = revealedCards.has(agent.id)
              const isCopied = copiedId === agent.id
              const utilizationPercent = (agent.currentMonthlySpend / agent.monthlyLimit) * 100
              const isHighUtilization = utilizationPercent > 80

              return (
                <motion.div
                  key={agent.id}
                  variants={cardVariants}
                  whileHover={{
                    scale: 1.03,
                    rotateY: 2,
                    transition: { type: "spring" as const, stiffness: 300 },
                  }}
                  className="cursor-pointer perspective-1000"
                  onClick={() => setSelectedCard(agent)}
                >
                  {/* Virtual Card Design */}
                  <div
                    className={cn(
                      "relative h-56 rounded-2xl p-6 overflow-hidden",
                      "bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]",
                      "border border-white/10",
                      agent.status === "active" && !isHighUtilization && "glow-green",
                      isHighUtilization && "glow-red",
                    )}
                  >
                    {/* Card Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div
                        className={cn(
                          "absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl",
                          isHighUtilization ? "bg-red-500" : "bg-primary",
                        )}
                      />
                      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-info blur-3xl" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 h-full flex flex-col justify-between">
                      {/* Top Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className={cn("w-6 h-6", isHighUtilization ? "text-red-500" : "text-primary")} />
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Qoda Virtual</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "uppercase text-[10px] tracking-wider",
                            agent.status === "active" && !isHighUtilization && "text-primary border-primary/30",
                            agent.status === "active" &&
                              isHighUtilization &&
                              "text-red-500 border-red-500/30 glow-text-red",
                            agent.status === "paused" && "text-warning border-warning/30",
                            agent.status === "cancelled" && "text-muted-foreground border-muted-foreground/30",
                          )}
                        >
                          <motion.span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full mr-1.5",
                              agent.status === "active" && !isHighUtilization && "bg-primary",
                              agent.status === "active" && isHighUtilization && "bg-red-500",
                            )}
                            animate={agent.status === "active" ? { opacity: [1, 0.5, 1] } : {}}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                          />
                          {isHighUtilization ? "HOT" : agent.status}
                        </Badge>
                      </div>

                      {/* Card Number */}
                      <div>
                        <motion.p
                          className="text-xl tracking-[0.25em] tabular-nums mb-1"
                          animate={isRevealed ? {} : { opacity: [1, 0.8, 1] }}
                          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                        >
                          {isRevealed ? (
                            <>4242 8283 9194 {agent.cardLastFour}</>
                          ) : (
                            <>•••• •••• •••• {agent.cardLastFour}</>
                          )}
                        </motion.p>
                        <p className="text-xs text-muted-foreground">{agent.name}</p>
                      </div>

                      {/* Bottom Row */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            Monthly Limit
                          </p>
                          <p className="text-lg font-bold tabular-nums">{formatCurrency(agent.monthlyLimit)}</p>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-1">
                          <motion.button
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            onClick={(e) => toggleReveal(agent.id, e)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </motion.button>
                          <motion.button
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            onClick={(e) => copyCardNumber(agent.id, agent.cardLastFour, e)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <AnimatePresence mode="wait">
                              {isCopied ? (
                                <motion.div
                                  key="check"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                >
                                  <Check className="w-4 h-4 text-primary" />
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="copy"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                >
                                  <Copy className="w-4 h-4" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    {/* Utilization Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                      <motion.div
                        className={cn(
                          "h-full",
                          utilizationPercent > 80
                            ? "bg-red-500"
                            : utilizationPercent > 60
                              ? "bg-warning"
                              : "bg-primary",
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                        transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Card Meta */}
                  <motion.div
                    className="mt-3 px-2 flex items-center justify-between text-xs text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span>{agent.clientName}</span>
                    <span className={cn("tabular-nums", isHighUtilization && "text-red-500 glow-text-red")}>
                      {formatCurrency(agent.currentMonthlySpend)} spent
                    </span>
                  </motion.div>
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
          /* List Mode - Dense table view for bulk management */
          <motion.div
            key="list"
            className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_100px_120px_140px_140px_100px] gap-4 px-6 py-4 border-b border-white/[0.04] text-[10px] uppercase tracking-wider text-muted-foreground">
              <div>Agent Name</div>
              <div>Last 4</div>
              <div className="text-right">Velocity Limit</div>
              <div className="text-right">Spend MTD</div>
              <div className="text-right">Utilization</div>
              <div className="text-center">Status</div>
            </div>

            {/* Table Body */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              {mockAgents.map((agent) => {
                const utilizationPercent = (agent.currentMonthlySpend / agent.monthlyLimit) * 100
                const isHighUtilization = utilizationPercent > 80

                return (
                  <motion.div
                    key={agent.id}
                    variants={rowVariants}
                    whileHover={{
                      backgroundColor: "rgba(255,255,255,0.02)",
                      transition: { duration: 0.15 },
                    }}
                    className="grid grid-cols-[1fr_100px_120px_140px_140px_100px] gap-4 px-6 py-3 border-b border-white/[0.02] cursor-pointer items-center"
                    onClick={() => setSelectedCard(agent)}
                  >
                    {/* Agent Name + Client */}
                    <div>
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <p className="text-[10px] text-muted-foreground">{agent.clientName}</p>
                    </div>

                    {/* Last 4 - Mono */}
                    <div className="text-sm tabular-nums text-muted-foreground">•••• {agent.cardLastFour}</div>

                    {/* Velocity Limit */}
                    <div className="text-sm tabular-nums text-right">{formatCurrency(agent.monthlyLimit)}</div>

                    {/* Spend MTD */}
                    <div
                      className={cn(
                        "text-sm tabular-nums text-right font-medium",
                        isHighUtilization ? "text-red-500 glow-text-red" : "text-primary glow-text-green",
                      )}
                    >
                      {formatCurrency(agent.currentMonthlySpend)}
                    </div>

                    {/* Utilization */}
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className={cn(
                            "h-full rounded-full",
                            utilizationPercent > 80
                              ? "bg-red-500"
                              : utilizationPercent > 60
                                ? "bg-warning"
                                : "bg-primary",
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <span className={cn("text-xs tabular-nums w-12 text-right", isHighUtilization && "text-red-500")}>
                        {utilizationPercent.toFixed(0)}%
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "uppercase text-[9px] tracking-wider",
                          agent.status === "active" && !isHighUtilization && "text-primary border-primary/30",
                          agent.status === "active" && isHighUtilization && "text-red-500 border-red-500/30",
                          agent.status === "paused" && "text-warning border-warning/30",
                          agent.status === "cancelled" && "text-muted-foreground border-muted-foreground/30",
                        )}
                      >
                        <motion.span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full mr-1.5",
                            agent.status === "active" && !isHighUtilization && "bg-primary",
                            agent.status === "active" && isHighUtilization && "bg-red-500",
                            agent.status === "paused" && "bg-warning",
                          )}
                          animate={agent.status === "active" ? { opacity: [1, 0.5, 1] } : {}}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        />
                        {agent.status}
                      </Badge>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Table Footer */}
            <div className="grid grid-cols-[1fr_100px_120px_140px_140px_100px] gap-4 px-6 py-4 border-t border-white/[0.06] bg-white/[0.01]">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {mockAgents.length} agents
              </div>
              <div />
              <div className="text-sm tabular-nums text-right font-medium">{formatCurrency(totalLimit)}</div>
              <div className="text-sm tabular-nums text-right font-bold glow-text-green">
                {formatCurrency(totalSpend)}
              </div>
              <div className="text-sm tabular-nums text-right">{((totalSpend / totalLimit) * 100).toFixed(1)}%</div>
              <div />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Detail Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="glass-card-intense border-white/10 max-w-lg">
          {selectedCard && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-primary" />
                  {selectedCard.name}
                </DialogTitle>
                <DialogDescription>{selectedCard.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Card Number */}
                <div className="glass-card p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Card Number</p>
                  <p className="text-2xl tracking-[0.3em] tabular-nums">4242 8283 9194 {selectedCard.cardLastFour}</p>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Daily Limit</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(selectedCard.dailyLimit)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(selectedCard.currentDailySpend)} used today
                    </p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Monthly Limit</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(selectedCard.monthlyLimit)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(selectedCard.currentMonthlySpend)} used
                    </p>
                  </div>
                </div>

                {/* Utilization */}
                <div className="glass-card p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Monthly Utilization</span>
                    <span className="tabular-nums">
                      {((selectedCard.currentMonthlySpend / selectedCard.monthlyLimit) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full",
                        (selectedCard.currentMonthlySpend / selectedCard.monthlyLimit) * 100 > 80
                          ? "bg-red-500"
                          : "bg-primary",
                      )}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min((selectedCard.currentMonthlySpend / selectedCard.monthlyLimit) * 100, 100)}%`,
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {selectedCard.status === "active" ? (
                    <Button className="flex-1" variant="ghost">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Card
                    </Button>
                  ) : selectedCard.status === "paused" ? (
                    <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                      <Play className="w-4 h-4 mr-2" />
                      Resume Card
                    </Button>
                  ) : null}
                  <Button className="flex-1" variant="ghost">
                    Edit Limits
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
