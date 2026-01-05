"use client";

import { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string;
    trend?: {
        value: string;
        positive: boolean;
    };
    icon?: ReactNode;
    color?: "cyan" | "purple" | "emerald" | "amber" | "crimson";
    loading?: boolean;
    sparkline?: number[]; // Array of values for mini chart
}

export function MetricCard({ title, value, trend, icon, color = "cyan", loading, sparkline }: MetricCardProps) {
    const colorStyles = {
        cyan: "from-cyan-500/10 to-transparent border-cyan-500/20 text-cyan-400",
        purple: "from-purple-500/10 to-transparent border-purple-500/20 text-purple-400",
        emerald: "from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400",
        amber: "from-amber-500/10 to-transparent border-amber-500/20 text-amber-400",
        crimson: "from-red-500/10 to-transparent border-red-500/20 text-red-400",
    };

    return (
        <div className={`relative overflow-hidden rounded-xl border ${colorStyles[color].split(" ")[2]} bg-[#0a0a0a] p-5 transition-all hover:bg-[#0f0f0f]`}>
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colorStyles[color].split(" ")[0]} ${colorStyles[color].split(" ")[1]} opacity-50`} />

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-white/50 uppercase tracking-wider">{title}</span>
                    {icon && <div className={`p-2 rounded-lg bg-white/5 ${colorStyles[color].split(" ")[3]}`}>{icon}</div>}
                </div>

                <div className="space-y-1">
                    {loading ? (
                        <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
                    ) : (
                        <div className="text-3xl font-bold text-white tracking-tight flex items-baseline gap-2">
                            {value}
                        </div>
                    )}

                    {trend && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${trend.positive ? "text-emerald-400" : "text-red-400"}`}>
                            {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trend.value}
                            <span className="text-white/30 ml-1">vs last hour</span>
                        </div>
                    )}
                </div>

                {/* Mini Sparkline Chart */}
                {sparkline && sparkline.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 h-8">
                        <Sparkline data={sparkline} color={color} />
                    </div>
                )}

                {/* Decorative Gradient Line (fallback) */}
                {!sparkline && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20" style={{ color: `var(--${color}-400)` }} />
                )}
            </div>
        </div>
    );
}

// Sparkline Mini Chart Component
function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    const colorMap = {
        cyan: '#06b6d4',
        purple: '#8b5cf6',
        emerald: '#10b981',
        amber: '#f59e0b',
        crimson: '#ef4444'
    };

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-60">
            <polyline
                fill="none"
                stroke={colorMap[color as keyof typeof colorMap] || colorMap.cyan}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="sparkline-animate"
            />
        </svg>
    );
}

export function VelocityCard({ velocity, trend }: { velocity: number; trend?: number[] }) {
    return (
        <MetricCard
            title="Velocity"
            value={`$${velocity.toFixed(2)}/min`}
            trend={{ value: "+12.5%", positive: true }}
            icon={<Activity className="w-5 h-5" />}
            color="cyan"
            sparkline={trend}
        />
    );
}
