"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { mockClients } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Zap, ArrowLeft, FileText, Loader2, CheckCircle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"
import type { DateRange } from "react-day-picker"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

interface CalculatedInvoice {
  rawSpend: number
  markupPercent: number
  markupAmount: number
  total: number
  agentBreakdown: {
    name: string
    spend: number
  }[]
  transactionCount: number
}

export default function NewInvoicePage() {
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(subMonths(new Date(), 1)),
  })
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculatedInvoice, setCalculatedInvoice] = useState<CalculatedInvoice | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreated, setIsCreated] = useState(false)

  const activeClients = mockClients.filter((c) => c.status === "active")
  const selectedClientData = mockClients.find((c) => c.id === selectedClient)

  const handleCalculate = async () => {
    if (!selectedClient || !dateRange?.from || !dateRange?.to) return

    setIsCalculating(true)
    setCalculatedInvoice(null)

    // Simulate API call to calculate spend
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock calculation based on client data
    const client = mockClients.find((c) => c.id === selectedClient)
    if (!client) return

    // Generate realistic mock data
    const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    const rawSpend = Math.round((client.totalSpend / 30) * daysDiff * 100) / 100
    const markupPercent = client.markupPercentage
    const markupAmount = Math.round(rawSpend * (markupPercent / 100) * 100) / 100

    setCalculatedInvoice({
      rawSpend,
      markupPercent,
      markupAmount,
      total: rawSpend + markupAmount,
      agentBreakdown: [
        { name: "Lead Gen Bot v2", spend: rawSpend * 0.4 },
        { name: "Support Agent Alpha", spend: rawSpend * 0.25 },
        { name: "Content Creator Pro", spend: rawSpend * 0.2 },
        { name: "Data Processor X1", spend: rawSpend * 0.15 },
      ],
      transactionCount: Math.floor(daysDiff * 12),
    })

    setIsCalculating(false)
  }

  const handleCreateDraft = async () => {
    setIsCreating(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsCreating(false)
    setIsCreated(true)
  }

  const canCalculate = selectedClient && dateRange?.from && dateRange?.to

  return (
    <div className="min-h-screen p-6 md:p-10">
      {/* Header */}
      <motion.div
        className="flex items-center gap-4 mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link href="/invoices">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Invoice</h1>
          <p className="text-sm text-muted-foreground">Configure billing parameters for revenue extraction</p>
        </div>
      </motion.div>

      {/* Main Form - Center Focused */}
      <div className="max-w-2xl mx-auto">
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Client Selector */}
          <div className="space-y-3">
            <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Target Client</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="h-14 bg-white/[0.02] border-white/[0.06] text-lg">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent className="bg-black/90 backdrop-blur-xl border-white/[0.06]">
                {activeClients.map((client) => (
                  <SelectItem key={client.id} value={client.id} className="focus:bg-white/5">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span>{client.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {client.markupPercentage}% markup
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientData && (
              <motion.p className="text-xs text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Billing: {selectedClientData.billingCycle} · Email: {selectedClientData.billingEmail}
              </motion.p>
            )}
          </div>

          {/* Date Range Picker */}
          <div className="space-y-3">
            <Label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Billing Period</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-14 w-full justify-start text-left bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]",
                    !dateRange && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-3 h-5 w-5 text-muted-foreground" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <span className="tabular-nums text-lg">
                        {format(dateRange.from, "MMM d, yyyy")} — {format(dateRange.to, "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span className="tabular-nums text-lg">{format(dateRange.from, "MMM d, yyyy")}</span>
                    )
                  ) : (
                    <span>Select date range...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-black/90 backdrop-blur-xl border-white/[0.06]" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className="p-3"
                />
                {/* Quick select buttons */}
                <div className="border-t border-white/[0.06] p-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      setDateRange({
                        from: startOfMonth(subMonths(new Date(), 1)),
                        to: endOfMonth(subMonths(new Date(), 1)),
                      })
                    }
                  >
                    Last Month
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      setDateRange({
                        from: subDays(new Date(), 14),
                        to: new Date(),
                      })
                    }
                  >
                    Last 14 Days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      setDateRange({
                        from: subDays(new Date(), 7),
                        to: new Date(),
                      })
                    }
                  >
                    Last 7 Days
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* The Magic Button */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Button
              onClick={handleCalculate}
              disabled={!canCalculate || isCalculating}
              className={cn(
                "w-full h-16 text-lg gap-3 transition-all duration-300",
                canCalculate && !isCalculating
                  ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 glow-green"
                  : "bg-white/5 text-muted-foreground border border-white/10",
              )}
            >
              {isCalculating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Calculating Spend...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Calculate Spend
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Preview State - After Calculation */}
        <AnimatePresence mode="wait">
          {calculatedInvoice && !isCreated && (
            <motion.div
              className="mt-12 space-y-6"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring" as const, stiffness: 100, damping: 20 }}
            >
              {/* Divider with sparkle */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <Sparkles className="h-4 w-4 text-primary" />
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              </div>

              {/* Summary Card */}
              <motion.div
                className="glass-card p-8 relative overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {/* Glow effect */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 blur-[80px] rounded-full" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Invoice Preview</h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {calculatedInvoice.transactionCount} transactions
                    </span>
                  </div>

                  {/* Main calculations */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-white/[0.04]">
                      <span className="text-muted-foreground">Raw Spend</span>
                      <span className="text-2xl tabular-nums">{formatCurrency(calculatedInvoice.rawSpend)}</span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-white/[0.04]">
                      <span className="text-muted-foreground">Markup ({calculatedInvoice.markupPercent}%)</span>
                      <span className="text-2xl tabular-nums text-primary glow-text-green">
                        +{formatCurrency(calculatedInvoice.markupAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-4">
                      <span className="text-lg font-medium">Total Invoice</span>
                      <motion.span
                        className="text-4xl font-bold tabular-nums text-primary glow-text-green"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" as const, stiffness: 200 }}
                      >
                        {formatCurrency(calculatedInvoice.total)}
                      </motion.span>
                    </div>
                  </div>

                  {/* Agent Breakdown */}
                  <div className="mt-8 pt-6 border-t border-white/[0.04]">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
                      Spend by Agent
                    </h4>
                    <div className="space-y-2">
                      {calculatedInvoice.agentBreakdown.map((agent, i) => (
                        <motion.div
                          key={agent.name}
                          className="flex items-center justify-between text-sm"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                        >
                          <span className="text-muted-foreground truncate">{agent.name}</span>
                          <span className="tabular-nums">{formatCurrency(agent.spend)}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Create Draft Button */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Button
                  onClick={handleCreateDraft}
                  disabled={isCreating}
                  className="w-full h-14 text-lg gap-3 bg-primary text-primary-foreground hover:bg-primary/90 glow-green"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating Draft...
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5" />
                      Create Draft
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Success State */}
          {isCreated && (
            <motion.div
              className="mt-12"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring" as const, stiffness: 100 }}
            >
              <div className="glass-card p-12 text-center relative overflow-hidden">
                {/* Success glow */}
                <div className="absolute inset-0 bg-primary/5" />
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-primary/20 blur-[100px] rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                />

                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" as const, stiffness: 200, delay: 0.1 }}
                  >
                    <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6 glow-text-green" />
                  </motion.div>

                  <h2 className="text-2xl font-bold mb-2">Invoice Created</h2>
                  <p className="text-muted-foreground mb-8">
                    Draft invoice for {selectedClientData?.name} has been generated
                  </p>

                  <div className="flex gap-4 justify-center">
                    <Link href="/invoices">
                      <Button variant="outline" className="gap-2 bg-white/5 border-white/10 hover:bg-white/10">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Invoices
                      </Button>
                    </Link>
                    <Link href="/invoices/inv_new">
                      <Button className="gap-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20">
                        <FileText className="h-4 w-4" />
                        View Invoice
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
