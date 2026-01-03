"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, AlertOctagon, Zap, PauseCircle } from "lucide-react";
import { formatCurrency } from "@/lib/types/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Agent {
    id: string;
    name: string;
    client?: { id: string; name: string };
    monthly_budget_cents: bigint;
    current_spend_cents: bigint;
    is_active: boolean;
    last_active?: string; // e.g. "2m ago"
}

export function AgentTable({ agents }: { agents: Agent[] }) {
    const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
    const [optimisticAgents, setOptimisticAgents] = useState<Agent[]>(agents);
    const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
    const router = useRouter();

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!agents.length) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setFocusedRowIndex(prev => Math.min(prev + 1, agents.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setFocusedRowIndex(prev => Math.max(prev - 1, 0));
                    break;
                case ' ':
                    e.preventDefault();
                    if (focusedRowIndex >= 0 && focusedRowIndex < agents.length) {
                        toggleSelection(agents[focusedRowIndex]!.id);
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (focusedRowIndex >= 0 && focusedRowIndex < agents.length) {
                        router.push(`/dashboard/agents/${agents[focusedRowIndex]!.id}`);
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agents, focusedRowIndex, router]);

    // Toggle selection
    const toggleSelection = useCallback((id: string) => {
        const newSet = new Set(selectedAgents);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedAgents(newSet);
    }, [selectedAgents]);

    // Select all
    const toggleSelectAll = () => {
        if (selectedAgents.size === agents.length) {
            setSelectedAgents(new Set());
        } else {
            setSelectedAgents(new Set(agents.map(a => a.id)));
        }
    };

    // Toggle Active Status
    const toggleAgentStatus = async (id: string, currentState: boolean) => {
        // Optimistic update
        setOptimisticAgents(prev =>
            prev.map(a => a.id === id ? { ...a, is_active: !currentState } : a)
        );

        try {
            // Call API to update (placeholder)
            // await updateAgentStatus(id, !currentState);
            router.refresh(); // Revalidate server data
        } catch (err) {
            // Revert on error
            setOptimisticAgents(prev =>
                prev.map(a => a.id === id ? { ...a, is_active: currentState } : a)
            );
            console.error(err);
        }
    };

    // Bulk Panic Stop
    const handlePanicStop = async () => {
        // Optimistic update all selected to inactive
        setOptimisticAgents(prev =>
            prev.map(a => selectedAgents.has(a.id) ? { ...a, is_active: false } : a)
        );
        setSelectedAgents(new Set());
    };

    return (
        <div className="relative">
            {/* Bulk Action Bar - Sticky/Floating */}
            {selectedAgents.size > 0 && (
                <div className="absolute -top-16 left-0 right-0 z-20 animate-in slide-in-from-top duration-200">
                    <Card variant="alert" className="flex items-center justify-between p-3 rounded-xl border-destructive/20 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
                                {selectedAgents.size} Selected
                            </span>
                            <span className="text-destructive-foreground/80 text-sm font-medium">
                                Override control systems ready.
                            </span>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handlePanicStop}
                            className="text-xs font-bold shadow-lg"
                        >
                            <AlertOctagon className="w-3.5 h-3.5" />
                            PANIC STOP
                        </Button>
                    </Card>
                </div>
            )}

            {/* Table */}
            <Card variant="default"  className="overflow-hidden">
                <Table>
                    <TableHeader className="bg-secondary/30">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="w-12 text-center p-4">
                                <input
                                    type="checkbox"
                                    aria-label="Select all agents"
                                    aria-checked={selectedAgents.size === agents.length && agents.length > 0}
                                    className="rounded border-border bg-secondary text-primary focus:ring-primary/20 accent-primary size-4"
                                    checked={selectedAgents.size === agents.length && agents.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Agent</TableHead>
                            <TableHead className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                            <TableHead className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Velocity</TableHead>
                            <TableHead className="p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground w-1/3">Budget Utilization</TableHead>
                            <TableHead className="p-4 text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {optimisticAgents.map((agent, index) => (
                            <Row
                                key={agent.id}
                                agent={agent}
                                isSelected={selectedAgents.has(agent.id)}
                                isFocused={index === focusedRowIndex}
                                onToggleSelect={() => toggleSelection(agent.id)}
                                onToggleStatus={() => toggleAgentStatus(agent.id, agent.is_active)}
                                router={router}
                            />
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

// Add router to Row component props
function Row({ agent, isSelected, isFocused, onToggleSelect, onToggleStatus, router }: {
    agent: Agent;
    isSelected: boolean;
    isFocused: boolean;
    onToggleSelect: () => void;
    onToggleStatus: () => void;
    router: ReturnType<typeof useRouter>;
}) {
    // Generate deterministic avatar color (using proper tailwind classes)
    const avatarColor = getAvatarColor(agent.name);

    // Calculate Budget
    const percent = agent.monthly_budget_cents > 0n
        ? Number((agent.current_spend_cents * 100n) / agent.monthly_budget_cents)
        : 0;

    // Status Color
    const isCrisis = percent > 90;
    const isWarning = percent > 75;

    // Generate random sparkline data once per agent
    const sparklineData = useMemo(() => Array.from({ length: 12 }, () => Math.floor(Math.random() * 80) + 20), []);

    const handleRowClick = (e: React.MouseEvent) => {
        // Prevent navigation if clicking interactive elements
        const target = e.target as HTMLElement;
        if (
            target.closest('input') ||
            target.closest('button') ||
            target.closest('a')
        ) return;

        router.push(`/dashboard/agents/${agent.id}`);
    };

    return (
        <TableRow
            onClick={handleRowClick}
            className={cn(
                "group cursor-pointer border-border transition-colors hover:bg-white/5",
                isSelected && "bg-primary/5 hover:bg-primary/10",
                isFocused && "bg-white/5 ring-1 ring-inset ring-primary/20"
            )}
        >
            <TableCell className="p-4 text-center w-12">
                <input
                    type="checkbox"
                    aria-label={`Select ${agent.name}`}
                    checked={isSelected}
                    onChange={onToggleSelect}
                    className="rounded border-border bg-secondary text-primary focus:ring-primary/20 accent-primary size-4 opacity-40 group-hover:opacity-100 transition-opacity"
                />
            </TableCell>
            <TableCell className="p-4">
                <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-foreground transition-all group-hover:scale-105", avatarColor)}>
                        {agent.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div className="block text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {agent.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {agent.client?.name || "Internal"}
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="p-4">
                <Button variant="outline" size="sm" onClick={onToggleStatus} className={cn("h-7 px-2 gap-2 text-xs font-mono backdrop-blur-none border-border/50", agent.is_active ? "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-muted-foreground hover:text-foreground")}>
                    {agent.is_active ? (
                        <>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Active
                        </>
                    ) : (
                        <>
                            <PauseCircle className="w-3.5 h-3.5" />
                            Paused
                        </>
                    )}
                </Button>
            </TableCell>
            <TableCell className="p-4 hidden sm:table-cell">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Zap className="w-3 h-3 text-gold" />
                        ${((Math.random() * 5) + 0.1).toFixed(2)}/m
                    </div>
                    {/* Tiny Sparkline */}
                    <div className="flex items-end gap-[1px] h-4 w-20 opacity-30 group-hover:opacity-60 transition-opacity">
                        {sparklineData.map((h, i) => (
                            <div key={i} className="w-1.5 bg-primary/50 rounded-t-[1px]" style={{ height: `${h}%` }} />
                        ))}
                    </div>
                </div>
            </TableCell>
            <TableCell className="p-4 w-1/3">
                <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground">{formatCurrency(agent.current_spend_cents)}</span>
                        <span className={cn("font-medium", isCrisis ? "text-destructive" : isWarning ? "text-orange-500" : "text-emerald-500")}>
                            {percent}%
                        </span>
                    </div>
                    {/* Budget Bar */}
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,0,0,0.3)]",
                                isCrisis ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]" :
                                    isWarning ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" :
                                        "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                            )}
                            style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                    </div>
                </div>
            </TableCell>
            <TableCell className="p-4 text-right">
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
            </TableCell>
        </TableRow>
    );
}

function getAvatarColor(name: string) {
    // Array of tailwind class strings for backgrounds
    const colors = [
        "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20",
        "bg-purple-500/10 text-purple-500 border border-purple-500/20",
        "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
        "bg-amber-500/10 text-amber-500 border border-amber-500/20",
        "bg-pink-500/10 text-pink-500 border border-pink-500/20"
    ];
    return colors[name.length % colors.length];
}
