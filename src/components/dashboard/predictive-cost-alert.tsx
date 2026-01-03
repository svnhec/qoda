/**
 * Predictive Cost Alert Component
 * =============================================================================
 * Shows projected monthly spend based on current velocity and alerts when
 * the projected amount exceeds a threshold (e.g., 80% of budget).
 * 
 * This is a critical feature for agencies to catch runaway costs before
 * they actually happen.
 * =============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingUp, Shield, Zap } from "lucide-react";

interface PredictiveCostAlertProps {
    agentName: string;
    monthlyBudgetCents: bigint;
    currentSpendCents: bigint;
    currentVelocityCentsPerMinute: bigint;
    status: 'green' | 'yellow' | 'red';
    daysRemainingInMonth?: number;
}

interface ProjectedSpend {
    projectedTotalCents: bigint;
    percentOfBudget: number;
    daysToExceed: number | null; // null if won't exceed
    alertLevel: 'none' | 'warning' | 'danger' | 'critical';
    message: string;
}

function calculateProjectedSpend(
    currentSpendCents: bigint,
    velocityCentsPerMinute: bigint,
    monthlyBudgetCents: bigint,
    daysRemaining: number
): ProjectedSpend {
    // Calculate projected spend based on current velocity
    // Assume 8 hours of active spend per day (conservative for AI agents)
    const minutesPerActiveDay = BigInt(8 * 60); // 8 hours
    const remainingMinutes = BigInt(daysRemaining) * minutesPerActiveDay;

    const projectedAdditionalSpend = velocityCentsPerMinute * remainingMinutes;
    const projectedTotalCents = currentSpendCents + projectedAdditionalSpend;

    // Calculate percentage of budget
    const percentOfBudget = monthlyBudgetCents > 0n
        ? Number((projectedTotalCents * 100n) / monthlyBudgetCents)
        : 0;

    // Calculate days until budget exceeded
    let daysToExceed: number | null = null;
    if (velocityCentsPerMinute > 0n && projectedTotalCents > monthlyBudgetCents) {
        const remainingBudget = monthlyBudgetCents - currentSpendCents;
        if (remainingBudget > 0n) {
            const minutesToExceed = remainingBudget / velocityCentsPerMinute;
            daysToExceed = Math.ceil(Number(minutesToExceed) / (8 * 60)); // 8 hour days
        } else {
            daysToExceed = 0; // Already exceeded
        }
    }

    // Determine alert level
    let alertLevel: ProjectedSpend['alertLevel'] = 'none';
    let message = 'Spend is within normal parameters.';

    if (percentOfBudget >= 100) {
        alertLevel = 'critical';
        message = daysToExceed !== null
            ? `Budget will be exceeded in ${daysToExceed} day${daysToExceed !== 1 ? 's' : ''} at current rate!`
            : 'Budget has already been exceeded!';
    } else if (percentOfBudget >= 90) {
        alertLevel = 'danger';
        message = `Projected to use ${percentOfBudget.toFixed(0)}% of budget by month end.`;
    } else if (percentOfBudget >= 75) {
        alertLevel = 'warning';
        message = `On track to use ${percentOfBudget.toFixed(0)}% of budget. Monitor closely.`;
    }

    return {
        projectedTotalCents,
        percentOfBudget,
        daysToExceed,
        alertLevel,
        message,
    };
}

function formatCents(cents: bigint): string {
    const dollars = Number(cents) / 100;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(dollars);
}

function getDaysRemainingInMonth(): number {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate();
}

export function PredictiveCostAlert({
    agentName,
    monthlyBudgetCents,
    currentSpendCents,
    currentVelocityCentsPerMinute,
    status,
    daysRemainingInMonth,
}: PredictiveCostAlertProps) {
    const [projection, setProjection] = useState<ProjectedSpend | null>(null);

    useEffect(() => {
        const daysRemaining = daysRemainingInMonth ?? getDaysRemainingInMonth();
        const result = calculateProjectedSpend(
            currentSpendCents,
            currentVelocityCentsPerMinute,
            monthlyBudgetCents,
            daysRemaining
        );
        setProjection(result);
    }, [currentSpendCents, currentVelocityCentsPerMinute, monthlyBudgetCents, daysRemainingInMonth]);

    if (!projection) return null;

    // Don't show if no alert
    if (projection.alertLevel === 'none' && status === 'green') {
        return null;
    }

    const alertStyles = {
        none: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        danger: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
        critical: 'bg-red-500/10 border-red-500/30 text-red-400',
    };

    const AlertIcon = projection.alertLevel === 'critical'
        ? AlertTriangle
        : projection.alertLevel === 'danger'
            ? Zap
            : TrendingUp;

    return (
        <div className={`rounded-lg border p-4 ${alertStyles[projection.alertLevel]}`}>
            <div className="flex items-start gap-3">
                <AlertIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium truncate">{agentName}</h4>
                        {status === 'red' && (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                FROZEN
                            </span>
                        )}
                    </div>

                    <p className="text-sm mt-1 opacity-80">{projection.message}</p>

                    <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                        <div>
                            <div className="opacity-60">Current Spend</div>
                            <div className="font-mono font-medium">{formatCents(currentSpendCents)}</div>
                        </div>
                        <div>
                            <div className="opacity-60">Projected</div>
                            <div className="font-mono font-medium">{formatCents(projection.projectedTotalCents)}</div>
                        </div>
                        <div>
                            <div className="opacity-60">Budget</div>
                            <div className="font-mono font-medium">{formatCents(monthlyBudgetCents)}</div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                        <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${projection.percentOfBudget >= 100 ? 'bg-red-500' :
                                    projection.percentOfBudget >= 90 ? 'bg-orange-500' :
                                        projection.percentOfBudget >= 75 ? 'bg-amber-500' :
                                            'bg-emerald-500'
                                    }`}
                                style={{ width: `${Math.min(projection.percentOfBudget, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs mt-1 opacity-60">
                            <span>0%</span>
                            <span>{projection.percentOfBudget.toFixed(0)}% projected</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Multi-Agent Predictive Cost Overview
 * Shows alerts for all agents that are at risk of exceeding budget
 */
