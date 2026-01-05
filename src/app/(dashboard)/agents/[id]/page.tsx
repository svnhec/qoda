"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { mockAgents, mockTransactions } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Bot,
  Eye,
  EyeOff,
  Snowflake,
  Settings2,
  Copy,
  Check,
  AlertTriangle,
  Zap,
  Activity,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

// Generate 24h spend velocity data for this agent
function generateAgentSpendData() {
  const data = []
  const now = new Date()
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      hour: hour.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      amount: Math.floor(Math.random() * 80) + 10,
    })
  }
  return data
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [cardRevealed, setCardRevealed] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [isFreezeDialogOpen, setIsFreezeDialogOpen] = useState(false)
  const [isEditLimitsOpen, setIsEditLimitsOpen] = useState(false)
  const [dailyLimit, setDailyLimit] = useState("")
  const [monthlyLimit, setMonthlyLimit] = useState("")
  const [pauseOnAnomaly, setPauseOnAnomaly] = useState(true)
  const [spendData] = useState(generateAgentSpendData)

  const agent = mockAgents.find((a) => a.id === id)
  const agentTransactions = mockTransactions.filter((t) => t.agentId === id).slice(0, 10)

  useEffect(() => {
    if (agent) {
      setDailyLimit(agent.dailyLimit.toString())
      setMonthlyLimit(agent.monthlyLimit.toString())
    }
  }, [agent])

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive glow-text-red">AGENT NOT FOUND</h1>
          <p className="mt-2 text-muted-foreground font-mono text-sm">ID: {id}</p>
          <Button variant="outline" className="mt-4 bg-transparent" onClick={() => router.push("/agents")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Fleet
          </Button>
        </div>
      </div>
    )
  }

  const dailyPercent = (agent.currentDailySpend / agent.dailyLimit) * 100
  const monthlyPercent = (agent.currentMonthlySpend / agent.monthlyLimit) * 100

  // Mock card details (in production these would come from Stripe)
  const cardDetails = {
    number: "4242 4242 4242 " + agent.cardLastFour,
    expiry: "12/28",
    cvc: "314",
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ""))
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen p-6 pb-32">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/agents")}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Fleet
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl",
                agent.status === "active" && "bg-primary/10 glow-green",
                agent.status === "paused" && "bg-warning/10",
                agent.status === "cancelled" && "bg-destructive/10 glow-red",
              )}
            >
              <Bot
                className={cn(
                  "h-8 w-8",
                  agent.status === "active" && "text-primary",
                  agent.status === "paused" && "text-warning",
                  agent.status === "cancelled" && "text-destructive",
                )}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
              <p className="text-sm text-muted-foreground font-mono">{agent.clientName}</p>
            </div>
          </div>

          {/* System Status */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2",
                agent.status === "active" && "bg-primary/10 border border-primary/30",
                agent.status === "paused" && "bg-warning/10 border border-warning/30",
                agent.status === "cancelled" && "bg-destructive/10 border border-destructive/30",
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  agent.status === "active" && "bg-primary live-indicator",
                  agent.status === "paused" && "bg-warning",
                  agent.status === "cancelled" && "bg-destructive",
                )}
              />
              <span
                className={cn(
                  "text-sm font-mono uppercase",
                  agent.status === "active" && "text-primary",
                  agent.status === "paused" && "text-warning",
                  agent.status === "cancelled" && "text-destructive",
                )}
              >
                System {agent.status}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column - The Identity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Agent Profile Card */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Hardware Profile</span>
              <Badge variant="outline" className="font-mono text-xs">
                {agent.id}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{agent.description}</p>
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>DEPLOYED: {new Date(agent.createdAt).toLocaleDateString()}</span>
              <span>CARD: •••• {agent.cardLastFour}</span>
            </div>
          </div>

          {/* Virtual Card - Hero Element */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Virtual Card</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCardRevealed(!cardRevealed)}
                className="text-xs gap-2"
              >
                {cardRevealed ? (
                  <>
                    <EyeOff className="h-3 w-3" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" />
                    Reveal
                  </>
                )}
              </Button>
            </div>

            {/* Realistic Card Visualization */}
            <motion.div
              className={cn(
                "relative aspect-[1.586/1] w-full max-w-md mx-auto rounded-2xl overflow-hidden",
                agent.status === "active" && "glow-green",
                agent.status === "paused" && "",
                agent.status === "cancelled" && "glow-red",
              )}
              whileHover={{ scale: 1.02, rotateY: 5 }}
              transition={{ type: "spring" as const, stiffness: 300 }}
            >
              {/* Card Background */}
              <div
                className={cn(
                  "absolute inset-0",
                  agent.status === "active"
                    ? "bg-gradient-to-br from-primary/20 via-black to-primary/10"
                    : agent.status === "paused"
                      ? "bg-gradient-to-br from-warning/20 via-black to-warning/10"
                      : "bg-gradient-to-br from-destructive/20 via-black to-destructive/10",
                )}
              />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noise%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noise)%27/%3E%3C/svg%3E')] opacity-5" />

              {/* Card Content */}
              <div className="relative h-full p-6 flex flex-col justify-between">
                {/* Top Row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-10 rounded bg-gradient-to-br from-yellow-400 to-yellow-600" />
                  </div>
                  <span className="text-lg font-bold text-primary">QODA</span>
                </div>

                {/* Card Number */}
                <div className="my-4">
                  <AnimatePresence mode="wait">
                    {cardRevealed ? (
                      <motion.div
                        key="revealed"
                        initial={{ opacity: 0, filter: "blur(10px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, filter: "blur(10px)" }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-2xl font-mono tracking-wider">{cardDetails.number}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopy(cardDetails.number, "number")}
                        >
                          {copied === "number" ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-4"
                      >
                        <span className="text-2xl font-mono tracking-wider text-muted-foreground/50 blur-sm select-none">
                          4242 4242 4242 {agent.cardLastFour}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Row */}
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned To</span>
                    <p className="font-mono text-sm mt-0.5">{agent.name}</p>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Exp</span>
                      <div className="flex items-center gap-1">
                        <p className="font-mono text-sm mt-0.5">{cardRevealed ? cardDetails.expiry : "••/••"}</p>
                        {cardRevealed && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleCopy(cardDetails.expiry, "expiry")}
                          >
                            {copied === "expiry" ? (
                              <Check className="h-2.5 w-2.5 text-primary" />
                            ) : (
                              <Copy className="h-2.5 w-2.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">CVC</span>
                      <div className="flex items-center gap-1">
                        <p className="font-mono text-sm mt-0.5">{cardRevealed ? cardDetails.cvc : "•••"}</p>
                        {cardRevealed && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleCopy(cardDetails.cvc, "cvc")}
                          >
                            {copied === "cvc" ? (
                              <Check className="h-2.5 w-2.5 text-primary" />
                            ) : (
                              <Copy className="h-2.5 w-2.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Frozen Overlay */}
              {agent.status === "paused" && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <Snowflake className="h-12 w-12 text-warning mx-auto mb-2" />
                    <span className="font-mono text-warning text-sm uppercase tracking-wider">Card Frozen</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Card Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className={cn(
                  "flex-1 gap-2",
                  agent.status === "active"
                    ? "border-destructive/50 text-destructive hover:bg-destructive/10"
                    : "border-primary/50 text-primary hover:bg-primary/10",
                )}
                onClick={() => setIsFreezeDialogOpen(true)}
              >
                <Snowflake className="h-4 w-4" />
                {agent.status === "active" ? "Freeze Card" : "Unfreeze Card"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 bg-transparent"
                onClick={() => setIsEditLimitsOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                Edit Limits
              </Button>
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Configuration</span>
              {pauseOnAnomaly ? (
                <ShieldCheck className="h-4 w-4 text-primary" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-warning" />
              )}
            </div>

            <div className="space-y-6">
              {/* Daily Limit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground uppercase">Daily Limit</Label>
                  <span className="font-mono text-sm">
                    {formatCurrency(agent.currentDailySpend)} / {formatCurrency(agent.dailyLimit)}
                  </span>
                </div>
                <Progress
                  value={dailyPercent}
                  className={cn(
                    "h-2",
                    dailyPercent > 80 && dailyPercent <= 95 && "[&>div]:bg-warning",
                    dailyPercent > 95 && "[&>div]:bg-destructive",
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{dailyPercent.toFixed(1)}% utilized</span>
                  <span
                    className={cn(
                      dailyPercent > 95 && "text-destructive glow-text-red",
                      dailyPercent > 80 && dailyPercent <= 95 && "text-warning",
                    )}
                  >
                    {dailyPercent > 95 ? "LIMIT CRITICAL" : dailyPercent > 80 ? "WARNING" : "NOMINAL"}
                  </span>
                </div>
              </div>

              {/* Monthly Limit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono text-muted-foreground uppercase">Monthly Limit</Label>
                  <span className="font-mono text-sm">
                    {formatCurrency(agent.currentMonthlySpend)} / {formatCurrency(agent.monthlyLimit)}
                  </span>
                </div>
                <Progress
                  value={monthlyPercent}
                  className={cn(
                    "h-2",
                    monthlyPercent > 80 && monthlyPercent <= 95 && "[&>div]:bg-warning",
                    monthlyPercent > 95 && "[&>div]:bg-destructive",
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{monthlyPercent.toFixed(1)}% utilized</span>
                  <span
                    className={cn(
                      monthlyPercent > 95 && "text-destructive glow-text-red",
                      monthlyPercent > 80 && monthlyPercent <= 95 && "text-warning",
                    )}
                  >
                    {monthlyPercent > 95 ? "LIMIT CRITICAL" : monthlyPercent > 80 ? "WARNING" : "NOMINAL"}
                  </span>
                </div>
              </div>

              {/* Anomaly Detection Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="space-y-1">
                  <Label className="text-sm">Pause on Anomaly Detection</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically freeze card when unusual spending patterns detected
                  </p>
                </div>
                <Switch checked={pauseOnAnomaly} onCheckedChange={setPauseOnAnomaly} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column - The Telemetry */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Spend Velocity Graph */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Spend Velocity (24h)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary live-indicator" />
                <span className="text-xs font-mono text-primary">LIVE</span>
              </div>
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendData}>
                  <defs>
                    <linearGradient id="agentSpendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.8 0.2 155)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.8 0.2 155)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="hour"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "oklch(0.6 0 0)", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.08 0 0 / 0.9)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: "12px",
                      backdropFilter: "blur(20px)",
                      fontFamily: "JetBrains Mono",
                    }}
                    labelStyle={{ color: "oklch(0.6 0 0)", fontSize: 10 }}
                    itemStyle={{ color: "oklch(0.8 0.2 155)" }}
                    formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, "Spend"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="oklch(0.8 0.2 155)"
                    strokeWidth={2}
                    fill="url(#agentSpendGradient)"
                    className="glow-line-green"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transaction Log */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Transaction Log
                </span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Last 10
              </Badge>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {agentTransactions.length > 0 ? (
                agentTransactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "flex items-center justify-between py-3 px-4 rounded-lg",
                      "bg-secondary/30 hover:bg-secondary/50 transition-colors",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          tx.status === "approved" && "bg-primary",
                          tx.status === "declined" && "bg-destructive live-indicator-red",
                          tx.status === "pending" && "bg-warning",
                        )}
                      />
                      <div>
                        <p className="text-sm font-medium">{tx.merchantName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono">{formatTime(tx.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-mono text-sm font-medium",
                          tx.status === "approved" && "text-primary glow-text-green",
                          tx.status === "declined" && "text-destructive glow-text-red",
                        )}
                      >
                        {tx.status === "declined" ? "-" : ""}
                        {formatCurrency(tx.amount)}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-mono",
                          tx.status === "approved" && "border-primary/30 text-primary",
                          tx.status === "declined" && "border-destructive/30 text-destructive",
                          tx.status === "pending" && "border-warning/30 text-warning",
                        )}
                      >
                        {tx.status.toUpperCase()}
                      </Badge>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm font-mono">No transactions recorded</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4 text-center">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Today&apos;s Txns</span>
              <p className="text-2xl font-bold text-primary glow-text-green mt-1 font-mono">
                {agentTransactions.filter((t) => t.status === "approved").length}
              </p>
            </div>
            <div className="glass-card p-4 text-center">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Avg. Transaction</span>
              <p className="text-2xl font-bold text-primary glow-text-green mt-1 font-mono">
                {formatCurrency(
                  agentTransactions.length > 0
                    ? agentTransactions.reduce((sum, t) => sum + t.amount, 0) / agentTransactions.length
                    : 0,
                )}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Freeze Card Dialog */}
      <Dialog open={isFreezeDialogOpen} onOpenChange={setIsFreezeDialogOpen}>
        <DialogContent className="glass-card border-destructive/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {agent.status === "active" ? "Freeze Card" : "Unfreeze Card"}
            </DialogTitle>
            <DialogDescription>
              {agent.status === "active"
                ? "This will immediately block all transactions for this agent. You can unfreeze it at any time."
                : "This will re-enable transactions for this agent."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFreezeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={agent.status === "active" ? "destructive" : "default"}
              onClick={() => setIsFreezeDialogOpen(false)}
            >
              {agent.status === "active" ? "Freeze Card" : "Unfreeze Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Limits Dialog */}
      <Dialog open={isEditLimitsOpen} onOpenChange={setIsEditLimitsOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Edit Spending Limits</DialogTitle>
            <DialogDescription>Adjust the daily and monthly spending limits for {agent.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase">Daily Limit ($)</Label>
              <Input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase">Monthly Limit ($)</Label>
              <Input
                type="number"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditLimitsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsEditLimitsOpen(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
