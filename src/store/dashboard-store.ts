/**
 * DASHBOARD STORE
 * =============================================================================
 * Zustand store for real-time dashboard state (transactions, stats)
 * =============================================================================
 */

import { create } from 'zustand'

export interface Transaction {
    id: string
    agentName: string
    /** Amount in cents (BigInt for currency integrity) */
    amountCents: bigint
    merchant: string
    status: 'approved' | 'declined' | 'pending'
    timestamp: string
    category: string
}

interface DashboardStats {
    activeAgents: number
    totalSpend: number
    pendingTransactions: number
    riskScore: number
}

export interface DashboardState {
    transactions: Transaction[]
    stats: DashboardStats
    isConnected: boolean
    
    // Actions
    addTransaction: (tx: Transaction) => void
    updateStats: (partial: Partial<DashboardStats>) => void
    setConnected: (connected: boolean) => void
    clearTransactions: () => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
    transactions: [],
    stats: {
        activeAgents: 0,
        totalSpend: 0,
        pendingTransactions: 0,
        riskScore: 0,
    },
    isConnected: false,
    
    addTransaction: (tx) =>
        set((state) => ({
            transactions: [tx, ...state.transactions].slice(0, 100), // Keep last 100
        })),
    
    updateStats: (partial) =>
        set((state) => ({
            stats: { ...state.stats, ...partial },
        })),
    
    setConnected: (connected) => set({ isConnected: connected }),
    
    clearTransactions: () => set({ transactions: [] }),
}))

