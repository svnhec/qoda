'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/types/currency';

interface VelocitySliderProps {
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: [number, number];
    onValueChange?: (value: [number, number]) => void;
    className?: string;
}

export function VelocitySlider({
    min = 0,
    max = 5000,
    step = 50,
    defaultValue = [1000, 2500],
    onValueChange,
    className
}: VelocitySliderProps) {
    const [value, setValue] = React.useState<[number, number]>(defaultValue);
    const [dragging, setDragging] = React.useState(false);

    const handleValueChange = (newValue: number[]) => {
        const val = newValue as [number, number];
        setValue(val);
        onValueChange?.(val);
    };

    // Calculate percentages for the colored track segments
    const softPercent = ((value[0] - min) / (max - min)) * 100;
    const hardPercent = ((value[1] - min) / (max - min)) * 100;

    return (
        <div className={cn("w-full space-y-6", className)}>

            {/* Slider Interface */}
            <SliderPrimitive.Root
                className="relative flex w-full touch-none select-none items-center"
                min={min}
                max={max}
                step={step}
                value={value}
                onValueChange={handleValueChange}
                onPointerDown={() => setDragging(true)}
                onPointerUp={() => setDragging(false)}
            >
                {/* Track Background (Base Grey) */}
                <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/10">

                    {/* Safe Zone (Green) - 0 to Soft Limit */}
                    <div
                        className="absolute h-full bg-emerald-500/50"
                        style={{ width: `${softPercent}%` }}
                    />

                    {/* Warning Zone (Amber) - Soft to Hard Limit */}
                    <div
                        className="absolute h-full bg-amber-500/50"
                        style={{ left: `${softPercent}%`, width: `${hardPercent - softPercent}%` }}
                    />

                    {/* Danger Zone (Red) - Hard Limit to Max */}
                    <div
                        className="absolute h-full bg-rose-500/50"
                        style={{ left: `${hardPercent}%`, right: 0 }}
                    />

                </SliderPrimitive.Track>

                {/* Handles */}
                {[0, 1].map((index) => (
                    <SliderPrimitive.Thumb
                        key={index}
                        asChild
                    >
                        <motion.div
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 1.3 }}
                            className={cn(
                                "block h-5 w-5 rounded-full border-2 bg-[#050505] shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 cursor-grab active:cursor-grabbing",
                                index === 0 ? "border-amber-500" : "border-rose-500"
                            )}
                        >
                            {dragging && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: -25 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white/10 px-2 py-1 text-xs font-mono font-bold text-white backdrop-blur-md"
                                >
                                    {formatCurrency(BigInt(value[index] ?? 0))}
                                </motion.div>
                            )}
                        </motion.div>
                    </SliderPrimitive.Thumb>
                ))}
            </SliderPrimitive.Root>

            {/* Live Preview Text */}
            <div className="flex items-center justify-between text-xs font-mono bg-white/5 p-3 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-white/60">Warn at: <span className="text-white font-bold">{formatCurrency(BigInt(value[0]))}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span className="text-white/60">Block at: <span className="text-white font-bold">{formatCurrency(BigInt(value[1]))}</span></span>
                </div>
            </div>
        </div>
    );
}
