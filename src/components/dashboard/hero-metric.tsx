"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroMetricProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function HeroMetric({ value, label, prefix = "$", suffix, trend, className }: HeroMetricProps) {
  const [displayValue, setDisplayValue] = useState(value);

  // Animate value changes
  useEffect(() => {
    const start = displayValue;
    const end = value;
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (end - start) * eased);

      if (progress < 1) requestAnimationFrame(animate);
    };

    animate();
  }, [value]);

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(displayValue));

  return (
    <motion.div
      className={cn("text-center", className)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring" as const, stiffness: 80, damping: 20 }}
    >
      <motion.p
        className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {label}
      </motion.p>
      <motion.div className="relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <motion.div
          className="absolute inset-0 blur-3xl opacity-20 bg-primary rounded-full"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.span
          className={cn(
            "text-7xl sm:text-8xl md:text-9xl font-bold tracking-tighter relative z-10",
            "text-primary glow-text-green",
          )}
          key={formatted}
        >
          {prefix}
          {formatted}
          {suffix}
        </motion.span>
      </motion.div>
      {trend && (
        <motion.p
          className={cn("mt-4 text-sm", trend.isPositive ? "text-destructive" : "text-success")}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <motion.span
            animate={{ y: trend.isPositive ? [-2, 2, -2] : [2, -2, 2] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            className="inline-block"
          >
            {trend.isPositive ? "↑" : "↓"}
          </motion.span>{" "}
          {Math.abs(trend.value)}% from yesterday
        </motion.p>
      )}
    </motion.div>
  );
}



