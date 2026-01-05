"use client";

import { motion } from "framer-motion";
import { hourlySpend } from "@/lib/mock-data";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function SpendChart() {
  return (
    <motion.div
      className="glass-card p-6 glow-green relative overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 80, damping: 20 }}
    >
      {/* Animated gradient overlay at top */}
      <motion.div
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#00ff88]/5 to-transparent pointer-events-none"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <motion.span
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Spend Velocity
          </motion.span>
          <motion.span
            className="flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.span
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="text-[10px] text-primary uppercase tracking-wider">Live</span>
          </motion.span>
        </div>
        <motion.span
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          Last 15 hours
        </motion.span>
      </div>

      <motion.div
        className="h-[280px] w-full relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlySpend} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGradientCyberpunk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ff88" stopOpacity={0.5} />
                <stop offset="50%" stopColor="#00ff88" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
              {/* Glow filter */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <XAxis
              dataKey="hour"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
              tickFormatter={(value) => value.split(":")[0]}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
              tickFormatter={(value) => `$${value}`}
              width={45}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#00ff88"
              strokeWidth={2}
              fill="url(#spendGradientCyberpunk)"
              filter="url(#glow)"
              className="glow-line-green"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}

