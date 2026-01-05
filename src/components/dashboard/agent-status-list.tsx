"use client"

import { motion } from "framer-motion"
import { mockAgents } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Bot, Pause, XCircle } from "lucide-react"

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
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
}

const itemVariants = {
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

export function AgentStatusList() {
    const activeAgents = mockAgents.filter((a) => a.status === "active")

    return (
        <motion.div
            className="glass-card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
        >
            <div className="flex items-center justify-between mb-6">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Active Agents
                </span>
                <motion.span
                    className="text-xs text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {activeAgents.length} online
                </motion.span>
            </div>

            <motion.div
                className="space-y-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {mockAgents.slice(0, 4).map((agent, index) => {
                    const dailyPercent = (agent.currentDailySpend / agent.dailyLimit) * 100

                    const statusConfig = {
                        active: { icon: Bot, color: "text-success" },
                        paused: { icon: Pause, color: "text-warning" },
                        cancelled: { icon: XCircle, color: "text-destructive" },
                    }

                    const config = statusConfig[agent.status]
                    const StatusIcon = config.icon

                    return (
                        <motion.div
                            key={agent.id}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02, x: 4 }}
                            transition={{ type: "spring", stiffness: 400 }}
                            className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] cursor-pointer"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <motion.div
                                        animate={
                                            agent.status === "active" ? { scale: [1, 1.2, 1] } : {}
                                        }
                                        transition={{
                                            duration: 2,
                                            repeat: Number.POSITIVE_INFINITY,
                                            delay: index * 0.3,
                                        }}
                                    >
                                        <StatusIcon className={cn("h-3.5 w-3.5", config.color)} />
                                    </motion.div>
                                    <span className="text-sm truncate max-w-[140px]">
                                        {agent.name}
                                    </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                    •••• {agent.cardLastFour}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted-foreground uppercase tracking-wider">
                                        Daily Limit
                                    </span>
                                    <span className="tabular-nums">
                                        {formatCurrency(agent.currentDailySpend)} /{" "}
                                        {formatCurrency(agent.dailyLimit)}
                                    </span>
                                </div>
                                <div className="relative h-1 rounded-full bg-white/5 overflow-hidden">
                                    <motion.div
                                        className={cn(
                                            "absolute inset-y-0 left-0 rounded-full",
                                            dailyPercent > 95
                                                ? "bg-destructive"
                                                : dailyPercent > 80
                                                    ? "bg-warning"
                                                    : "bg-primary"
                                        )}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${dailyPercent}%` }}
                                        transition={{
                                            delay: 0.5 + index * 0.1,
                                            duration: 1,
                                            ease: "easeOut",
                                        }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </motion.div>
        </motion.div>
    )
}
