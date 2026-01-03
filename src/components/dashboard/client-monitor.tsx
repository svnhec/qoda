"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/types/currency";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskAttributionChart } from "@/components/dashboard/task-attribution";

interface Client {
    id: string;
    name: string;
    contact_email?: string | null;
    created_at: string;
}

interface Agent {
    id: string;
    name: string;
    is_active: boolean;
    current_spend_cents: bigint;
}

export function ClientMonitor({
    client,
    agents
}: {
    client: Client;
    agents: Agent[]
}) {
    const [markupRate, setMarkupRate] = useState(20); // Default 20%

    // Generate simulated monthly data based on current markup
    const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
    const chartData = months.map(m => {
        const cost = Math.floor(Math.random() * 1500) + 500;
        const profit = Math.floor(cost * (markupRate / 100));
        return {
            name: m,
            Cost: cost,
            Profit: profit,
        };
    });

    const totalSpend = agents.reduce((sum, a) => sum + a.current_spend_cents, 0n);
    const estimatedProfit = (totalSpend * BigInt(markupRate)) / 100n;

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header / Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Client Identity & Billing Status */}
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/10 flex flex-col justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">{client.name}</h1>
                        <div className="text-sm text-white/40">{client.contact_email || "No contact info"}</div>
                    </div>

                    <div className="mt-6 flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm font-medium text-emerald-400">Autopay Active</span>
                        </div>
                        <span className="text-xs text-emerald-500/60">Visa ••4242</span>
                    </div>
                </div>

                {/* 2. Profit Calculator Widget */}
                <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 flex flex-col relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-50" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-emerald-300 uppercase tracking-wider">Gross Margin Control</h3>
                            <span className="text-3xl font-bold text-emerald-400">{markupRate}%</span>
                        </div>

                        <div className="flex-1 flex flex-col justify-center gap-4">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={markupRate}
                                onChange={(e) => setMarkupRate(Number(e.target.value))}
                                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
                            />
                            <div className="flex justify-between text-xs text-white/30">
                                <span>Cost (0%)</span>
                                <span>Doubled (100%)</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-emerald-500/20 flex justify-between items-center text-sm">
                            <span className="text-emerald-200/80">Est. Monthly Profit:</span>
                            <span className="font-mono text-emerald-400 font-bold text-lg">
                                {formatCurrency(estimatedProfit || 0n)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Next Bill Info */}
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/10 flex flex-col justify-center items-center text-center">
                    <span className="text-white/40 text-sm mb-2">Next Invoice (Nov 1st)</span>
                    <div className="text-4xl font-bold text-white tracking-tighter mb-1">
                        $4,520
                    </div>
                    <div className="text-xs text-white/30 mb-4">Includes ${Math.floor(4520 * (markupRate / 100))} profit</div>
                    <Button variant="outline" size="sm" className="text-xs h-7 border-white/10 text-white/60 hover:text-white">
                        <Download className="w-3 h-3 mr-2" />
                        Download Draft
                    </Button>
                </div>
            </div>

            {/* Middle Row: Chart & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">

                {/* Profit Chart */}
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/10 overflow-hidden flex flex-col">
                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-6">Cost of Goods Sold vs. Revenue</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                                    contentStyle={{
                                        backgroundColor: "#111",
                                        border: "1px solid #333",
                                        borderRadius: "8px",
                                        color: "#fff"
                                    }}
                                    formatter={(value: number | undefined, name: string | undefined) => {
                                        if (name === "Cost") return [`$${(value || 0)}`, "Agent Spend (COGS)"];
                                        if (name === "Profit") return [`$${(value || 0)}`, "Your Profit"];
                                        return [`$${(value || 0)}`, name || ""];
                                    }}
                                    labelFormatter={(label) => `${label} 2024`}
                                />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    formatter={(value) => {
                                        if (value === "Cost") return "Agent Spend (COGS)";
                                        if (value === "Profit") return "Your Profit";
                                        return value;
                                    }}
                                />
                                <Bar dataKey="Cost" stackId="a" fill="#64748b" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="Profit" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1000} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Invoices & Agents - Tabbed View Concept (Collapsed for MVP) */}
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/10 flex flex-col gap-6">
                    {/* Agent Fleet Status */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Agent Fleet</h3>
                            <Link href={`/dashboard/agents/new?client_id=${client.id}`} className="text-xs text-purple-400 hover:text-purple-300 flex items-center">
                                Deploy New <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                            {agents.map(agent => (
                                <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${agent.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                                        <span className="text-sm font-medium text-white">{agent.name}</span>
                                    </div>
                                    <span className="text-xs font-mono text-white/60">{formatCurrency(agent.current_spend_cents)}</span>
                                </div>
                            ))}
                            {agents.length === 0 && (
                                <div className="text-center py-8 text-white/30 text-sm border border-dashed border-white/10 rounded-lg">
                                    No agents deployed.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Invoice History */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4 pt-4 border-t border-white/10">Invoice History</h3>
                        <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                            {[
                                { id: "INV-2024-011", date: "Oct 15, 2024", status: "Paid", amount: 3240.00, profit: 648.00 },
                                { id: "INV-2024-010", date: "Sep 15, 2024", status: "Paid", amount: 2890.00, profit: 578.00 },
                                { id: "INV-2024-009", date: "Aug 15, 2024", status: "Pending", amount: 4120.00, profit: 824.00 },
                            ].map(invoice => (
                                <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors group cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${invoice.status === 'Paid' ? 'bg-emerald-500' :
                                            invoice.status === 'Pending' ? 'bg-amber-500' : 'bg-red-500'
                                            }`} />
                                        <div>
                                            <div className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                                                {invoice.id}
                                            </div>
                                            <div className="text-xs text-white/40">{invoice.date}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-sm font-mono text-white/80">${invoice.amount.toFixed(2)}</div>
                                            <div className="text-xs text-emerald-400">+${invoice.profit.toFixed(2)} profit</div>
                                        </div>
                                        <button className="p-2 rounded bg-white/5 text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors opacity-0 group-hover:opacity-100">
                                            <Download className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Task Attribution Section */}
            <div className="shrink-0">
                <TaskAttributionChart
                    data={[
                        {
                            taskCategory: 'email_outreach',
                            taskName: 'Q1 Email Campaign',
                            totalSpendCents: 125000n,
                            transactionCount: 47,
                            percentage: 35,
                        },
                        {
                            taskCategory: 'data_enrichment',
                            taskName: 'Lead Enrichment',
                            totalSpendCents: 85000n,
                            transactionCount: 23,
                            percentage: 24,
                        },
                        {
                            taskCategory: 'research',
                            taskName: 'Market Research - Tech',
                            totalSpendCents: 65000n,
                            transactionCount: 18,
                            percentage: 18,
                        },
                        {
                            taskCategory: 'content_creation',
                            taskName: 'Blog Content',
                            totalSpendCents: 45000n,
                            transactionCount: 12,
                            percentage: 13,
                        },
                        {
                            taskCategory: 'unattributed',
                            taskName: 'Unattributed',
                            totalSpendCents: 35000n,
                            transactionCount: 15,
                            percentage: 10,
                        },
                    ]}
                    totalSpendCents={totalSpend}
                    clientName={client.name}
                    periodLabel="November 2024"
                />
            </div>
        </div>
    );
}
