/**
 * Task Attribution Dashboard
 * =============================================================================
 * Shows spend breakdown by task/workflow for cost attribution analysis.
 * Helps agencies understand what activities are driving costs for each client.
 * =============================================================================
 */

"use client";

import { useState } from "react";
import {
    Filter,
    Download,
    Layers,
    Tag,
    ArrowUpRight,
    PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskSpendData {
    taskCategory: string;
    taskName: string;
    totalSpendCents: bigint;
    transactionCount: number;
    percentage: number;
    trend?: 'up' | 'down' | 'stable';
    trendPercent?: number;
}

interface TaskAttributionProps {
    data: TaskSpendData[];
    totalSpendCents: bigint;
    clientName?: string;
    periodLabel?: string;
}

function formatCents(cents: bigint | number): string {
    const value = typeof cents === 'bigint' ? Number(cents) : cents;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value / 100);
}

function formatCentsDetailed(cents: bigint | number): string {
    const value = typeof cents === 'bigint' ? Number(cents) : cents;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(value / 100);
}

// Color palette for task categories
const CATEGORY_COLORS: Record<string, string> = {
    'email_outreach': '#22c55e',
    'data_enrichment': '#3b82f6',
    'research': '#8b5cf6',
    'content_creation': '#f59e0b',
    'lead_generation': '#ec4899',
    'customer_support': '#06b6d4',
    'social_media': '#f97316',
    'general': '#6b7280',
    'unattributed': '#374151',
};

function getCategoryColor(category: string): string {
    const color = CATEGORY_COLORS[category.toLowerCase()];
    return color ?? CATEGORY_COLORS['general'] ?? '#6b7280';
}

export function TaskAttributionChart({ data, totalSpendCents, clientName, periodLabel }: TaskAttributionProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Calculate the max value for bar scaling
    const maxSpend = data.length > 0
        ? Math.max(...data.map(d => Number(d.totalSpendCents)))
        : 1;

    // Filter data if category selected
    const displayData = selectedCategory
        ? data.filter(d => d.taskCategory === selectedCategory)
        : data;

    // Unique categories for filter
    const categories = [...new Set(data.map(d => d.taskCategory))];

    return (
        <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                        Spend by Task
                    </h3>
                    <p className="text-sm text-white/50 mt-1">
                        {clientName ? `${clientName} • ` : ''}{periodLabel || 'This Month'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-white/50 hover:text-white">
                        <Filter className="w-4 h-4 mr-1" />
                        Filter
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white/50 hover:text-white">
                        <Download className="w-4 h-4 mr-1" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-xs text-white/50 mb-1">Total Spend</div>
                    <div className="text-xl font-bold text-white">{formatCents(totalSpendCents)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-xs text-white/50 mb-1">Task Categories</div>
                    <div className="text-xl font-bold text-white">{categories.length}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-xs text-white/50 mb-1">Total Tasks</div>
                    <div className="text-xl font-bold text-white">{data.length}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-xs text-white/50 mb-1">Avg per Task</div>
                    <div className="text-xl font-bold text-white">
                        {data.length > 0 ? formatCents(totalSpendCents / BigInt(data.length)) : '$0'}
                    </div>
                </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedCategory === null
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                >
                    All
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${selectedCategory === cat
                            ? 'bg-white text-black'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                    >
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getCategoryColor(cat) }}
                        />
                        {cat.replace(/_/g, ' ')}
                    </button>
                ))}
            </div>

            {/* Horizontal Bar Chart */}
            <div className="space-y-3">
                {displayData.length === 0 ? (
                    <div className="text-center py-8 text-white/40">
                        <PieChart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No task data available</p>
                        <p className="text-xs mt-1">Transactions will appear here once attributed to tasks</p>
                    </div>
                ) : (
                    displayData.map((item, index) => (
                        <div key={`${item.taskCategory}-${item.taskName}-${index}`} className="group">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: getCategoryColor(item.taskCategory) }}
                                    />
                                    <span className="text-sm text-white font-medium truncate max-w-[200px]">
                                        {item.taskName}
                                    </span>
                                    <span className="text-xs text-white/40">
                                        {item.taskCategory.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-white/50">
                                        {item.transactionCount} txn{item.transactionCount !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-sm font-mono font-medium text-white">
                                        {formatCentsDetailed(item.totalSpendCents)}
                                    </span>
                                    {item.trend && item.trendPercent && (
                                        <span className={`text-xs flex items-center gap-0.5 ${item.trend === 'up' ? 'text-red-400' :
                                            item.trend === 'down' ? 'text-emerald-400' :
                                                'text-white/40'
                                            }`}>
                                            {item.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                                            {item.trendPercent}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                                    style={{
                                        width: `${(Number(item.totalSpendCents) / maxSpend) * 100}%`,
                                        backgroundColor: getCategoryColor(item.taskCategory)
                                    }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Unattributed Spend Warning */}
            {data.some(d => d.taskCategory === 'unattributed') && (
                <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <Tag className="w-5 h-5 text-amber-400 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-medium text-amber-400">Unattributed Spend Detected</h4>
                            <p className="text-xs text-white/50 mt-1">
                                Some transactions haven&apos;t been tagged with a task. Consider updating your agents to
                                include task context for better cost attribution.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Compact Task Attribution for cards/widgets
 */
interface CompactTaskAttributionProps {
    topTasks: Pick<TaskSpendData, 'taskCategory' | 'taskName' | 'totalSpendCents' | 'percentage'>[];
    totalSpendCents: bigint;
}

export function CompactTaskAttribution({ topTasks, totalSpendCents }: CompactTaskAttributionProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white/70">Top Tasks</h4>
                <span className="text-xs text-white/40">
                    {formatCents(totalSpendCents)} total
                </span>
            </div>

            {topTasks.slice(0, 5).map((task, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getCategoryColor(task.taskCategory) }}
                    />
                    <span className="text-sm text-white flex-1 truncate">{task.taskName}</span>
                    <span className="text-xs text-white/50">{task.percentage.toFixed(0)}%</span>
                </div>
            ))}

            {topTasks.length > 5 && (
                <p className="text-xs text-white/40 text-center">
                    +{topTasks.length - 5} more tasks
                </p>
            )}
        </div>
    );
}
