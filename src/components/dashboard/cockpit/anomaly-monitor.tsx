'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Activity, CheckCircle2, XCircle } from 'lucide-react';

const ANOMALIES = [
    { id: 1, text: "Spike in OpenAI API calls", time: "2m ago", severity: "high" },
    { id: 2, text: "Unusual latency in Region-EU", time: "15m ago", severity: "medium" },
    { id: 3, text: "New agent deployed", time: "1h ago", severity: "low" },
];

export function AnomalyMonitor() {
    const [score] = useState(74); // Mock Risk Score (High)

    // Determine color based on score
    const getColor = (s: number) => {
        if (s <= 30) return { text: 'text-emerald-500', bg: 'text-emerald-500/20', shadow: 'shadow-emerald-500/20' };
        if (s <= 70) return { text: 'text-amber-500', bg: 'text-amber-500/20', shadow: 'shadow-amber-500/20' };
        return { text: 'text-rose-500', bg: 'text-rose-500/20', shadow: 'shadow-rose-500/20' };
    };

    const theme = getColor(score);
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="h-full flex flex-col bg-[#050505] rounded-xl border border-white/5 overflow-hidden">

            {/* Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60 flex items-center gap-2">
                    <Activity size={14} className="text-white/40" />
                    Anomaly Monitor
                </h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                    <div className={`w-1.5 h-1.5 rounded-full ${theme.text.replace('text-', 'bg-')} animate-pulse`} />
                    <span className="text-[10px] font-mono text-white/60">LIVE</span>
                </div>
            </div>

            {/* Content Split: Gauge vs List */}
            <div className="flex-1 p-4 flex flex-col items-center justify-center gap-6 relative">

                {/* 1. Circular Gauge */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Glow Effect */}
                    <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${theme.text.replace('text-', 'bg-')}`} />

                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background Track */}
                        <circle
                            cx="50%"
                            cy="50%"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-white/5"
                        />
                        {/* Dynamic Progress */}
                        <motion.circle
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            cx="50%"
                            cy="50%"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeLinecap="round"
                            fill="transparent"
                            strokeDasharray={circumference}
                            className={`${theme.text}`}
                        />
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-4xl font-bold font-mono ${theme.text} drop-shadow-lg`}>
                            {score}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Risk Score</span>
                    </div>
                </div>

                {/* 2. Recent Anomalies List (Compact) */}
                <div className="w-full space-y-2">
                    <div className="text-xs text-white/30 font-mono uppercase mb-2 pl-1">Recent Detections</div>
                    {ANOMALIES.map((item) => (
                        <div
                            key={item.id}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5"
                        >
                            <div className="flex items-center gap-3">
                                {item.severity === 'high' && <XCircle size={14} className="text-rose-500" />}
                                {item.severity === 'medium' && <AlertTriangle size={14} className="text-amber-500" />}
                                {item.severity === 'low' && <CheckCircle2 size={14} className="text-emerald-500" />}
                                <span className="text-sm text-white/80 group-hover:text-white transition-colors truncate max-w-[120px] lg:max-w-[180px]">{item.text}</span>
                            </div>
                            <span className="text-xs font-mono text-white/30">{item.time}</span>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
