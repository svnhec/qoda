"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { mockTransactions, type Transaction } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, Clock } from "lucide-react"

function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    })
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount)
}

function TransactionRow({
    transaction,
    isNew,
}: {
    transaction: Transaction
    isNew?: boolean
}) {
    const statusConfig = {
        approved: { icon: CheckCircle2, color: "text-success" },
        declined: { icon: XCircle, color: "text-destructive glow-text-red" },
        pending: { icon: Clock, color: "text-warning" },
    }

    const config = statusConfig[transaction.status]
    const StatusIcon = config.icon

    return (
        <motion.div
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={cn(
                "flex items-center gap-4 py-3 border-b border-white/[0.04] transition-colors",
                isNew && "bg-primary/5 border-primary/20"
            )}
        >
            <motion.div
                initial={isNew ? { scale: 0 } : { scale: 1 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
            >
                <StatusIcon className={cn("h-4 w-4 shrink-0", config.color)} />
            </motion.div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm truncate">{transaction.merchantName}</span>
                    <motion.span
                        className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-white/5"
                        initial={
                            isNew ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }
                        }
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                    >
                        {transaction.agentName}
                    </motion.span>
                </div>
            </div>

            <motion.div
                className="text-right shrink-0"
                initial={isNew ? { opacity: 0, x: 10 } : { opacity: 1, x: 0 }}
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
                    {formatCurrency(transaction.amount)}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                    {formatTime(transaction.createdAt)}
                </p>
            </motion.div>
        </motion.div>
    )
}

export function LiveTransactionFeed() {
    const [transactions, setTransactions] = useState(mockTransactions)
    const [newTxId, setNewTxId] = useState<string | null>(null)

    useEffect(() => {
        const merchants = [
            "OpenAI",
            "Anthropic",
            "AWS",
            "Google Cloud",
            "Azure",
            "Pinecone",
            "Vercel",
        ]
        const agents = [
            "Lead Gen Bot v2",
            "Support Agent Alpha",
            "Content Creator Pro",
            "Data Processor X1",
        ]
        const clients = [
            "TechCorp Industries",
            "Nexus Ventures",
            "Quantum Dynamics",
            "Stellar Systems",
        ]

        const interval = setInterval(() => {
            const newTx: Transaction = {
                id: `tx_${Date.now()}`,
                agentId: "ag_1",
                agentName: agents[Math.floor(Math.random() * agents.length)],
                clientId: "cl_1",
                clientName: clients[Math.floor(Math.random() * clients.length)],
                amount: Math.round((Math.random() * 100 + 5) * 100) / 100,
                currency: "USD",
                merchantName: merchants[Math.floor(Math.random() * merchants.length)],
                merchantMcc: "7372",
                status: Math.random() > 0.1 ? "approved" : "declined",
                createdAt: new Date().toISOString(),
            }

            setNewTxId(newTx.id)
            setTransactions((prev) => [newTx, ...prev.slice(0, 19)])

            setTimeout(() => setNewTxId(null), 2000)
        }, 4000)

        return () => clearInterval(interval)
    }, [])

    return (
        <motion.div
            className="glass-card p-6 h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
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
                            isNew={tx.id === newTxId}
                        />
                    ))}
                </AnimatePresence>
            </ScrollArea>
        </motion.div>
    )
}
