"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { mockTransactions, mockAgents } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Download,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Bot,
  CreditCard,
  Building2,
  Clock,
  Hash,
} from "lucide-react"
import { cn } from "@/lib/utils"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
    timestamp: date.toISOString(),
  }
}

// Map merchant names to their logos/icons
const merchantLogos: Record<string, string> = {
  OpenAI: "🤖",
  Anthropic: "🧠",
  AWS: "☁️",
  "Google Cloud": "🌐",
  Pinecone: "🌲",
  "Stability AI": "🎨",
  Azure: "⚡",
  Vercel: "▲",
  Replicate: "🔄",
}

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [copied, setCopied] = useState<string | null>(null)

  // Find transaction
  const foundTransaction = mockTransactions.find((t) => t.id === id) || mockTransactions[0]
  // Ensure we always have a valid transaction
  const transaction = foundTransaction!
  const agent = mockAgents.find((a) => a.id === transaction.agentId)
  const { date, time } = formatDateTime(transaction.createdAt)

  const isDeclined = transaction.status === "declined"

  // Generate mock raw JSON response
  const rawJson = {
    id: transaction.id,
    object: "issuing.authorization",
    amount: Math.round(transaction.amount * 100),
    amount_details: {
      atm_fee: null,
      cashback_amount: null,
    },
    approved: !isDeclined,
    authorization_method: "online",
    balance_transactions: [],
    card: {
      id: `card_${agent?.cardLastFour || "0000"}`,
      last4: agent?.cardLastFour || "0000",
      brand: "Visa",
      type: "virtual",
    },
    cardholder: {
      id: `ich_${transaction.clientId}`,
      name: transaction.agentName,
    },
    created: Math.floor(new Date(transaction.createdAt).getTime() / 1000),
    currency: transaction.currency.toLowerCase(),
    merchant_data: {
      category: "computer_software_stores",
      category_code: transaction.merchantMcc,
      city: "San Francisco",
      country: "US",
      name: transaction.merchantName,
      network_id: "1234567890",
      postal_code: "94103",
      state: "CA",
    },
    metadata: {
      agent_id: transaction.agentId,
      client_id: transaction.clientId,
    },
    status: transaction.status,
    ...(isDeclined && {
      request_history: [
        {
          approved: false,
          reason: "velocity_limit_exceeded",
          reason_message: transaction.declineReason,
        },
      ],
    }),
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen p-6 pb-32">
      <motion.div
        className="mx-auto max-w-4xl space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Back Button */}
        <motion.div variants={itemVariants}>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Transactions
          </Button>
        </motion.div>

        {/* Header Card */}
        <motion.div
          variants={itemVariants}
          className={cn(
            "relative overflow-hidden rounded-2xl border bg-black/40 backdrop-blur-xl p-8",
            isDeclined ? "border-red-500/30" : "border-white/10",
          )}
        >
          {/* Status stamp */}
          <div
            className={cn(
              "absolute top-6 right-6 rotate-12 border-2 px-4 py-1 font-mono text-sm font-bold tracking-wider opacity-60",
              isDeclined ? "border-red-500 text-red-500" : "border-emerald-500 text-emerald-500",
            )}
          >
            {transaction.status.toUpperCase()}
          </div>

          <div className="flex items-start gap-6">
            {/* Merchant Logo */}
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl text-4xl",
                isDeclined ? "bg-red-500/10" : "bg-white/5",
              )}
            >
              {merchantLogos[transaction.merchantName] || "💳"}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">{transaction.merchantName}</h1>
              <p className="text-sm text-muted-foreground font-mono">MCC {transaction.merchantMcc} · Software & SaaS</p>

              {/* Amount */}
              <div className="mt-4">
                <span
                  className={cn(
                    "text-5xl font-mono font-bold",
                    isDeclined ? "text-red-500 glow-text-red" : "text-emerald-400 glow-text",
                  )}
                >
                  {isDeclined ? "-" : ""}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-6 flex items-center gap-3">
            {isDeclined ? (
              <XCircle className="h-6 w-6 text-red-500" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            )}
            <Badge
              className={cn(
                "text-sm px-3 py-1",
                isDeclined
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
              )}
            >
              {isDeclined ? "DECLINED" : "APPROVED"}
            </Badge>
          </div>
        </motion.div>

        {/* Decline Reason Alert */}
        {isDeclined && transaction.declineReason && (
          <motion.div variants={itemVariants} className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-mono text-sm font-bold text-red-400 mb-1">DECLINE_CODE: velocity_limit_exceeded</h3>
                <p className="text-sm text-red-300/80">
                  {transaction.declineReason}. The transaction was blocked because the agent exceeded its configured
                  spending velocity limit.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Metadata Grid */}
        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden"
        >
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="font-mono text-sm text-muted-foreground tracking-wider">TRANSACTION_METADATA</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
            {[
              {
                icon: Clock,
                label: "TIMESTAMP",
                value: time,
                subvalue: date,
              },
              {
                icon: CreditCard,
                label: "CARD_LAST4",
                value: `•••• ${agent?.cardLastFour || "0000"}`,
                mono: true,
              },
              {
                icon: Bot,
                label: "AGENT_NAME",
                value: transaction.agentName,
              },
              {
                icon: Building2,
                label: "CLIENT",
                value: transaction.clientName,
              },
              {
                icon: Hash,
                label: "MCC_CODE",
                value: transaction.merchantMcc,
                mono: true,
              },
              {
                icon: Hash,
                label: "TX_ID",
                value: transaction.id,
                mono: true,
                copyable: true,
              },
            ].map((item, i) => (
              <div key={i} className="bg-black/40 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <item.icon className="h-4 w-4" />
                  <span className="font-mono text-xs tracking-wider">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm text-white", item.mono && "font-mono")}>{item.value}</span>
                  {item.copyable && (
                    <button
                      onClick={() => copyToClipboard(item.value, item.label)}
                      className="text-muted-foreground hover:text-white transition-colors"
                    >
                      {copied === item.label ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
                {item.subvalue && <span className="text-xs text-muted-foreground">{item.subvalue}</span>}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Raw Data Panel */}
        <motion.div variants={itemVariants} className="rounded-xl border border-white/10 bg-black/60 overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <h2 className="font-mono text-sm text-muted-foreground tracking-wider">RAW_STRIPE_RESPONSE</h2>
            </div>
            <button
              onClick={() => copyToClipboard(JSON.stringify(rawJson, null, 2), "json")}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              {copied === "json" ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy JSON
                </>
              )}
            </button>
          </div>
          <pre className="p-6 text-xs font-mono text-zinc-400 overflow-x-auto max-h-96 overflow-y-auto">
            <code>{JSON.stringify(rawJson, null, 2)}</code>
          </pre>
        </motion.div>

        {/* Actions */}
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-transparent border-white/10 hover:bg-white/5">
            <Download className="h-4 w-4" />
            Download Receipt
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent border-white/10 hover:bg-white/5">
            <ExternalLink className="h-4 w-4" />
            View in Stripe
          </Button>
          {isDeclined && (
            <Button
              variant="outline"
              className="gap-2 bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <AlertTriangle className="h-4 w-4" />
              Dispute Transaction
            </Button>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
