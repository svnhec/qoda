"use client";

/**
 * TRANSACTION FEED - Live Transaction Stream
 * =============================================================================
 * Real-time list of transactions with status indicators
 * Uses virtualization for large lists
 * =============================================================================
 */

import { useDashboardStore, Transaction } from "@/store/dashboard-store";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Zap, AlertCircle, CheckCircle, Clock } from "lucide-react";

// Mock transaction generator for demo
const merchants = [
    "OpenAI API",
    "Anthropic",
    "AWS",
    "Google Cloud",
    "Pinecone",
    "Vercel",
    "Cloudflare",
    "Stripe",
    "MongoDB Atlas",
    "Redis Cloud",
];

const agents = [
    "Lead Gen Bot",
    "Support Agent",
    "Analytics Bot",
    "Content Writer",
    "Data Processor",
];

const categories = ["API", "Cloud", "SaaS", "Database", "Infrastructure"];

function generateMockTransaction(): Transaction {
    const statuses: ("approved" | "declined" | "pending")[] = ["approved", "approved", "approved", "approved", "declined"];
    return {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        agentName: agents[Math.floor(Math.random() * agents.length)] ?? "Unknown Agent",
        amount: Math.round(Math.random() * 100 * 100) / 100,
        merchant: merchants[Math.floor(Math.random() * merchants.length)] ?? "Unknown Merchant",
        status: statuses[Math.floor(Math.random() * statuses.length)] ?? "pending",
        timestamp: new Date().toISOString(),
        category: categories[Math.floor(Math.random() * categories.length)] ?? "Other",
    };
}

export function TransactionFeed() {
    const transactions = useDashboardStore((state) => state.transactions);
    const addTransaction = useDashboardStore((state) => state.addTransaction);
    const [isLive, setIsLive] = useState(true);

    // Simulate live transactions for demo
    useEffect(() => {
        if (!isLive) return;

        const interval = setInterval(() => {
            addTransaction(generateMockTransaction());
        }, 3000 + Math.random() * 4000);

        // Add initial transactions if empty
        if (transactions.length === 0) {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    addTransaction(generateMockTransaction());
                }, i * 200);
            }
        }

        return () => clearInterval(interval);
    }, [isLive, addTransaction, transactions.length]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "approved":
                return <CheckCircle className="w-3.5 h-3.5 text-accent" />;
            case "declined":
                return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
            default:
                return <Clock className="w-3.5 h-3.5 text-warning" />;
        }
    };

    const getTimeAgo = (timestamp: string) => {
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">Live Feed</span>
                    <span className="text-xs text-muted-foreground">({transactions.length})</span>
                </div>
                <button
                    onClick={() => setIsLive(!isLive)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${isLive
                        ? "bg-accent/10 text-accent"
                        : "bg-secondary text-muted-foreground"
                        }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-accent animate-pulse" : "bg-muted-foreground"}`} />
                    {isLive ? "LIVE" : "PAUSED"}
                </button>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence initial={false}>
                    {transactions.slice(0, 50).map((tx) => (
                        <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-b border-border last:border-b-0"
                        >
                            <div className="p-3 hover:bg-secondary/30 transition-colors cursor-default group">
                                <div className="flex items-center justify-between gap-3">
                                    {/* Left: Status + Info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex-shrink-0">
                                            {getStatusIcon(tx.status)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate">
                                                {tx.merchant}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {tx.agentName} • {getTimeAgo(tx.timestamp)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Amount */}
                                    <div className="text-right flex-shrink-0">
                                        <div className={`text-sm font-mono font-medium ${tx.status === "declined"
                                            ? "text-destructive"
                                            : "text-foreground"
                                            }`}>
                                            {tx.status === "declined" ? (
                                                "DECLINED"
                                            ) : (
                                                `$${tx.amount.toFixed(2)}`
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                            {tx.category}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {transactions.length === 0 && (
                    <div className="p-8 text-center">
                        <div className="text-muted-foreground text-sm">
                            Waiting for transactions...
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border">
                <button className="w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors uppercase tracking-wider">
                    View All Transactions
                </button>
            </div>
        </div>
    );
}
