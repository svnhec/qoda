/**
 * React hooks for API data fetching with SWR
 *
 * These hooks provide:
 * - Automatic caching and revalidation
 * - Loading states
 * - Error handling
 * - Optimistic updates
 *
 * Usage:
 * const { data: clients, error, isLoading, mutate } = useClients()
 */

import useSWR from "swr"
import type { TransactionStatus } from "@/lib/types"
import {
    clientsApi,
    agentsApi,
    transactionsApi,
    invoicesApi,
    fundingApi,
    alertsApi,
    settingsApi,
    authApi,
} from "@/lib/api"

// ============================================
// AUTH HOOKS
// ============================================
export function useCurrentUser() {
    return useSWR("auth/me", () => authApi.getMe())
}

// ============================================
// CLIENTS HOOKS
// ============================================
export function useClients() {
    return useSWR("clients", () => clientsApi.list())
}

export function useClient(id: string | undefined) {
    return useSWR(id ? `clients/${id}` : null, () => clientsApi.get(id!))
}

// ============================================
// AGENTS HOOKS
// ============================================
export function useAgents(clientId?: string) {
    return useSWR(clientId ? `agents?clientId=${clientId}` : "agents", () => agentsApi.list(clientId))
}

export function useAgent(id: string | undefined) {
    return useSWR(id ? `agents/${id}` : null, () => agentsApi.get(id!))
}

export function useAgentCard(id: string | undefined) {
    return useSWR(
        id ? `agents/${id}/card` : null,
        () => agentsApi.getCardDetails(id!),
        { revalidateOnFocus: false } // Don't auto-refresh sensitive data
    )
}

// ============================================
// TRANSACTIONS HOOKS
// ============================================
export function useTransactions(params?: {
    clientId?: string
    agentId?: string
    status?: string
    limit?: number
}) {
    const key = params
        ? `transactions?${new URLSearchParams(params as Record<string, string>).toString()}`
        : "transactions"
    // Cast status to TransactionStatus if present
    const typedParams = params ? {
        ...params,
        status: params.status as TransactionStatus | undefined
    } : undefined
    return useSWR(key, () => transactionsApi.list(typedParams))
}

export function useTransaction(id: string | undefined) {
    return useSWR(id ? `transactions/${id}` : null, () => transactionsApi.get(id!))
}

// ============================================
// INVOICES HOOKS
// ============================================
export function useInvoices(status?: string) {
    return useSWR(status ? `invoices?status=${status}` : "invoices", () => invoicesApi.list(status))
}

export function useInvoice(id: string | undefined) {
    return useSWR(id ? `invoices/${id}` : null, () => invoicesApi.get(id!))
}

// ============================================
// FUNDING HOOKS
// ============================================
export function useFundingBalance() {
    return useSWR("funding/balance", () => fundingApi.getBalance(), {
        refreshInterval: 30000, // Refresh every 30 seconds
    })
}

export function useFundingHistory() {
    return useSWR("funding/history", () => fundingApi.getHistory())
}

// ============================================
// ALERTS HOOKS
// ============================================
export function useAlerts() {
    return useSWR("alerts", () => alertsApi.list(), {
        refreshInterval: 10000, // Refresh every 10 seconds for real-time alerts
    })
}

export function useAlertSettings() {
    return useSWR("alerts/settings", () => alertsApi.getSettings())
}

// ============================================
// SETTINGS HOOKS
// ============================================
export function useSettings() {
    return useSWR("settings", () => settingsApi.get())
}

export function useStripeStatus() {
    return useSWR("settings/stripe", () => settingsApi.getStripeStatus())
}
