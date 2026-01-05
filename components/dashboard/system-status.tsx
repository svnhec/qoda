"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SystemMetric {
  label: string;
  value: string;
  status: "nominal" | "warning" | "critical";
}

const systemMetrics: SystemMetric[] = [
  { label: "API Latency", value: "12ms", status: "nominal" },
  { label: "Card Network", value: "Online", status: "nominal" },
  { label: "Fraud Engine", value: "Active", status: "nominal" },
  { label: "Webhook Queue", value: "23", status: "nominal" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 15,
    },
  },
};

export function SystemStatus() {
  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">System Status</span>
        <span className="flex items-center gap-1.5">
          <motion.span
            className="w-2 h-2 rounded-full bg-success"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          />
          <span className="text-[10px] text-success uppercase tracking-wider">All Systems Nominal</span>
        </span>
      </div>

      <motion.div className="grid grid-cols-2 gap-3" variants={containerVariants} initial="hidden" animate="visible">
        {systemMetrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            variants={itemVariants}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.04)" }}
            transition={{ type: "spring", stiffness: 400 }}
            className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] cursor-pointer"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{metric.label}</p>
            <motion.p
              className={cn(
                "text-sm tabular-nums",
                metric.status === "nominal" && "text-foreground",
                metric.status === "warning" && "text-warning",
                metric.status === "critical" && "text-destructive",
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              {metric.value}
            </motion.p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

