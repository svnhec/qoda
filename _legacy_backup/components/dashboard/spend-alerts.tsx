/**
 * Spend Alert System
 * =============================================================================
 * Real-time alert system for spend thresholds.
 * Monitors agent spending and triggers alerts when thresholds are exceeded.
 * =============================================================================
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Bell, BellRing, X, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SpendAlert {
    id: string;
    type: 'warning' | 'danger' | 'critical';
    agentId: string;
    agentName: string;
    title: string;
    message: string;
    timestamp: Date;
    dismissed: boolean;
}

interface AgentSpendData {
    id: string;
    name: string;
    monthlyBudgetCents: bigint;
    currentSpendCents: bigint;
    status: 'green' | 'yellow' | 'red';
}

// Alert thresholds
const THRESHOLDS = {
    WARNING: 75,   // 75% of budget
    DANGER: 90,    // 90% of budget
    CRITICAL: 100, // 100% of budget
};

// Generate alerts based on agent data
function generateAlerts(agents: AgentSpendData[]): SpendAlert[] {
    const alerts: SpendAlert[] = [];

    for (const agent of agents) {
        if (agent.monthlyBudgetCents === 0n) continue;

        const percentUsed = Number((agent.currentSpendCents * 100n) / agent.monthlyBudgetCents);

        if (percentUsed >= THRESHOLDS.CRITICAL) {
            alerts.push({
                id: `${agent.id}-critical`,
                type: 'critical',
                agentId: agent.id,
                agentName: agent.name,
                title: 'Budget Exceeded!',
                message: `${agent.name} has exceeded its monthly budget (${percentUsed.toFixed(0)}%)`,
                timestamp: new Date(),
                dismissed: false,
            });
        } else if (percentUsed >= THRESHOLDS.DANGER) {
            alerts.push({
                id: `${agent.id}-danger`,
                type: 'danger',
                agentId: agent.id,
                agentName: agent.name,
                title: 'Budget Nearly Exhausted',
                message: `${agent.name} has used ${percentUsed.toFixed(0)}% of its monthly budget`,
                timestamp: new Date(),
                dismissed: false,
            });
        } else if (percentUsed >= THRESHOLDS.WARNING) {
            alerts.push({
                id: `${agent.id}-warning`,
                type: 'warning',
                agentId: agent.id,
                agentName: agent.name,
                title: 'High Spend Rate',
                message: `${agent.name} has used ${percentUsed.toFixed(0)}% of its monthly budget`,
                timestamp: new Date(),
                dismissed: false,
            });
        }

        // Circuit breaker alerts
        if (agent.status === 'red') {
            alerts.push({
                id: `${agent.id}-frozen`,
                type: 'critical',
                agentId: agent.id,
                agentName: agent.name,
                title: 'Agent Frozen',
                message: `${agent.name} has been frozen due to velocity limits`,
                timestamp: new Date(),
                dismissed: false,
            });
        } else if (agent.status === 'yellow') {
            alerts.push({
                id: `${agent.id}-throttled`,
                type: 'warning',
                agentId: agent.id,
                agentName: agent.name,
                title: 'Agent Throttled',
                message: `${agent.name} is being throttled due to high velocity`,
                timestamp: new Date(),
                dismissed: false,
            });
        }
    }

    return alerts.sort((a, b) => {
        const priority = { critical: 0, danger: 1, warning: 2 };
        return priority[a.type] - priority[b.type];
    });
}

// Hook for managing spend alerts
export function useSpendAlerts(agents: AgentSpendData[]) {
    const [alerts, setAlerts] = useState<SpendAlert[]>([]);
    const [lastShownAlerts, setLastShownAlerts] = useState<Set<string>>(new Set());

    // Generate and show new alerts
    useEffect(() => {
        const newAlerts = generateAlerts(agents);
        setAlerts(newAlerts);

        // Log new critical/danger alerts (in production, use a toast library)
        for (const alert of newAlerts) {
            if (!lastShownAlerts.has(alert.id) && (alert.type === 'critical' || alert.type === 'danger')) {
                console.warn(`[SPEND ALERT] ${alert.type.toUpperCase()}: ${alert.title} - ${alert.message}`);
                setLastShownAlerts(prev => new Set(prev).add(alert.id));
            }
        }
    }, [agents, lastShownAlerts]);

    const dismissAlert = useCallback((alertId: string) => {
        setAlerts(prev => prev.map(a =>
            a.id === alertId ? { ...a, dismissed: true } : a
        ));
    }, []);

    const clearAllAlerts = useCallback(() => {
        setAlerts(prev => prev.map(a => ({ ...a, dismissed: true })));
    }, []);

    const activeAlerts = alerts.filter(a => !a.dismissed);

    return {
        alerts: activeAlerts,
        allAlerts: alerts,
        dismissAlert,
        clearAllAlerts,
        criticalCount: activeAlerts.filter(a => a.type === 'critical').length,
        dangerCount: activeAlerts.filter(a => a.type === 'danger').length,
        warningCount: activeAlerts.filter(a => a.type === 'warning').length,
    };
}

// Alert Bell Component for Navbar
interface AlertBellProps {
    alerts: SpendAlert[];
    onDismiss: (id: string) => void;
    onClearAll: () => void;
}

export function AlertBell({ alerts, onDismiss, onClearAll }: AlertBellProps) {
    const [isOpen, setIsOpen] = useState(false);

    const criticalCount = alerts.filter(a => a.type === 'critical').length;
    const hasAlerts = alerts.length > 0;

    const getAlertIcon = (type: SpendAlert['type']) => {
        switch (type) {
            case 'critical': return <Shield className="w-4 h-4 text-red-400" />;
            case 'danger': return <Zap className="w-4 h-4 text-orange-400" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
        }
    };

    const getAlertStyle = (type: SpendAlert['type']) => {
        switch (type) {
            case 'critical': return 'bg-red-500/10 border-red-500/30';
            case 'danger': return 'bg-orange-500/10 border-orange-500/30';
            case 'warning': return 'bg-amber-500/10 border-amber-500/30';
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-lg transition-colors ${hasAlerts
                    ? 'text-amber-400 hover:bg-amber-500/10'
                    : 'text-white/40 hover:bg-white/5'
                    }`}
            >
                {hasAlerts ? (
                    <BellRing className="w-5 h-5 animate-pulse" />
                ) : (
                    <Bell className="w-5 h-5" />
                )}

                {alerts.length > 0 && (
                    <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${criticalCount > 0 ? 'bg-red-500' : 'bg-amber-500'
                        } text-white`}>
                        {alerts.length > 9 ? '9+' : alerts.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <h3 className="font-medium text-white">Spend Alerts</h3>
                            {alerts.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClearAll}
                                    className="text-xs text-white/40 hover:text-white"
                                >
                                    Clear All
                                </Button>
                            )}
                        </div>

                        {/* Alerts List */}
                        <div className="max-h-80 overflow-y-auto">
                            {alerts.length === 0 ? (
                                <div className="p-6 text-center text-white/40">
                                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No active alerts</p>
                                    <p className="text-xs mt-1">All agents operating normally</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {alerts.map(alert => (
                                        <div
                                            key={alert.id}
                                            className={`p-3 ${getAlertStyle(alert.type)} border-l-2`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {getAlertIcon(alert.type)}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className="text-sm font-medium text-white truncate">
                                                            {alert.title}
                                                        </h4>
                                                        <button
                                                            onClick={() => onDismiss(alert.id)}
                                                            className="text-white/40 hover:text-white p-1"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-white/60 mt-0.5">
                                                        {alert.message}
                                                    </p>
                                                    <p className="text-xs text-white/30 mt-1">
                                                        {alert.timestamp.toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Alerts Panel for Dashboard
export function AlertsPanel({ alerts, onDismiss }: { alerts: SpendAlert[]; onDismiss: (id: string) => void }) {
    if (alerts.length === 0) return null;

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Active Alerts ({alerts.length})
            </h3>

            <div className="space-y-2">
                {alerts.slice(0, 5).map(alert => (
                    <div
                        key={alert.id}
                        className={`p-3 rounded-lg border ${alert.type === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                            alert.type === 'danger' ? 'bg-orange-500/10 border-orange-500/30' :
                                'bg-amber-500/10 border-amber-500/30'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h4 className={`text-sm font-medium ${alert.type === 'critical' ? 'text-red-400' :
                                    alert.type === 'danger' ? 'text-orange-400' :
                                        'text-amber-400'
                                    }`}>
                                    {alert.title}
                                </h4>
                                <p className="text-xs text-white/60 mt-0.5">{alert.message}</p>
                            </div>
                            <button
                                onClick={() => onDismiss(alert.id)}
                                className="text-white/40 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {alerts.length > 5 && (
                    <p className="text-xs text-white/40 text-center">
                        +{alerts.length - 5} more alerts
                    </p>
                )}
            </div>
        </div>
    );
}
