/**
 * API Client Configuration for Qoda
 *
 * This file provides a centralized way to connect your frontend to your backend.
 * Replace BACKEND_URL with your actual backend URL.
 *
 * HOW TO CONNECT TO YOUR BACKEND:
 *
 * 1. Set the BACKEND_URL environment variable in your .env.local file:
 *    NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
 *
 * 2. Or for local development:
 *    NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
 *
 * 3. The API client handles:
 *    - Authentication headers (JWT tokens)
 *    - Error handling
 *    - Request/response formatting
 */

import type {
    User,
    Client,
    CreateClientData,
    Agent,
    CreateAgentData,
    CardDetails,
    Transaction,
    TransactionFilters,
    Invoice,
    CreateInvoiceData,
    SpendCalculation,
    FundingBalance,
    FundingTransaction,
    AddFundsData,
    AddFundsResponse,
    AutoReloadSettings,
    Alert,
    AlertSettings,
    Settings,
    StripeStatus,
    MessageResponse,
    ApiSuccessResponse,
} from "@/lib/types"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

// Token management
let authToken: string | null = null

export const setAuthToken = (token: string | null) => {
    authToken = token
    if (typeof window !== "undefined") {
        if (token) {
            localStorage.setItem("qoda_token", token)
        } else {
            localStorage.removeItem("qoda_token")
        }
    }
}

export const getAuthToken = (): string | null => {
    if (authToken) return authToken
    if (typeof window !== "undefined") {
        authToken = localStorage.getItem("qoda_token")
    }
    return authToken
}

// Base fetch wrapper with auth and error handling
async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken()

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers,
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Request failed" }))
        throw new Error(error.message || `HTTP ${response.status}`)
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
        return undefined as T
    }

    return response.json()
}

// ============================================
// AUTH API
// ============================================
export const authApi = {
    login: (email: string, password: string) =>
        fetchWithAuth<{ token: string; user: User }>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),

    register: (data: { email: string; password: string; agencyName: string }) =>
        fetchWithAuth<{ token: string; user: User }>("/api/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    logout: () => {
        setAuthToken(null)
        return Promise.resolve()
    },

    forgotPassword: (email: string) =>
        fetchWithAuth<MessageResponse>("/api/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email }),
        }),

    resetPassword: (token: string, password: string) =>
        fetchWithAuth<MessageResponse>("/api/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ token, password }),
        }),

    verifyEmail: (token: string) =>
        fetchWithAuth<MessageResponse>("/api/auth/verify-email", {
            method: "POST",
            body: JSON.stringify({ token }),
        }),

    getMe: () => fetchWithAuth<User>("/api/auth/me"),
}

// ============================================
// CLIENTS API
// ============================================
export const clientsApi = {
    list: () => fetchWithAuth<Client[]>("/api/clients"),

    get: (id: string) => fetchWithAuth<Client>(`/api/clients/${id}`),

    create: (data: CreateClientData) =>
        fetchWithAuth<Client>("/api/clients", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<CreateClientData>) =>
        fetchWithAuth<Client>(`/api/clients/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        fetchWithAuth<void>(`/api/clients/${id}`, {
            method: "DELETE",
        }),
}

// ============================================
// AGENTS API
// ============================================
export const agentsApi = {
    list: (clientId?: string) =>
        fetchWithAuth<Agent[]>(`/api/agents${clientId ? `?clientId=${clientId}` : ""}`),

    get: (id: string) => fetchWithAuth<Agent>(`/api/agents/${id}`),

    create: (data: CreateAgentData) =>
        fetchWithAuth<Agent>("/api/agents", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<CreateAgentData>) =>
        fetchWithAuth<Agent>(`/api/agents/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    freeze: (id: string) =>
        fetchWithAuth<Agent>(`/api/agents/${id}/freeze`, {
            method: "POST",
        }),

    unfreeze: (id: string) =>
        fetchWithAuth<Agent>(`/api/agents/${id}/unfreeze`, {
            method: "POST",
        }),

    getCardDetails: (id: string) => fetchWithAuth<CardDetails>(`/api/agents/${id}/card`),
}

// ============================================
// TRANSACTIONS API
// ============================================
export const transactionsApi = {
    list: (params?: TransactionFilters) => {
        const searchParams = new URLSearchParams()
        if (params?.clientId) searchParams.set("clientId", params.clientId)
        if (params?.agentId) searchParams.set("agentId", params.agentId)
        if (params?.status) searchParams.set("status", params.status)
        if (params?.limit) searchParams.set("limit", params.limit.toString())
        const query = searchParams.toString()
        return fetchWithAuth<Transaction[]>(`/api/transactions${query ? `?${query}` : ""}`)
    },

    get: (id: string) => fetchWithAuth<Transaction>(`/api/transactions/${id}`),
}

// ============================================
// INVOICES API
// ============================================
export const invoicesApi = {
    list: (status?: string) =>
        fetchWithAuth<Invoice[]>(`/api/invoices${status ? `?status=${status}` : ""}`),

    get: (id: string) => fetchWithAuth<Invoice>(`/api/invoices/${id}`),

    create: (data: CreateInvoiceData) =>
        fetchWithAuth<Invoice>("/api/invoices", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    send: (id: string) =>
        fetchWithAuth<Invoice>(`/api/invoices/${id}/send`, {
            method: "POST",
        }),

    markPaid: (id: string) =>
        fetchWithAuth<Invoice>(`/api/invoices/${id}/mark-paid`, {
            method: "POST",
        }),

    calculateSpend: (clientId: string, startDate: string, endDate: string) =>
        fetchWithAuth<SpendCalculation>("/api/invoices/calculate", {
            method: "POST",
            body: JSON.stringify({ clientId, startDate, endDate }),
        }),
}

// ============================================
// FUNDING API
// ============================================
export const fundingApi = {
    getBalance: () => fetchWithAuth<FundingBalance>("/api/funding/balance"),

    addFunds: (data: AddFundsData) =>
        fetchWithAuth<AddFundsResponse>("/api/funding/add", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    getHistory: () => fetchWithAuth<FundingTransaction[]>("/api/funding/history"),

    setupAutoReload: (data: AutoReloadSettings) =>
        fetchWithAuth<ApiSuccessResponse>("/api/funding/auto-reload", {
            method: "POST",
            body: JSON.stringify(data),
        }),
}

// ============================================
// ALERTS API
// ============================================
export const alertsApi = {
    list: () => fetchWithAuth<Alert[]>("/api/alerts"),

    dismiss: (id: string) =>
        fetchWithAuth<void>(`/api/alerts/${id}/dismiss`, {
            method: "POST",
        }),

    getSettings: () => fetchWithAuth<AlertSettings>("/api/alerts/settings"),

    updateSettings: (data: Partial<AlertSettings>) =>
        fetchWithAuth<AlertSettings>("/api/alerts/settings", {
            method: "PATCH",
            body: JSON.stringify(data),
        }),
}

// ============================================
// SETTINGS API
// ============================================
export const settingsApi = {
    get: () => fetchWithAuth<Settings>("/api/settings"),

    update: (data: Partial<Settings>) =>
        fetchWithAuth<Settings>("/api/settings", {
            method: "PATCH",
            body: JSON.stringify(data),
        }),

    getStripeStatus: () => fetchWithAuth<StripeStatus>("/api/settings/stripe"),
}
