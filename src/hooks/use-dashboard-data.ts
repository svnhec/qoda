/**
 * Dashboard Data Hook
 * =============================================================================
 * React hook for fetching dashboard data from the API.
 * Includes loading, error, and refresh states.
 * =============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { type CentsAmount, parseCents, formatCurrency } from "@/lib/types/currency";

// Types for API responses
export interface DashboardStats {
    balance_cents: string;
    total_agents: number;
    active_agents: number;
    total_clients: number;
    today_transactions: number;
    today_spend_cents: string;
    month_spend_cents: string;
    unread_alerts: number;
}

export interface Agent {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    status: "green" | "yellow" | "red";
    monthly_budget_cents: string;
    current_spend_cents: string;
    client_id: string | null;
    created_at: string;
    updated_at: string;
    clients?: { id: string; name: string } | null;
}

export interface Transaction {
    id: string;
    amount_cents: string;
    merchant_name: string | null;
    merchant_category: string | null;
    status: "approved" | "declined" | "pending";
    stripe_transaction_id: string | null;
    created_at: string;
    agent_id: string | null;
    agents?: { id: string; name: string } | null;
}

export interface Alert {
    id: string;
    alert_type: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    message: string;
    metadata: Record<string, unknown>;
    is_read: boolean;
    resolved_at: string | null;
    created_at: string;
}

export interface DashboardData {
    stats: DashboardStats | null;
    agents: Agent[];
    transactions: Transaction[];
    alerts: Alert[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * Fetch dashboard data from all endpoints.
 */
export function useDashboardData(): DashboardData {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch all data in parallel
            const [statsRes, agentsRes, transactionsRes, alertsRes] = await Promise.all([
                fetch("/api/dashboard/stats"),
                fetch("/api/agents"),
                fetch("/api/transactions?limit=20"),
                fetch("/api/alerts?limit=10"),
            ]);

            // Check for auth errors
            if (statsRes.status === 401 || agentsRes.status === 401) {
                setError("Please log in to view dashboard");
                return;
            }

            // Parse responses
            const [statsData, agentsData, transactionsData, alertsData] = await Promise.all([
                statsRes.json(),
                agentsRes.json(),
                transactionsRes.json(),
                alertsRes.json(),
            ]);

            if (statsRes.ok) setStats(statsData);
            if (agentsRes.ok) setAgents(agentsData.agents || []);
            if (transactionsRes.ok) setTransactions(transactionsData.transactions || []);
            if (alertsRes.ok) setAlerts(alertsData.alerts || []);

        } catch (err) {
            console.error("Dashboard data fetch error:", err);
            setError("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        stats,
        agents,
        transactions,
        alerts,
        isLoading,
        error,
        refresh: fetchData,
    };
}

/**
 * Format stats for display.
 */
export function formatDashboardStats(stats: DashboardStats | null) {
    if (!stats) {
        return {
            balance: "$0.00",
            balanceCents: 0n as CentsAmount,
            activeAgents: 0,
            totalAgents: 0,
            todaySpend: "$0.00",
            monthSpend: "$0.00",
            todayTransactions: 0,
            unreadAlerts: 0,
        };
    }

    const balanceCents = parseCents(stats.balance_cents);
    const todaySpendCents = parseCents(stats.today_spend_cents);
    const monthSpendCents = parseCents(stats.month_spend_cents);

    return {
        balance: formatCurrency(balanceCents),
        balanceCents,
        activeAgents: stats.active_agents,
        totalAgents: stats.total_agents,
        todaySpend: formatCurrency(todaySpendCents),
        monthSpend: formatCurrency(monthSpendCents),
        todayTransactions: stats.today_transactions,
        unreadAlerts: stats.unread_alerts,
    };
}

