"use client";

import { useEffect, useState } from "react";
import { useMotionValue, useTransform, animate } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

export function AnimatedCounter({ value, duration = 2 }: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => `$${latest.toFixed(2)}`);
  const [displayValue, setDisplayValue] = useState("$0.00");

  useEffect(() => {
    const controls = animate(count, value, { duration });
    const unsubscribe = rounded.on("change", (v) => setDisplayValue(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, duration, count, rounded]);

  return <span>{displayValue}</span>;
}

