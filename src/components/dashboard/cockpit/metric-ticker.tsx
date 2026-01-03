'use client';

import { motion } from 'framer-motion';

interface MetricTickerProps {
    value: number;
    prefix?: string;
    label: string;
}

const Digit = ({ value }: { value: string }) => {
    return (
        <div className="relative h-8 w-5 overflow-hidden font-mono text-2xl font-bold tabular-nums text-white">
            <motion.div
                initial={{ y: 0 }}
                animate={{ y: -parseInt(value) * 32 }} // 32px is height of digit
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute left-0 top-0 flex flex-col"
            >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <span key={i} className="h-8 flex items-center justify-center">
                        {i}
                    </span>
                ))}
            </motion.div>
        </div>
    );
};

export function MetricTicker({ value, prefix = "$", label }: MetricTickerProps) {
    // Format to string with 2 decimal places
    const formatted = value.toFixed(2);
    const [intPart, decPart] = formatted.split(".");

    // Split integer part into digits (and pad if needed, but here variable width is okay)
    const digits = (intPart || "0").split("");
    const decimals = (decPart || "00").split("");

    return (
        <div className="flex flex-col">
            <span className="text-xs font-mono uppercase text-white/40 mb-1">{label}</span>
            <div className="flex items-baseline gap-0.5">
                <span className="text-lime-500 font-bold text-xl mr-1">{prefix}</span>

                <div className="flex">
                    {digits.map((d, i) => (
                        <Digit key={`${i}-${digits.length}`} value={d} />
                    ))}
                </div>

                <span className="text-white/40 font-bold mx-1">.</span>

                <div className="flex text-white/60">
                    {decimals.map((d, i) => (
                        <Digit key={`dec-${i}`} value={d} />
                    ))}
                </div>
            </div>
        </div>
    );
}
