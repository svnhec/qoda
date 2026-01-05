"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type Alert } from "@/hooks/use-dashboard-data";
import { AlertTriangle, Bell, CheckCircle, ShieldAlert } from "lucide-react";

interface SystemStatusProps {
  alerts?: Alert[];
}

interface SystemMetric {
  label: string;
  value: string;
  status: "nominal" | "warning" | "critical";
}

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
      type: "spring" as const,
      stiffness: 200,
      damping: 15,
    },
  },
};

export function SystemStatus({ alerts = [] }: SystemStatusProps) {
  const unreadAlerts = alerts.filter((a) => !a.is_read);
  const criticalAlerts = alerts.filter((a) => a.severity === "critical" && !a.resolved_at);
  const warningAlerts = alerts.filter((a) => a.severity === "high" && !a.resolved_at);

  // Determine overall system status
  const overallStatus = criticalAlerts.length > 0 
    ? "critical" 
    : warningAlerts.length > 0 
      ? "warning" 
      : "nominal";

  const systemMetrics: SystemMetric[] = [
    { 
      label: "API Status", 
      value: "Online", 
      status: "nominal" 
    },
    { 
      label: "Card Network", 
      value: "Connected", 
      status: "nominal" 
    },
    { 
      label: "Alerts", 
      value: unreadAlerts.length.toString(), 
      status: unreadAlerts.length > 5 ? "warning" : unreadAlerts.length > 0 ? "nominal" : "nominal"
    },
    { 
      label: "Risk Level", 
      value: criticalAlerts.length > 0 ? "High" : warningAlerts.length > 0 ? "Medium" : "Low", 
      status: criticalAlerts.length > 0 ? "critical" : warningAlerts.length > 0 ? "warning" : "nominal"
    },
  ];

  return (
    <motion.div
      className="glass-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring" as const, stiffness: 100, damping: 15 }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">System Status</span>
        <span className="flex items-center gap-1.5">
          <motion.span
            className={cn(
              "w-2 h-2 rounded-full",
              overallStatus === "nominal" && "bg-success",
              overallStatus === "warning" && "bg-warning",
              overallStatus === "critical" && "bg-destructive"
            )}
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          />
          <span className={cn(
            "text-[10px] uppercase tracking-wider",
            overallStatus === "nominal" && "text-success",
            overallStatus === "warning" && "text-warning",
            overallStatus === "critical" && "text-destructive"
          )}>
            {overallStatus === "nominal" ? "All Systems Nominal" : 
             overallStatus === "warning" ? "Attention Required" : 
             "Critical Alerts"}
          </span>
        </span>
      </div>

      <motion.div className="grid grid-cols-2 gap-3" variants={containerVariants} initial="hidden" animate="visible">
        {systemMetrics.map((metric) => (
          <motion.div
            key={metric.label}
            variants={itemVariants}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.04)" }}
            transition={{ type: "spring" as const, stiffness: 400 }}
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
              transition={{ delay: 0.2 }}
            >
              {metric.value}
            </motion.p>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Alerts */}
      {unreadAlerts.length > 0 && (
        <motion.div 
          className="mt-4 pt-4 border-t border-white/[0.04]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Recent Alerts</p>
          <div className="space-y-2">
            {unreadAlerts.slice(0, 3).map((alert) => (
              <motion.div
                key={alert.id}
                className="flex items-start gap-2 p-2 rounded bg-white/[0.02]"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {alert.severity === "critical" ? (
                  <ShieldAlert className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                ) : alert.severity === "high" ? (
                  <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                ) : (
                  <Bell className="w-3 h-3 text-info shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{alert.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{alert.message}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* No Alerts State */}
      {unreadAlerts.length === 0 && (
        <motion.div 
          className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-center py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">No active alerts</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
