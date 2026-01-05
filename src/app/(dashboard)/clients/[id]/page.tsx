"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { mockClients, mockAgents, mockInvoices } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Bot,
  CreditCard,
  Calendar,
  Percent,
  Plus,
  Settings,
  Download,
  FileText,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [isIssueCardOpen, setIsIssueCardOpen] = useState(false)

  // Find client by ID
  const client = mockClients.find((c) => c.id === params.id)

  // Get agents for this client
  const clientAgents = mockAgents.filter((a) => a.clientId === params.id)

  // Get invoices for this client
  const clientInvoices = mockInvoices.filter((i) => i.clientId === params.id)

  // Calculate total spend from agents
  const totalAllTimeSpend = clientAgents.reduce((sum, a) => sum + a.currentMonthlySpend, 0) + (client?.totalSpend || 0)

  // Next invoice date (mock: 15 days from now)
  const nextInvoiceDate = new Date()
  nextInvoiceDate.setDate(nextInvoiceDate.getDate() + 15)

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Client Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested client does not exist.</p>
          <Button onClick={() => router.push("/clients")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="p-6 space-y-8 pb-32" variants={containerVariants} initial="hidden" animate="visible">
      {/* Back Button */}
      <motion.div variants={itemVariants}>
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/clients")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Button>
      </motion.div>

      {/* Header - Client Name + Total Spend */}
      <motion.div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6" variants={itemVariants}>
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold tracking-tight">{client.name}</h1>
              <Badge
                className={cn(
                  "uppercase text-xs tracking-wider",
                  client.status === "active"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <motion.span
                  className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    client.status === "active" ? "bg-primary" : "bg-muted-foreground",
                  )}
                  animate={client.status === "active" ? { opacity: [1, 0.4, 1] } : {}}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                />
                {client.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{client.billingEmail}</p>
          </div>
        </div>

        {/* Total Spend - Massive Glowing Number */}
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Spend (All Time)</p>
          <motion.p
            className="text-5xl lg:text-6xl font-bold font-mono glow-text tabular-nums"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          >
            {formatCurrency(totalAllTimeSpend)}
          </motion.p>
        </div>
      </motion.div>

      {/* Vital Signs Bar - 4 Cards */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={containerVariants}>
        {[
          {
            label: "Active Agents",
            value: clientAgents.filter((a) => a.status === "active").length,
            icon: Bot,
            suffix: `/ ${clientAgents.length}`,
          },
          {
            label: "Cards Issued",
            value: clientAgents.length,
            icon: CreditCard,
            suffix: "cards",
          },
          {
            label: "Next Invoice",
            value: formatDate(nextInvoiceDate.toISOString()),
            icon: Calendar,
            isDate: true,
          },
          {
            label: "Markup Rate",
            value: client.markupPercentage,
            icon: Percent,
            suffix: "%",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            variants={cardVariants}
            whileHover={{ scale: 1.02, transition: { type: "spring", stiffness: 300 } }}
            className={cn(
              "relative p-4 rounded-xl overflow-hidden",
              "bg-black/40 backdrop-blur-xl",
              "border border-white/10",
              "group cursor-default",
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums">
              {stat.isDate ? (
                stat.value
              ) : (
                <>
                  {stat.value}
                  {stat.suffix && <span className="text-sm text-muted-foreground ml-1">{stat.suffix}</span>}
                </>
              )}
            </p>
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </motion.div>

      {/* Agent Fleet - Deployed Units */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Deployed Units</h2>
            <p className="text-sm text-muted-foreground">{clientAgents.length} agents assigned to this client</p>
          </div>
          <Dialog open={isIssueCardOpen} onOpenChange={setIsIssueCardOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 glow-green">
                <Plus className="w-4 h-4" />
                Issue New Card
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/90 backdrop-blur-xl border-white/10">
              <DialogHeader>
                <DialogTitle>Issue New Card</DialogTitle>
                <DialogDescription>Create a new virtual card for an agent assigned to {client.name}.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Agent Name</Label>
                  <Input placeholder="e.g., Content Writer Bot" className="bg-black/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="What will this agent do?" className="bg-black/50 border-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Daily Limit</Label>
                    <Input type="number" defaultValue="500" className="bg-black/50 border-white/10 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Limit</Label>
                    <Input type="number" defaultValue="5000" className="bg-black/50 border-white/10 font-mono" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsIssueCardOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsIssueCardOpen(false)} className="glow-green">
                  Issue Card
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {clientAgents.map((agent, index) => {
              const utilizationPercent = (agent.currentMonthlySpend / agent.monthlyLimit) * 100
              const isOverBudget = utilizationPercent >= 100
              const isHighUtilization = utilizationPercent > 80

              return (
                <motion.div
                  key={agent.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, transition: { type: "spring", stiffness: 300 } }}
                  className={cn(
                    "relative p-5 rounded-xl overflow-hidden cursor-pointer",
                    "bg-black/40 backdrop-blur-xl",
                    "border transition-colors",
                    isOverBudget
                      ? "border-red-500/50 glow-red"
                      : isHighUtilization
                        ? "border-yellow-500/30"
                        : "border-white/10 hover:border-primary/30",
                  )}
                  onClick={() => router.push(`/agents/${agent.id}`)}
                >
                  {/* Over Budget Warning */}
                  {isOverBudget && (
                    <div className="absolute top-3 right-3">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                      >
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      </motion.div>
                    </div>
                  )}

                  {/* Agent Info */}
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        isOverBudget ? "bg-red-500/10" : agent.status === "active" ? "bg-primary/10" : "bg-muted/10",
                      )}
                    >
                      <Bot
                        className={cn(
                          "w-5 h-5",
                          isOverBudget
                            ? "text-red-500"
                            : agent.status === "active"
                              ? "text-primary"
                              : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">•••• {agent.cardLastFour}</p>
                    </div>
                  </div>

                  {/* Spend Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Spend</span>
                      <span
                        className={cn(
                          "font-mono font-semibold tabular-nums",
                          isOverBudget ? "text-red-500 glow-text-red" : "text-foreground",
                        )}
                      >
                        {formatCurrency(agent.currentMonthlySpend)}
                      </span>
                    </div>
                    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full",
                          isOverBudget ? "bg-red-500" : isHighUtilization ? "bg-yellow-500" : "bg-primary",
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Limit: {formatCurrency(agent.monthlyLimit)}</span>
                      <span
                        className={cn(
                          "font-mono",
                          isOverBudget ? "text-red-500" : isHighUtilization ? "text-yellow-500" : "",
                        )}
                      >
                        {utilizationPercent.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Manage Button */}
                  <div className="mt-4 flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={cn(
                        "uppercase text-[10px] tracking-wider",
                        agent.status === "active" && !isOverBudget && "text-primary border-primary/30",
                        agent.status === "active" && isOverBudget && "text-red-500 border-red-500/30",
                        agent.status === "paused" && "text-yellow-500 border-yellow-500/30",
                      )}
                    >
                      {agent.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs gap-1 h-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/agents/${agent.id}`)
                      }}
                    >
                      <Settings className="w-3 h-3" />
                      Manage
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Empty State - Issue First Card */}
          {clientAgents.length === 0 && (
            <motion.div
              variants={cardVariants}
              className={cn(
                "col-span-full p-8 rounded-xl text-center",
                "bg-black/40 backdrop-blur-xl",
                "border border-dashed border-white/20",
              )}
            >
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Agents Deployed</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Issue the first virtual card for this client to get started.
              </p>
              <Button onClick={() => setIsIssueCardOpen(true)} className="glow-green">
                <Plus className="w-4 h-4 mr-2" />
                Issue First Card
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Billing History */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Billing History</h2>
            <p className="text-sm text-muted-foreground">Past invoices for {client.name}</p>
          </div>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => router.push("/invoices/new")}>
            <FileText className="w-4 h-4" />
            Create Invoice
          </Button>
        </div>

        <div className={cn("rounded-xl overflow-hidden", "bg-black/40 backdrop-blur-xl", "border border-white/10")}>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Invoice ID</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                  Amount
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientInvoices.length > 0 ? (
                clientInvoices.map((invoice, index) => (
                  <motion.tr
                    key={invoice.id}
                    className="border-white/5 hover:bg-white/5 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <TableCell className="font-mono text-sm">{invoice.id.toUpperCase()}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(invoice.createdAt)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-semibold tabular-nums",
                        invoice.status === "paid" && "glow-text",
                        invoice.status === "overdue" && "text-red-500 glow-text-red",
                      )}
                    >
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "uppercase text-[10px] tracking-wider",
                          invoice.status === "paid" && "text-primary border-primary/30 bg-primary/10",
                          invoice.status === "sent" && "text-blue-400 border-blue-400/30 bg-blue-400/10",
                          invoice.status === "draft" && "text-muted-foreground border-white/20",
                          invoice.status === "overdue" && "text-red-500 border-red-500/30 bg-red-500/10",
                        )}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Download PDF">
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No invoices yet for this client.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </motion.div>
  )
}
