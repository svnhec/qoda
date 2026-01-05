"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Bot, Pause, XCircle, AlertTriangle } from "lucide-react";
import { type Agent } from "@/hooks/use-dashboard-data";
import { parseCents, formatCurrency } from "@/lib/types/currency";

interface AgentStatusListProps {
  agents?: Agent[];
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
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export function AgentStatusList({ agents = [] }: AgentStatusListProps) {
  const activeAgents = agents.filter((a) => a.is_active && a.status === "green");

  // Empty state
  if (agents.length === 0) {
    return (
      <motion.div
        className="glass-card p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring" as const, stiffness: 100, damping: 15 }}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active Agents</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Bot className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">No agents configured</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Create an agent to get started</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring" as const, stiffness: 100, damping: 15 }}
    >
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active Agents</span>
        <motion.span
          className="text-xs text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {activeAgents.length} online
        </motion.span>
      </div>

      <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
        {agents.slice(0, 4).map((agent) => {
          const currentSpend = parseCents(agent.current_spend_cents);
          const budget = parseCents(agent.monthly_budget_cents);
          const dailyPercent = budget > 0n ? Number((currentSpend * 100n) / budget) : 0;

          const statusConfig = {
            green: { icon: Bot, color: "text-success", label: "Active" },
            yellow: { icon: AlertTriangle, color: "text-warning", label: "Warning" },
            red: { icon: XCircle, color: "text-destructive", label: "Stopped" },
          };

          const config = statusConfig[agent.status] || statusConfig.green;
          const StatusIcon = config.icon;

          // Inactive override
          if (!agent.is_active) {
            return (
              <motion.div
                key={agent.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02, x: 4 }}
                transition={{ type: "spring" as const, stiffness: 400 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] cursor-pointer opacity-50"
              >
                <Pause className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{agent.name}</p>
                  <p className="text-[10px] text-muted-foreground">Paused</p>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={agent.id}
              variants={itemVariants}
              whileHover={{ scale: 1.02, x: 4 }}
              transition={{ type: "spring" as const, stiffness: 400 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] cursor-pointer group"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              >
                <StatusIcon className={cn("h-4 w-4", config.color)} />
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm truncate group-hover:text-primary transition-colors">
                    {agent.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        dailyPercent > 90 ? "bg-destructive" : dailyPercent > 70 ? "bg-warning" : "bg-primary"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(dailyPercent, 100)}%` }}
                      transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                    {formatCurrency(currentSpend)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
