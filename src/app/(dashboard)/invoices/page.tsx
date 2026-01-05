"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { mockInvoices } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Send, CheckCircle, Clock, AlertTriangle, Plus, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const statusConfig = {
  draft: { icon: FileText, label: "DRAFT", className: "text-muted-foreground border-muted-foreground/30" },
  sent: { icon: Send, label: "SENT", className: "text-info border-info/30" },
  paid: { icon: CheckCircle, label: "PAID", className: "text-primary border-primary/30 glow-text-green" },
  overdue: { icon: AlertTriangle, label: "OVERDUE", className: "text-red-500 border-red-500/30 glow-text-red" },
}

const extendedInvoices = [
  ...mockInvoices,
  {
    id: "inv_5",
    clientId: "cl_1",
    clientName: "TechCorp Industries",
    periodStart: "2025-11-01T00:00:00Z",
    periodEnd: "2025-11-30T23:59:59Z",
    subtotal: 3890.2,
    markupAmount: 778.04,
    total: 4668.24,
    status: "paid" as const,
    sentAt: "2025-12-01T10:00:00Z",
    paidAt: "2025-12-05T09:00:00Z",
    createdAt: "2025-12-01T09:00:00Z",
  },
  {
    id: "inv_6",
    clientId: "cl_2",
    clientName: "Nexus Ventures",
    periodStart: "2025-11-01T00:00:00Z",
    periodEnd: "2025-11-30T23:59:59Z",
    subtotal: 2560.5,
    markupAmount: 640.13,
    total: 3200.63,
    status: "paid" as const,
    sentAt: "2025-12-01T10:00:00Z",
    paidAt: "2025-12-03T14:00:00Z",
    createdAt: "2025-12-01T09:00:00Z",
  },
  {
    id: "inv_7",
    clientId: "cl_3",
    clientName: "Quantum Dynamics",
    periodStart: "2025-12-01T00:00:00Z",
    periodEnd: "2025-12-15T23:59:59Z",
    subtotal: 4120.8,
    markupAmount: 618.12,
    total: 4738.92,
    status: "sent" as const,
    sentAt: "2025-12-16T10:00:00Z",
    createdAt: "2025-12-16T09:00:00Z",
  },
  {
    id: "inv_8",
    clientId: "cl_5",
    clientName: "Apex Analytics",
    periodStart: "2025-10-01T00:00:00Z",
    periodEnd: "2025-10-31T23:59:59Z",
    subtotal: 1890.0,
    markupAmount: 567.0,
    total: 2457.0,
    status: "overdue" as const,
    sentAt: "2025-11-01T10:00:00Z",
    createdAt: "2025-11-01T09:00:00Z",
  },
  {
    id: "inv_9",
    clientId: "cl_1",
    clientName: "TechCorp Industries",
    periodStart: "2025-10-01T00:00:00Z",
    periodEnd: "2025-10-31T23:59:59Z",
    subtotal: 5240.6,
    markupAmount: 1048.12,
    total: 6288.72,
    status: "paid" as const,
    sentAt: "2025-11-01T10:00:00Z",
    paidAt: "2025-11-04T11:00:00Z",
    createdAt: "2025-11-01T09:00:00Z",
  },
  {
    id: "inv_10",
    clientId: "cl_4",
    clientName: "Stellar Systems",
    periodStart: "2025-11-01T00:00:00Z",
    periodEnd: "2025-11-30T23:59:59Z",
    subtotal: 1560.25,
    markupAmount: 312.05,
    total: 1872.3,
    status: "paid" as const,
    sentAt: "2025-12-01T10:00:00Z",
    paidAt: "2025-12-02T16:00:00Z",
    createdAt: "2025-12-01T09:00:00Z",
  },
  {
    id: "inv_11",
    clientId: "cl_2",
    clientName: "Nexus Ventures",
    periodStart: "2025-10-01T00:00:00Z",
    periodEnd: "2025-10-31T23:59:59Z",
    subtotal: 2890.4,
    markupAmount: 722.6,
    total: 3613.0,
    status: "paid" as const,
    sentAt: "2025-11-01T10:00:00Z",
    paidAt: "2025-11-06T14:00:00Z",
    createdAt: "2025-11-01T09:00:00Z",
  },
  {
    id: "inv_12",
    clientId: "cl_3",
    clientName: "Quantum Dynamics",
    periodStart: "2025-11-01T00:00:00Z",
    periodEnd: "2025-11-15T23:59:59Z",
    subtotal: 3450.0,
    markupAmount: 517.5,
    total: 3967.5,
    status: "paid" as const,
    sentAt: "2025-11-16T10:00:00Z",
    paidAt: "2025-11-18T09:00:00Z",
    createdAt: "2025-11-16T09:00:00Z",
  },
  {
    id: "inv_13",
    clientId: "cl_1",
    clientName: "TechCorp Industries",
    periodStart: "2025-09-01T00:00:00Z",
    periodEnd: "2025-09-30T23:59:59Z",
    subtotal: 4780.9,
    markupAmount: 956.18,
    total: 5737.08,
    status: "paid" as const,
    sentAt: "2025-10-01T10:00:00Z",
    paidAt: "2025-10-03T15:00:00Z",
    createdAt: "2025-10-01T09:00:00Z",
  },
  {
    id: "inv_14",
    clientId: "cl_5",
    clientName: "Apex Analytics",
    periodStart: "2025-09-01T00:00:00Z",
    periodEnd: "2025-09-30T23:59:59Z",
    subtotal: 980.0,
    markupAmount: 294.0,
    total: 1274.0,
    status: "overdue" as const,
    sentAt: "2025-10-01T10:00:00Z",
    createdAt: "2025-10-01T09:00:00Z",
  },
  {
    id: "inv_15",
    clientId: "cl_4",
    clientName: "Stellar Systems",
    periodStart: "2025-10-01T00:00:00Z",
    periodEnd: "2025-10-31T23:59:59Z",
    subtotal: 2120.8,
    markupAmount: 424.16,
    total: 2544.96,
    status: "paid" as const,
    sentAt: "2025-11-01T10:00:00Z",
    paidAt: "2025-11-05T10:00:00Z",
    createdAt: "2025-11-01T09:00:00Z",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.1,
    },
  },
}

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
}

const heroVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 20,
    },
  },
}

export default function InvoicesPage() {
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "paid" | "overdue">("all")

  const filteredInvoices = filter === "all" ? extendedInvoices : extendedInvoices.filter((inv) => inv.status === filter)

  // Calculate totals
  const totalRevenue = extendedInvoices.filter((i) => i.status === "paid").reduce((acc, i) => acc + i.total, 0)
  const pendingRevenue = extendedInvoices.filter((i) => i.status === "sent").reduce((acc, i) => acc + i.total, 0)
  const overdueAmount = extendedInvoices.filter((i) => i.status === "overdue").reduce((acc, i) => acc + i.total, 0)

  return (
    <div className="min-h-screen p-6 md:p-10">
      {/* Hero Section - Revenue Metrics with glow */}
      <motion.section
        className="flex flex-col items-center justify-center py-12 md:py-16"
        initial="hidden"
        animate="visible"
        variants={heroVariants}
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
            <div className="w-[400px] h-[200px] rounded-full bg-primary/20 blur-[80px]" />
          </motion.div>

          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Total Revenue Collected</p>
          <h1 className="text-6xl md:text-8xl font-bold tabular-nums glow-text-green">
            {formatCurrency(totalRevenue)}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-4">
            <motion.span
              className="w-2 h-2 rounded-full bg-primary live-indicator"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Billing System Active</span>
          </div>
        </motion.div>
      </motion.section>

      {/* Quick Stats Row */}
      <motion.section
        className="flex flex-wrap items-center justify-center gap-8 md:gap-16 mb-12 py-6 border-y border-white/[0.04]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Clock className="w-4 h-4 text-info" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</p>
            <p className="text-xl tabular-nums">{formatCurrency(pendingRevenue)}</p>
          </div>
        </motion.div>
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overdue</p>
            <p className="text-xl tabular-nums text-red-500 glow-text-red">{formatCurrency(overdueAmount)}</p>
          </div>
        </motion.div>
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Zap className="w-4 h-4 text-primary" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Collection Rate</p>
            <p className="text-xl tabular-nums glow-text-green">94.2%</p>
          </div>
        </motion.div>
      </motion.section>

      {/* Filter Tabs */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex gap-2">
          {(["all", "draft", "sent", "paid", "overdue"] as const).map((status) => (
            <motion.button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all",
                filter === status
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {status}
            </motion.button>
          ))}
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link href="/invoices/new">
            <Button className="gap-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20">
              <Plus className="h-4 w-4" />
              Generate Invoice
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        className="glass-card overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {/* Table Header */}
        <div className="grid grid-cols-[100px_1fr_120px_120px_140px_100px] gap-4 px-6 py-4 border-b border-white/[0.04] text-[10px] uppercase tracking-wider text-muted-foreground">
          <div>Invoice ID</div>
          <div>Client</div>
          <div>Issued</div>
          <div>Due Date</div>
          <div className="text-right">Amount</div>
          <div className="text-center">Status</div>
        </div>

        {/* Table Body */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <AnimatePresence mode="popLayout">
            {filteredInvoices.map((invoice) => {
              const config = statusConfig[invoice.status]
              const StatusIcon = config.icon
              const isOverdue = invoice.status === "overdue"
              const isPaid = invoice.status === "paid"
              const dueDate = new Date(invoice.periodEnd)
              dueDate.setDate(dueDate.getDate() + 14)

              return (
                <motion.div
                  key={invoice.id}
                  layout
                  variants={rowVariants}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  whileHover={{
                    backgroundColor: "rgba(255,255,255,0.02)",
                    transition: { duration: 0.15 },
                  }}
                  className="grid grid-cols-[100px_1fr_120px_120px_140px_100px] gap-4 px-6 py-3 border-b border-white/[0.02] cursor-pointer items-center"
                >
                  {/* Invoice ID - Mono */}
                  <Link href={`/invoices/${invoice.id}`} className="contents">
                    <div className="text-sm tabular-nums text-muted-foreground">{invoice.id.toUpperCase()}</div>

                    {/* Client Name */}
                    <div className="text-sm font-medium truncate">{invoice.clientName}</div>

                    {/* Date Issued */}
                    <div className="text-sm tabular-nums text-muted-foreground">{formatDate(invoice.createdAt)}</div>

                    {/* Due Date */}
                    <div
                      className={cn(
                        "text-sm tabular-nums",
                        isOverdue ? "text-red-500 glow-text-red" : "text-muted-foreground",
                      )}
                    >
                      {formatDate(dueDate.toISOString())}
                    </div>

                    {/* Amount - Mono + Glowing */}
                    <div
                      className={cn(
                        "text-sm font-bold tabular-nums text-right",
                        isPaid && "text-primary glow-text-green",
                        isOverdue && "text-red-500 glow-text-red",
                      )}
                    >
                      {formatCurrency(invoice.total)}
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-center">
                      <Badge variant="outline" className={cn("uppercase text-[9px] tracking-wider", config.className)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>

        {/* Table Footer - Summary */}
        <div className="grid grid-cols-[100px_1fr_120px_120px_140px_100px] gap-4 px-6 py-4 border-t border-white/[0.06] bg-white/[0.01]">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground col-span-4">
            {filteredInvoices.length} invoices
          </div>
          <div className="text-sm font-bold tabular-nums text-right glow-text-green">
            {formatCurrency(filteredInvoices.reduce((acc, i) => acc + i.total, 0))}
          </div>
          <div />
        </div>
      </motion.div>
    </div>
  )
}
