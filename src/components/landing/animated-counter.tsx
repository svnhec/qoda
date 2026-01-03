"use client";

/**
 * Animated Counter
 * =============================================================================
 * Counts up to a target value with animation.
 * =============================================================================
 */

import { useEffect, useRef, useState } from "react";

interface Props {
    value: number;
    prefix?: string;
    suffix?: string;
    duration?: number;
    decimals?: number;
}

export default function AnimatedCounter({
    value,
    prefix = "",
    suffix = "",
    duration = 2000,
    decimals = 0,
}: Props) {
    const [displayValue, setDisplayValue] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const animationRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const animate = (timestamp: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = value * easeOut;

            setDisplayValue(current);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration]);

    const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(displayValue);

    return (
        <span className="tabular-nums">
            {prefix}
            {formatted}
            {suffix}
        </span>
    );
}
