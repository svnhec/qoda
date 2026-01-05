'use client';

/**
 * ALERTS VIEW COMPONENT
 * =============================================================================
 * Interactive alerts dashboard with:
 * - Summary stats
 * - Filterable alert list
 * - Quick actions (acknowledge, resolve)
 * - Real-time updates
 * =============================================================================
 */

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    CreditCard,
    TrendingUp,
    Eye,
    Check,
    Filter,
    RefreshCw,
    ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Alert {
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    is_read: boolean;
    is_resolved: boolean;
    agent_id: string | null;
    transaction_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    agents: { name: string } | null;
}

interface AlertsViewProps {
    alerts: Alert[];
    stats: {
        total: number;
        unread: number;
        critical: number;
        today: number;
    };
}

type FilterType = 'all' | 'unread' | 'critical' | 'resolved';

export function AlertsView({ alerts, stats }: AlertsViewProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());

    const filteredAlerts = alerts.filter(alert => {
        switch (filter) {
            case 'unread': return !alert.is_read;
            case 'critical': return alert.severity === 'critical';
            case 'resolved': return alert.is_resolved;
            default: return true;
        }
    });

    const getAlertIcon = (type: string, severity: string) => {
        if (severity === 'critical') return <XCircle className="w-5 h-5 text-destructive" />;
        switch (type) {
            case 'decline': return <CreditCard className="w-5 h-5 text-warning" />;
            case 'anomaly': return <AlertTriangle className="w-5 h-5 text-warning" />;
            case 'limit_approaching': return <TrendingUp className="w-5 h-5 text-info" />;
            case 'limit_reached': return <AlertCircle className="w-5 h-5 text-destructive" />;
            default: return <Bell className="w-5 h-5 text-muted-foreground" />;
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <span className="px-2 py-0.5 rounded text-xs font-bold bg-destructive/10 text-destructive">CRITICAL</span>;
            case 'warning':
                return <span className="px-2 py-0.5 rounded text-xs font-bold bg-warning/10 text-warning">WARNING</span>;
            case 'info':
                return <span className="px-2 py-0.5 rounded text-xs font-bold bg-info/10 text-info">INFO</span>;
            default:
                return null;
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const markAsRead = async (alertIds: string[]) => {
        await fetch('/api/alerts/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alert_ids: alertIds }),
        });
        startTransition(() => router.refresh());
    };

    const resolveAlerts = async (alertIds: string[]) => {
        await fetch('/api/alerts/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alert_ids: alertIds }),
        });
        startTransition(() => router.refresh());
    };

    const toggleSelectAll = () => {
        if (selectedAlerts.size === filteredAlerts.length) {
            setSelectedAlerts(new Set());
        } else {
            setSelectedAlerts(new Set(filteredAlerts.map(a => a.id)));
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <Bell className="w-6 h-6 text-primary" />
                        Alert Center
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Monitor and manage all system alerts
                    </p>
                </div>
                <button
                    onClick={() => startTransition(() => router.refresh())}
                    className="btn-secondary"
                    disabled={isPending}
                >
                    <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-hover p-5"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                        <span className="metric-label">Total Alerts</span>
                    </div>
                    <div className="value-medium">{stats.total}</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card-hover p-5"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-primary" />
                        <span className="metric-label">Unread</span>
                    </div>
                    <div className="value-medium text-primary">{stats.unread}</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card-hover p-5"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <span className="metric-label">Critical</span>
                    </div>
                    <div className="value-medium text-destructive">{stats.critical}</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card-hover p-5"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-accent" />
                        <span className="metric-label">Today</span>
                    </div>
                    <div className="value-medium">{stats.today}</div>
                </motion.div>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <div className="flex h-9 items-center rounded-lg bg-secondary border border-border p-1">
                        {(['all', 'unread', 'critical', 'resolved'] as FilterType[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 h-7 rounded text-xs font-medium transition-all capitalize ${filter === f
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {selectedAlerts.size > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {selectedAlerts.size} selected
                        </span>
                        <button
                            onClick={() => markAsRead(Array.from(selectedAlerts))}
                            className="btn-secondary text-sm py-1.5"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Mark Read
                        </button>
                        <button
                            onClick={() => resolveAlerts(Array.from(selectedAlerts))}
                            className="btn-primary text-sm py-1.5"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Resolve
                        </button>
                    </div>
                )}
            </div>

            {/* Alerts List */}
            <div className="card p-0 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border flex items-center gap-4 bg-secondary/30">
                    <input
                        type="checkbox"
                        checked={selectedAlerts.size === filteredAlerts.length && filteredAlerts.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {filteredAlerts.length} Alerts
                    </span>
                </div>

                {/* Alert Items */}
                <div className="divide-y divide-border">
                    <AnimatePresence mode="popLayout">
                        {filteredAlerts.length === 0 ? (
                            <div className="p-12 text-center">
                                <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-foreground">All Clear</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    No alerts match your current filter
                                </p>
                            </div>
                        ) : (
                            filteredAlerts.map((alert, index) => (
                                <motion.div
                                    key={alert.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.02 }}
                                    className={`flex items-start gap-4 p-4 hover:bg-secondary/20 transition-colors cursor-pointer ${!alert.is_read ? 'bg-primary/5' : ''
                                        } ${alert.is_resolved ? 'opacity-60' : ''}`}
                                    onClick={() => {
                                        if (!alert.is_read) markAsRead([alert.id]);
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedAlerts.has(alert.id)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            const newSelected = new Set(selectedAlerts);
                                            if (newSelected.has(alert.id)) {
                                                newSelected.delete(alert.id);
                                            } else {
                                                newSelected.add(alert.id);
                                            }
                                            setSelectedAlerts(newSelected);
                                        }}
                                        className="w-4 h-4 rounded border-border mt-1"
                                    />

                                    <div className="shrink-0 mt-0.5">
                                        {getAlertIcon(alert.type, alert.severity)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-foreground">
                                                {alert.title}
                                            </span>
                                            {getSeverityBadge(alert.severity)}
                                            {alert.is_resolved && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent">
                                                    RESOLVED
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {alert.message}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                            <span>{formatTime(alert.created_at)}</span>
                                            {alert.agents && (
                                                <>
                                                    <span>•</span>
                                                    <span>{alert.agents.name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {alert.transaction_id && (
                                        <Link
                                            href={`/dashboard/transactions/${alert.transaction_id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="shrink-0 p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
