"use client";

/**
 * COCKPIT VIEW - Dashboard Home
 * =============================================================================
 * Real-time financial command center with:
 * - KPI Cards (Active Agents, Burn Rate, Total Spend, Risk Score)
 * - Spend Velocity Chart
 * - Live Transaction Feed
 * =============================================================================
 */

import { motion } from "framer-motion";
import {
    Bot,
    Flame,
    TrendingUp,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    RefreshCw,
} from "lucide-react";
import { useDashboardStore } from "@/store/dashboard-store";
import { MainChart } from "./main-chart";
import { TransactionFeed } from "./transaction-feed";

// Animation Config
const spring = {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
};

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: spring },
};

export default function CockpitView() {
    const stats = useDashboardStore((state) => state.stats);

    const formatCurrency = (val: number, compact = false) => {
        if (compact && val >= 1000) {
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 1,
            }).format(val);
        }
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="p-6 lg:p-8 space-y-6"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Real-time financial telemetry for your AI fleet
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Time Range Selector */}
                    <div className="flex h-9 items-center rounded-lg bg-secondary border border-border p-1">
                        {["24H", "7D", "30D"].map((range, i) => (
                            <button
                                key={range}
                                className={`px-3 h-7 rounded text-xs font-medium transition-all ${i === 0
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>

                    {/* Refresh Button */}
                    <button className="btn-ghost h-9 px-3">
                        <RefreshCw className="w-4 h-4" />
                    </button>

                    {/* Export Button */}
                    <button className="btn-secondary h-9">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </motion.div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Agents */}
                <motion.div variants={itemVariants}>
                    <KPICard
                        icon={Bot}
                        iconColor="text-accent"
                        label="Active Agents"
                        value={stats.activeAgents.toString()}
                        suffix="/20"
                        trend={{ value: 2, positive: true }}
                        progress={stats.activeAgents / 20}
                        progressColor="bg-accent"
                    />
                </motion.div>

                {/* Daily Burn Rate */}
                <motion.div variants={itemVariants}>
                    <KPICard
                        icon={Flame}
                        iconColor="text-warning"
                        label="24h Burn Rate"
                        value={formatCurrency(stats.dailyVolume)}
                        trend={{ value: 5.2, positive: false }}
                    />
                </motion.div>

                {/* Total Spend */}
                <motion.div variants={itemVariants}>
                    <KPICard
                        icon={TrendingUp}
                        iconColor="text-primary"
                        label="Total Spend"
                        value={formatCurrency(stats.totalSpend, true)}
                        trend={{ value: 12, positive: true }}
                    />
                </motion.div>

                {/* Risk Score */}
                <motion.div variants={itemVariants}>
                    <KPICard
                        icon={AlertTriangle}
                        iconColor={stats.riskScore < 30 ? "text-accent" : stats.riskScore < 60 ? "text-warning" : "text-destructive"}
                        label="Risk Score"
                        value={stats.riskScore.toString()}
                        suffix="/100"
                        badge={stats.riskScore < 30 ? "LOW" : stats.riskScore < 60 ? "MEDIUM" : "HIGH"}
                        badgeColor={stats.riskScore < 30 ? "text-accent bg-accent/10" : stats.riskScore < 60 ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10"}
                    />
                </motion.div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
                {/* Spend Velocity Chart */}
                <motion.div
                    variants={itemVariants}
                    className="lg:col-span-2 card p-0 overflow-hidden"
                >
                    <MainChart />
                </motion.div>

                {/* Transaction Feed */}
                <motion.div
                    variants={itemVariants}
                    className="card p-0 overflow-hidden flex flex-col"
                >
                    <TransactionFeed />
                </motion.div>
            </div>
        </motion.div>
    );
}

// KPI Card Component
interface KPICardProps {
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    label: string;
    value: string;
    suffix?: string;
    trend?: { value: number; positive: boolean };
    progress?: number;
    progressColor?: string;
    badge?: string;
    badgeColor?: string;
}

function KPICard({
    icon: Icon,
    iconColor,
    label,
    value,
    suffix,
    trend,
    progress,
    progressColor = "bg-primary",
    badge,
    badgeColor,
}: KPICardProps) {
    return (
        <div className="card-hover p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                    <span className="metric-label">{label}</span>
                </div>
                {badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeColor}`}>
                        {badge}
                    </span>
                )}
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-1">
                <span className="value-medium">{value}</span>
                {suffix && (
                    <span className="text-sm text-muted-foreground">{suffix}</span>
                )}
            </div>

            {/* Trend or Progress */}
            {trend && (
                <div className={`flex items-center gap-1 text-xs font-medium ${trend.positive ? "text-accent" : "text-destructive"
                    }`}>
                    {trend.positive ? (
                        <ArrowUpRight className="w-3 h-3" />
                    ) : (
                        <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span>{trend.value}% vs yesterday</span>
                </div>
            )}

            {progress !== undefined && (
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full ${progressColor}`}
                    />
                </div>
            )}
        </div>
    );
}
