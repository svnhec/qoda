"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { mockInvoices } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Send,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Building2,
  Mail,
  Calendar,
  Zap,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

function formatLongDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

const statusConfig = {
  draft: {
    icon: FileText,
    label: "DRAFT",
    className: "text-muted-foreground border-muted-foreground/30 bg-muted-foreground/10",
  },
  sent: { icon: Clock, label: "SENT", className: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  paid: { icon: CheckCircle, label: "PAID", className: "text-primary border-primary/30 bg-primary/10 glow-text-green" },
  overdue: {
    icon: AlertTriangle,
    label: "OVERDUE",
    className: "text-red-500 border-red-500/30 bg-red-500/10 glow-text-red",
  },
}

// Mock line items grouped by agent
const mockLineItems = {
  inv_1: [
    {
      agentId: "ag_1",
      agentName: "Lead Gen Bot v2",
      items: [
        { service: "OpenAI GPT-4 API", calls: 12450, unitCost: 0.00015, total: 1867.5 },
        { service: "Anthropic Claude API", calls: 3200, unitCost: 0.0002, total: 640.0 },
        { service: "Pinecone Vector DB", queries: 45000, unitCost: 0.00001, total: 450.0 },
      ],
    },
    {
      agentId: "ag_2",
      agentName: "Support Agent Alpha",
      items: [
        { service: "OpenAI GPT-4 API", calls: 8900, unitCost: 0.00015, total: 1335.0 },
        { service: "Twilio SMS API", messages: 240, unitCost: 0.0075, total: 180.0 },
      ],
    },
  ],
  inv_2: [
    {
      agentId: "ag_3",
      agentName: "Content Creator Pro",
      items: [
        { service: "OpenAI GPT-4 API", calls: 15600, unitCost: 0.00015, total: 2340.0 },
        { service: "Stability AI Image Gen", images: 450, unitCost: 0.02, total: 900.0 },
      ],
    },
  ],
  inv_3: [
    {
      agentId: "ag_4",
      agentName: "Data Processor X1",
      items: [
        { service: "OpenAI GPT-4 API", calls: 28000, unitCost: 0.00015, total: 4200.0 },
        { service: "AWS Bedrock", calls: 5600, unitCost: 0.00025, total: 1400.0 },
        { service: "Pinecone Vector DB", queries: 89000, unitCost: 0.00001, total: 890.25 },
      ],
    },
    {
      agentId: "ag_5",
      agentName: "Email Automation Bot",
      items: [
        { service: "OpenAI GPT-3.5 API", calls: 12000, unitCost: 0.00005, total: 600.0 },
        { service: "SendGrid Email API", emails: 8000, unitCost: 0.001, total: 800.0 },
      ],
    },
  ],
  inv_4: [
    {
      agentId: "ag_6",
      agentName: "Research Assistant",
      items: [
        { service: "OpenAI GPT-4 API", calls: 18500, unitCost: 0.00015, total: 2775.0 },
        { service: "Perplexity Search API", searches: 1154, unitCost: 0.01, total: 115.4 },
      ],
    },
  ],
}

// Extended invoices for the detail page
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
    markupPercentage: 20,
    total: 4668.24,
    status: "paid" as const,
    sentAt: "2025-12-01T10:00:00Z",
    paidAt: "2025-12-05T09:00:00Z",
    createdAt: "2025-12-01T09:00:00Z",
  },
]

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)

  const invoice = extendedInvoices.find((i) => i.id === params.id) || mockInvoices[0]
  const lineItems = mockLineItems[invoice.id as keyof typeof mockLineItems] || mockLineItems.inv_1
  const config = statusConfig[invoice.status]
  const StatusIcon = config.icon

  // Calculate markup percentage (mock)
  const markupPercentage = Math.round((invoice.markupAmount / invoice.subtotal) * 100)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://qoda.finance/invoice/${invoice.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = async () => {
    setSending(true)
    await new Promise((r) => setTimeout(r, 1500))
    setSending(false)
  }

  const dueDate = new Date(invoice.periodEnd)
  dueDate.setDate(dueDate.getDate() + 14)

  return (
    <div className="min-h-screen p-6 md:p-10">
      {/* Floating Action Header */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 glass-card-intense border-b border-white/[0.06] px-6 py-4"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold">{invoice.id.toUpperCase()}</h1>
                <Badge variant="outline" className={cn("uppercase text-[9px] tracking-wider", config.className)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{invoice.clientName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </motion.div>
            {invoice.status === "draft" && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      >
                        <Zap className="w-4 h-4" />
                      </motion.div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to Client
                    </>
                  )}
                </Button>
              </motion.div>
            )}
            {invoice.status === "sent" && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  className="gap-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Paid
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Invoice Document */}
      <motion.div
        className="max-w-4xl mx-auto mt-24"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 80 }}
      >
        {/* The Dark Mode Invoice "Paper" */}
        <div className="relative glass-card-intense border border-white/[0.08] rounded-2xl overflow-hidden">
          {/* Status Stamp */}
          <motion.div
            className={cn(
              "absolute top-8 right-8 px-6 py-2 rounded-lg border-2 rotate-12 text-xl font-bold tracking-widest opacity-30",
              invoice.status === "paid" && "border-primary text-primary",
              invoice.status === "overdue" && "border-red-500 text-red-500",
              invoice.status === "sent" && "border-blue-400 text-blue-400",
              invoice.status === "draft" && "border-muted-foreground text-muted-foreground",
            )}
            initial={{ scale: 0, rotate: 45 }}
            animate={{ scale: 1, rotate: 12 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          >
            {invoice.status.toUpperCase()}
          </motion.div>

          {/* Header */}
          <div className="p-8 md:p-12 border-b border-white/[0.06]">
            <div className="flex justify-between items-start">
              {/* From - Qoda */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-2xl font-bold tracking-tight">QODA</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Qoda Financial Systems Inc.</p>
                  <p>548 Market St, Suite 12345</p>
                  <p>San Francisco, CA 94104</p>
                  <p className="text-primary">billing@qoda.finance</p>
                </div>
              </motion.div>

              {/* To - Client */}
              <motion.div
                className="text-right"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Bill To</p>
                <div className="flex items-center justify-end gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{invoice.clientName}</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center justify-end gap-2">
                    <Mail className="w-3 h-3" />
                    <span>billing@{invoice.clientName.toLowerCase().replace(/\s+/g, "")}.com</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Invoice Meta */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 md:px-12 border-b border-white/[0.06] bg-white/[0.01]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Invoice Number</p>
              <p className="font-mono text-sm">{invoice.id.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Issue Date</p>
              <p className="text-sm">{formatDate(invoice.createdAt)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Due Date</p>
              <p className={cn("text-sm", invoice.status === "overdue" && "text-red-500 glow-text-red")}>
                {formatDate(dueDate.toISOString())}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Billing Period</p>
              <p className="text-sm">
                {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
              </p>
            </div>
          </motion.div>

          {/* Line Items - The Core */}
          <div className="p-8 md:p-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Usage Breakdown
              </h3>

              {/* Grouped by Agent */}
              <div className="space-y-8">
                <AnimatePresence>
                  {lineItems.map((agentGroup, agentIndex) => (
                    <motion.div
                      key={agentGroup.agentId}
                      className="glass-card p-6 rounded-xl"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + agentIndex * 0.1 }}
                    >
                      {/* Agent Header */}
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.06]">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{agentGroup.agentName}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Agent ID: {agentGroup.agentId.toUpperCase()}
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-xs text-muted-foreground">Subtotal</p>
                          <p className="font-mono font-semibold text-primary glow-text-green">
                            {formatCurrency(agentGroup.items.reduce((acc, item) => acc + item.total, 0))}
                          </p>
                        </div>
                      </div>

                      {/* Line Items Table */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_100px_100px_120px] gap-4 text-[10px] uppercase tracking-wider text-muted-foreground pb-2">
                          <div>Service</div>
                          <div className="text-right">Usage</div>
                          <div className="text-right">Unit Cost</div>
                          <div className="text-right">Amount</div>
                        </div>
                        {agentGroup.items.map((item, itemIndex) => (
                          <motion.div
                            key={itemIndex}
                            className="grid grid-cols-[1fr_100px_100px_120px] gap-4 py-2 border-b border-white/[0.03] last:border-0"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + agentIndex * 0.1 + itemIndex * 0.05 }}
                          >
                            <div className="text-sm">{item.service}</div>
                            <div className="text-sm text-right font-mono text-muted-foreground">
                              {(
                                item.calls ||
                                item.queries ||
                                item.messages ||
                                item.images ||
                                item.searches ||
                                item.emails ||
                                0
                              ).toLocaleString()}
                            </div>
                            <div className="text-sm text-right font-mono text-muted-foreground">
                              ${item.unitCost.toFixed(5)}
                            </div>
                            <div className="text-sm text-right font-mono font-medium">{formatCurrency(item.total)}</div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Totals Section */}
            <motion.div
              className="mt-8 pt-8 border-t border-white/[0.06]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (API Costs)</span>
                    <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-primary">Service Fee ({markupPercentage}%)</span>
                    <span className="font-mono text-primary">+{formatCurrency(invoice.markupAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t border-white/[0.08]">
                    <span className="text-lg font-semibold">Total Due</span>
                    <motion.span
                      className={cn(
                        "text-3xl font-bold font-mono",
                        invoice.status === "paid" && "text-primary glow-text-green",
                        invoice.status === "overdue" && "text-red-500 glow-text-red",
                      )}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.1, type: "spring", stiffness: 200 }}
                    >
                      {formatCurrency(invoice.total)}
                    </motion.span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            className="px-8 md:px-12 py-6 border-t border-white/[0.06] bg-white/[0.01]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Payment Terms: Net 14</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span>Currency: USD</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.span
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                />
                <span>Powered by Qoda Financial Infrastructure</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Timeline / Audit Log */}
        <motion.div
          className="mt-8 glass-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
        >
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">Activity Log</h3>
          <div className="space-y-4">
            {invoice.paidAt && (
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <p className="text-sm">Payment received</p>
                  <p className="text-xs text-muted-foreground">{formatLongDate(invoice.paidAt)}</p>
                </div>
              </div>
            )}
            {invoice.sentAt && (
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-400/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Send className="w-3 h-3 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm">Invoice sent to client</p>
                  <p className="text-xs text-muted-foreground">{formatLongDate(invoice.sentAt)}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-3 h-3 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm">Invoice created</p>
                <p className="text-xs text-muted-foreground">{formatLongDate(invoice.createdAt)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
