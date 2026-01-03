'use client';

/**
 * COCKPIT WRAPPER
 * =============================================================================
 * Client wrapper that initializes real-time subscriptions
 * and passes context to CockpitView
 * =============================================================================
 */

import { useEffect } from 'react';
import { useDashboardStore, DashboardStats } from '@/store/dashboard-store';
import { useRealtimeTransactions } from '@/lib/hooks/use-realtime-transactions';
import CockpitView from './view';

interface Props {
    organizationId: string | null;
    initialStats: DashboardStats;
}

export default function CockpitViewWrapper({ organizationId, initialStats }: Props) {
    const updateStats = useDashboardStore((state) => state.updateStats);

    // Initialize stats from server
    useEffect(() => {
        updateStats(initialStats);
    }, [initialStats, updateStats]);

    // Connect to real-time updates
    useRealtimeTransactions({
        organizationId,
        enabled: !!organizationId,
    });

    return <CockpitView />;
}
