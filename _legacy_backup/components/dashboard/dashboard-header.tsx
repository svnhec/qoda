/**
 * Dashboard Header Component
 * =============================================================================
 * Client-side header with alert bell and real-time notifications.
 * =============================================================================
 */

"use client";

import { useMemo } from "react";
import { AlertBell, useSpendAlerts } from "@/components/dashboard/spend-alerts";

interface DashboardHeaderProps {
    userName: string;
    userEmail: string;
    orgName: string;
}

export function DashboardHeader({ userName, userEmail, orgName }: DashboardHeaderProps) {
    // Mock agent data - in production, this would come from real-time API/websocket
    const mockAgents = useMemo(() => [
        {
            id: 'agent_1',
            name: 'Email Outreach Bot',
            monthlyBudgetCents: 100000n,
            currentSpendCents: 85000n,
            currentVelocityCentsPerMinute: 50n,
            status: 'green' as const,
        },
        {
            id: 'agent_2',
            name: 'Data Enrichment Agent',
            monthlyBudgetCents: 50000n,
            currentSpendCents: 12000n,
            currentVelocityCentsPerMinute: 10n,
            status: 'green' as const,
        },
        {
            id: 'agent_3',
            name: 'Research Assistant',
            monthlyBudgetCents: 75000n,
            currentSpendCents: 78000n,
            currentVelocityCentsPerMinute: 100n,
            status: 'yellow' as const,
        },
    ], []);

    const { alerts, dismissAlert, clearAllAlerts } = useSpendAlerts(mockAgents);

    return (
        <div className="h-16 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-white">
                    {orgName}
                </h2>
            </div>

            <div className="flex items-center gap-4">
                {/* Alert Bell */}
                <AlertBell
                    alerts={alerts}
                    onDismiss={dismissAlert}
                    onClearAll={clearAllAlerts}
                />

                {/* User Info */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                            {userName?.[0]?.toUpperCase() || userEmail?.[0]?.toUpperCase()}
                        </span>
                    </div>
                    <div className="hidden md:block">
                        <p className="text-sm font-medium text-white">{userName || "User"}</p>
                        <p className="text-xs text-white/40">{userEmail}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
