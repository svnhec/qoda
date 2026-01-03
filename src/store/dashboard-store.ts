import { create } from 'zustand';

export interface Transaction {
    id: string;
    agentName: string;
    amount: number;
    merchant: string;
    status: 'approved' | 'declined' | 'pending';
    timestamp: string;
    category: string;
}

export interface DashboardStats {
    totalSpend: number;
    activeAgents: number;
    riskScore: number;
    dailyVolume: number;
}

interface DashboardState {
    transactions: Transaction[];
    stats: DashboardStats;

    // Actions
    addTransaction: (transaction: Transaction) => void;
    updateStats: (stats: Partial<DashboardStats>) => void;
    setInitialData: (transactions: Transaction[], stats: DashboardStats) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    transactions: [],
    stats: {
        totalSpend: 124592.50, // Initial dummy value
        activeAgents: 12,
        riskScore: 15,
        dailyVolume: 4500.00
    },

    addTransaction: (transaction) => set((state) => ({
        transactions: [transaction, ...state.transactions].slice(0, 1000), // Keep last 1000
        stats: {
            ...state.stats,
            totalSpend: state.stats.totalSpend + (transaction.status === 'approved' ? transaction.amount : 0),
            dailyVolume: state.stats.dailyVolume + (transaction.status === 'approved' ? transaction.amount : 0)
        }
    })),

    updateStats: (newStats) => set((state) => ({
        stats: { ...state.stats, ...newStats }
    })),

    setInitialData: (transactions, stats) => set({ transactions, stats })
}));
