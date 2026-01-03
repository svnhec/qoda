'use client';

/**
 * AGENT DETAIL VIEW
 * =============================================================================
 * Full agent control panel with:
 * - Virtual card management
 * - Spend charts and metrics
 * - Activity log stream
 * - Agent controls (pause/resume/kill)
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createBrowserClient } from '@supabase/ssr';
import { HoverProvider } from '@/components/dashboard/agent-detail/hover-context';
import { AgentSpendChart } from '@/components/dashboard/agent-detail/agent-spend-chart';
import { LogStream } from '@/components/dashboard/agent-detail/log-stream';
import { VirtualCardPanel } from '@/components/dashboard/agent-detail/virtual-card-panel';
import { CardIssuanceModal } from '@/components/dashboard/agent-detail/card-issuance-modal';
import {
    Play,
    Pause,
    Power,
    CreditCard,
    Settings,
    AlertTriangle,
    Loader2,
    ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface Agent {
    id: string;
    name: string;
    is_active: boolean;
    status: 'green' | 'yellow' | 'red';
    stripe_card_id: string | null;
    monthly_budget_cents: string;
    current_spend_cents: string;
}

export default function AgentDetailView({ agentId }: { agentId: string }) {
    const [agent, setAgent] = useState<Agent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);

    // Fetch agent data
    useEffect(() => {
        const fetchAgent = async () => {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data, error } = await supabase
                .from('agents')
                .select('id, name, is_active, status, stripe_card_id, monthly_budget_cents, current_spend_cents')
                .eq('id', agentId)
                .single();

            if (data && !error) {
                setAgent(data);
                setIsPaused(!data.is_active);
            }
            setIsLoading(false);
        };

        fetchAgent();
    }, [agentId]);

    const handleTogglePause = async () => {
        if (!agent) return;

        const newState = !isPaused; // true if pausing, false if resuming
        setIsPaused(newState); // Optimistic UI update

        try {
            // 1. Call API to freeze/unfreeze card if it exists
            if (agent.stripe_card_id) {
                await fetch(`/api/agents/${agentId}/card-update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'set_status',
                        value: newState ? 'inactive' : 'active'
                    })
                });
            }

            // 2. Update Agent active state in DB
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            await supabase
                .from('agents')
                .update({ is_active: !newState })
                .eq('id', agentId);

        } catch (error) {
            console.error("Failed to toggle pause", error);
            setIsPaused(!newState); // Revert optimistic update
        }
    };

    const refreshAgent = async () => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data } = await supabase
            .from('agents')
            .select('id, name, is_active, status, stripe_card_id, monthly_budget_cents, current_spend_cents')
            .eq('id', agentId)
            .single();

        if (data) setAgent(data);
    };

    const formatCurrency = (cents: string | number) => {
        const value = Number(cents) / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(value);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (!agent) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
                <AlertTriangle className="w-12 h-12 text-warning" />
                <h2 className="text-xl font-bold text-foreground">Agent Not Found</h2>
                <Link href="/dashboard/agents" className="btn-secondary">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Agents
                </Link>
            </div>
        );
    }

    const budgetUsage = agent.monthly_budget_cents
        ? (Number(agent.current_spend_cents) / Number(agent.monthly_budget_cents)) * 100
        : 0;

    return (
        <HoverProvider>
            <div className="h-[calc(100vh-64px)] bg-background text-foreground flex flex-col overflow-hidden">
                {/* Top Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/agents"
                            className="p-2 -ml-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className={`w-3 h-3 rounded-full ${isPaused
                            ? 'bg-destructive'
                            : agent.status === 'red'
                                ? 'bg-destructive animate-pulse'
                                : agent.status === 'yellow'
                                    ? 'bg-warning animate-pulse'
                                    : 'bg-accent animate-pulse'
                            }`} />
                        <div>
                            <h1 className="text-xl font-bold">{agent.name}</h1>
                            <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                                <span>ID: {agent.id.substring(0, 8)}</span>
                                <span>•</span>
                                <span className={isPaused ? 'text-destructive' : 'text-accent'}>
                                    {isPaused ? 'PAUSED' : 'ACTIVE'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!agent.stripe_card_id && (
                            <button
                                onClick={() => setIsCardModalOpen(true)}
                                className="btn-primary"
                            >
                                <CreditCard className="w-4 h-4" />
                                Issue Card
                            </button>
                        )}
                        <button
                            onClick={handleTogglePause}
                            className={`btn-secondary ${isPaused ? 'border-accent text-accent' : ''}`}
                        >
                            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            {isPaused ? 'Resume Agent' : 'Pause Agent'}
                        </button>
                        <Link href={`/dashboard/agents/${agentId}/settings`} className="btn-ghost">
                            <Settings className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Main Split Layout */}
                <div className="flex-1 grid grid-cols-12 gap-0 min-h-0">
                    {/* Left Panel: Financials */}
                    <div className="col-span-4 border-r border-border flex flex-col p-6 gap-6 overflow-y-auto">
                        {/* Card */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-mono uppercase text-muted-foreground">
                                    Funding Source
                                </span>
                                {agent.stripe_card_id && (
                                    <span className="text-xs font-mono text-accent">ACTIVE</span>
                                )}
                            </div>
                            {agent.stripe_card_id ? (
                                <VirtualCardPanel isActive={!isPaused} />
                            ) : (
                                <button
                                    onClick={() => setIsCardModalOpen(true)}
                                    className="w-full aspect-[1.586/1] rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-3 transition-colors group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                        <CreditCard className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-foreground">No Card Issued</p>
                                        <p className="text-xs text-muted-foreground mt-1">Click to issue a virtual card</p>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="card-hover p-4">
                                <div className="metric-label mb-1">Current Spend</div>
                                <div className="text-xl font-mono text-foreground">
                                    {formatCurrency(agent.current_spend_cents)}
                                </div>
                            </div>
                            <div className="card-hover p-4">
                                <div className="metric-label mb-1">Budget</div>
                                <div className="text-xl font-mono text-foreground">
                                    {formatCurrency(agent.monthly_budget_cents)}
                                </div>
                            </div>
                        </div>

                        {/* Budget Usage */}
                        <div className="card-hover p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="metric-label">Budget Usage</span>
                                <span className={`text-sm font-mono ${budgetUsage > 90 ? 'text-destructive'
                                    : budgetUsage > 70 ? 'text-warning'
                                        : 'text-accent'
                                    }`}>
                                    {budgetUsage.toFixed(1)}%
                                </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, budgetUsage)}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className={`h-full ${budgetUsage > 90 ? 'bg-destructive'
                                        : budgetUsage > 70 ? 'bg-warning'
                                            : 'bg-accent'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="flex-1 min-h-[250px] relative">
                            <AgentSpendChart />

                            {/* Dormant Overlay */}
                            {isPaused && (
                                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl">
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3 text-destructive">
                                            <Power className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-foreground">Agent Paused</h3>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                                            Financial activity suspended
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Logs */}
                    <div className="col-span-8 bg-secondary p-4 flex flex-col min-h-0">
                        <LogStream />
                    </div>
                </div>
            </div>

            {/* Card Issuance Modal */}
            <CardIssuanceModal
                isOpen={isCardModalOpen}
                onClose={() => setIsCardModalOpen(false)}
                agentId={agent.id}
                agentName={agent.name}
                defaultBudget={Number(agent.monthly_budget_cents) || 200000}
                onSuccess={refreshAgent}
            />
        </HoverProvider>
    );
}
