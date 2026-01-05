'use client';

/**
 * USE REALTIME TRANSACTIONS
 * =============================================================================
 * Hook for subscribing to real-time transaction updates from Supabase
 * =============================================================================
 */

import { useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useDashboardStore, type Transaction, type DashboardState } from '@/store/dashboard-store';

interface RealtimeConfig {
    organizationId: string | null;
    enabled?: boolean;
}

export function useRealtimeTransactions({ organizationId, enabled = true }: RealtimeConfig) {
    const addTransaction = useDashboardStore((state: DashboardState) => state.addTransaction);
    const updateStats = useDashboardStore((state: DashboardState) => state.updateStats);
    const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null);

    const handleInsert = useCallback((payload: { new: Record<string, unknown> }) => {
        const record = payload.new;

        // Map database record to Transaction type
        const transaction: Transaction = {
            id: String(record.id || `tx_${Date.now()}`),
            agentName: String(record.agent_name || 'Unknown Agent'),
            amountCents: BigInt(String(record.amount_cents || 0)),
            merchant: String(record.merchant_name || 'Unknown Merchant'),
            status: (record.status as 'approved' | 'declined' | 'pending') || 'pending',
            timestamp: String(record.created_at || new Date().toISOString()),
            category: String(record.category || 'Other'),
        };

        addTransaction(transaction);
    }, [addTransaction]);

    useEffect(() => {
        if (!enabled || !organizationId) return;

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Subscribe to transaction_settlements table
        const channel = supabase
            .channel(`transactions:${organizationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'transaction_settlements',
                    filter: `organization_id=eq.${organizationId}`,
                },
                handleInsert
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // eslint-disable-next-line no-console
                    console.warn('[Realtime] Connected to transaction feed');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('[Realtime] Channel error');
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [organizationId, enabled, handleInsert]);

    // Fetch initial data
    useEffect(() => {
        if (!organizationId) return;

        const fetchInitialData = async () => {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Fetch recent transactions
            const { data: transactions } = await supabase
                .from('transaction_settlements')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (transactions) {
                transactions.reverse().forEach((record) => {
                    const transaction: Transaction = {
                        id: record.id,
                        agentName: record.agent_name || 'Unknown Agent',
                        amountCents: BigInt(String(record.amount_cents || 0)),
                        merchant: record.merchant_name || 'Unknown Merchant',
                        status: record.status || 'pending',
                        timestamp: record.created_at,
                        category: record.category || 'Other',
                    };
                    addTransaction(transaction);
                });
            }

            // Fetch agent stats
            const { data: agents } = await supabase
                .from('agents')
                .select('is_active, current_spend_cents')
                .eq('organization_id', organizationId);

            if (agents) {
                const activeAgents = agents.filter((a) => a.is_active).length;
                const totalSpendCents = agents.reduce((sum, a) => sum + BigInt(a.current_spend_cents || 0), 0n);
                const totalSpend = Number(totalSpendCents) / 100; // Convert to dollars for display

                updateStats({
                    activeAgents,
                    totalSpend,
                });
            }
        };

        fetchInitialData();
    }, [organizationId, addTransaction, updateStats]);
}
