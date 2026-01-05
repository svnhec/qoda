"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatCurrency, parseCents } from "@/lib/types/currency"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, Clock, Receipt } from "lucide-react"
import { type Transaction } from "@/hooks/use-dashboard-data"

interface LiveTransactionFeedProps {
    transactions?: Transaction[];
}

function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    })
}


function TransactionRow({
    transaction,
}: {
    transaction: Transaction
}) {
    const statusConfig = {
        approved: { icon: CheckCircle2, color: "text-success" },
        declined: { icon: XCircle, color: "text-destructive glow-text-red" },
        pending: { icon: Clock, color: "text-warning" },
    }

    const config = statusConfig[transaction.status] || statusConfig.pending
    const StatusIcon = config.icon
    const amountCents = parseCents(transaction.amount_cents)

    return (
        <motion.div
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            transition={{ type: "spring" as const, stiffness: 200, damping: 20 }}
            className="flex items-center gap-4 py-3 border-b border-white/[0.04] transition-colors"
        >
            <motion.div
                animate={{ scale: 1 }}
                transition={{ type: "spring" as const, stiffness: 400, delay: 0.1 }}
            >
                <StatusIcon className={cn("h-4 w-4 shrink-0", config.color)} />
            </motion.div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm truncate">{transaction.merchant_name || "Unknown Merchant"}</span>
                    {transaction.agents && (
                        <motion.span
                            className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-white/5"
                            initial={{ opacity: 1, scale: 1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 }}
                        >
                            {transaction.agents.name}
                        </motion.span>
                    )}
                </div>
            </div>

            <motion.div
                className="text-right shrink-0"
                initial={{ opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
            >
                <p
                    className={cn(
                        "text-sm tabular-nums",
                        transaction.status === "declined"
                            ? "text-red-500 glow-text-red"
                            : "text-foreground"
                    )}
                >
                    {formatCurrency(amountCents)}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                    {formatTime(transaction.created_at)}
                </p>
            </motion.div>
        </motion.div>
    )
}

export function LiveTransactionFeed({ transactions = [] }: LiveTransactionFeedProps) {
    // Empty state
    if (transactions.length === 0) {
        return (
            <motion.div
                className="glass-card p-6 h-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring" as const, stiffness: 100, damping: 15 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Transaction Feed
                    </span>
                    <div className="flex items-center gap-1.5">
                        <motion.span
                            className="w-2 h-2 rounded-full bg-muted-foreground"
                        />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Waiting
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                    <Receipt className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground">No transactions yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                        Transactions will appear here in real-time
                    </p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            className="glass-card p-6 h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring" as const, stiffness: 100, damping: 15 }}
        >
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Transaction Feed
                </span>
                <div className="flex items-center gap-1.5">
                    <motion.span
                        className="w-2 h-2 rounded-full bg-primary"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    />
                    <span className="text-[10px] text-primary uppercase tracking-wider">
                        Live
                    </span>
                </div>
            </div>
            <ScrollArea className="h-[340px] -mx-6 px-6">
                <AnimatePresence initial={false}>
                    {transactions.map((tx) => (
                        <TransactionRow
                            key={tx.id}
                            transaction={tx}
                        />
                    ))}
                </AnimatePresence>
            </ScrollArea>
        </motion.div>
    )
}