interface AgentCostData {
    id: string;
    name: string;
    monthlyBudgetCents: bigint;
    currentSpendCents: bigint;
    currentVelocityCentsPerMinute: bigint;
    status: 'green' | 'yellow' | 'red';
}

export function PredictiveCostOverview({ agents }: { agents: AgentCostData[] }) {
    const daysRemaining = getDaysRemainingInMonth();

    const alertAgents = agents
        .map(agent => ({
            ...agent,
            projection: calculateProjectedSpend(
                agent.currentSpendCents,
                agent.currentVelocityCentsPerMinute,
                agent.monthlyBudgetCents,
                daysRemaining
            )
        }))
        .filter(agent =>
            agent.projection.alertLevel !== 'none' ||
            agent.status !== 'green'
        )
        .sort((a, b) => b.projection.percentOfBudget - a.projection.percentOfBudget);

    if (alertAgents.length === 0) {
        return (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
                <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h3 className="font-medium text-white">All Clear</h3>
                <p className="text-sm text-white/50 mt-1">
                    All agents are within normal spending parameters.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="font-medium text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Cost Alerts ({alertAgents.length})
                </h3>
                <span className="text-xs text-white/40">
                    {daysRemaining} days remaining in month
                </span>
            </div>

            <div className="space-y-2">
                {alertAgents.map(agent => (
                    <PredictiveCostAlert
                        key={agent.id}
                        agentName={agent.name}
                        monthlyBudgetCents={agent.monthlyBudgetCents}
                        currentSpendCents={agent.currentSpendCents}
                        currentVelocityCentsPerMinute={agent.currentVelocityCentsPerMinute}
                        status={agent.status}
                        daysRemainingInMonth={daysRemaining}
                    />
                ))}
            </div>
        </div>
    );
}
