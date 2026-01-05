"use client";

import { useState, useRef } from "react";
import { LiveLogTerminal } from "./live-log-terminal";
import { CreditCard, Tag, Power, Edit3, AlertCircle, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/types/currency";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface Agent {
    id: string;
    name: string;
    description?: string | null;
    monthly_budget_cents: bigint;
    current_spend_cents: bigint;
    is_active: boolean;
}

interface VirtualCard {
    id: string;
    last4: string;
    brand: string;
    is_active: boolean;
}

// Mock data with correlation timestamps
const SPEND_DATA = [
    { time: "00:00", value: 0, tokens: 0, timestamp: "2024-01-01T00:00:00Z" },
    { time: "04:00", value: 120, tokens: 2400, timestamp: "2024-01-01T04:00:00Z" },
    { time: "08:00", value: 340, tokens: 6800, timestamp: "2024-01-01T08:00:00Z" },
    { time: "12:00", value: 890, tokens: 17800, timestamp: "2024-01-01T12:00:00Z" },
    { time: "16:00", value: 1200, tokens: 24000, timestamp: "2024-01-01T16:00:00Z" },
    { time: "20:00", value: 2100, tokens: 42000, timestamp: "2024-01-01T20:00:00Z" },
    { time: "23:59", value: 2400, tokens: 48000, timestamp: "2024-01-01T23:59:00Z" },
];

const RECENT_ERRORS = [
    { time: "2m ago", code: "429", message: "Rate limit exceeded", merchant: "OpenAI API" },
    { time: "5m ago", code: "500", message: "Internal server error", merchant: "AWS Lambda" },
    { time: "12m ago", code: "429", message: "Too many requests", merchant: "SendGrid" },
];

const MERCHANT_CATEGORIES = ["SaaS", "Cloud Services", "AI/ML", "API Services"];

export function AgentMonitor({
    agent: initialAgent,
    cards
}: {
    agent: Agent;
    cards: VirtualCard[];
}) {
    const [agent, setAgent] = useState(initialAgent);
    const [hoveredTimestamp, setHoveredTimestamp] = useState<string | null>(null);
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [budgetInput, setBudgetInput] = useState(formatCurrency(agent.monthly_budget_cents));
    const chartRef = useRef<HTMLDivElement>(null);

    const toggleStatus = () => {
        setAgent(prev => ({ ...prev, is_active: !prev.is_active }));
        // API call would go here
    };

    const handleBudgetEdit = () => {
        setIsEditingBudget(true);
        setBudgetInput(formatCurrency(agent.monthly_budget_cents));
    };

    const saveBudgetEdit = () => {
        // Parse and save new budget
        const newBudget = parseFloat(budgetInput.replace(/[$,]/g, '')) * 100;
        setAgent(prev => ({ ...prev, monthly_budget_cents: BigInt(newBudget) }));
        setIsEditingBudget(false);
        // API call would go here
    };

    const cancelBudgetEdit = () => {
        setIsEditingBudget(false);
        setBudgetInput(formatCurrency(agent.monthly_budget_cents));
    };

    const percentage = agent.monthly_budget_cents > 0n
        ? Number((agent.current_spend_cents * 100n) / agent.monthly_budget_cents)
        : 0;

    // Generate deterministic card gradient
    const cardGradient = "from-purple-500 to-indigo-600";

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
            {/* Left Column - Financial Intelligence */}
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 no-scrollbar">

                {/* Identity & Status Header */}
                <div className="flex items-start justify-between p-6 rounded-xl bg-[#0a0a0a] border border-white/5">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">{agent.name}</h1>
                        <div className="flex items-center gap-2 text-sm text-white/50">
                            <Tag className="w-3 h-3" />
                            <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded">ID: {agent.id.slice(0, 8)}</span>
                            <span>•</span>
                            <span>{agent.description || "No description"}</span>
                        </div>
                    </div>
                    <button
                        onClick={toggleStatus}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border transition-all ${agent.is_active
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-red-500 hover:border-red-500 hover:text-white group"
                            : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white group"
                            }`}
                    >
                        <Power className="w-4 h-4" />
                        <span className="group-hover:hidden">{agent.is_active ? "Operational" : "Offline"}</span>
                        <span className="hidden group-hover:inline">{agent.is_active ? "KILL SWITCH" : "ACTIVATE"}</span>
                    </button>
                </div>

                {/* Spend Velocity Chart */}
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/5 h-[300px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white">Spend Velocity</h3>
                        <div className="text-sm font-mono text-purple-400">
                            Current: $4.20/min
                        </div>
                    </div>
                    <div ref={chartRef} className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={SPEND_DATA}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onMouseMove={(e: any) => {
                                    if (e?.activePayload?.[0]?.payload) {
                                        setHoveredTimestamp(e.activePayload[0].payload.timestamp);
                                    }
                                }}
                                onMouseLeave={() => setHoveredTimestamp(null)}
                            >
                                <defs>
                                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="time" stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                                    itemStyle={{ color: "#fff" }}
                                    formatter={(value: number | undefined, name: string | undefined) => {
                                        if (name === "value") return [`$${value || 0}`, "Spend"];
                                        if (name === "tokens") return [`${(value || 0).toLocaleString()}`, "Tokens/sec"];
                                        return [value || 0, name || ""];
                                    }}
                                    labelFormatter={(label) => `Time: ${label}`}
                                />
                                <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                        {/* Correlation indicator */}
                        {hoveredTimestamp && (
                            <div className="absolute top-2 right-2 bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-mono">
                                Correlating logs...
                            </div>
                        )}
                    </div>
                </div>

                {/* Tokens/Sec Chart */}
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/5 h-[200px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Tokens/Sec
                        </h3>
                        <div className="text-sm font-mono text-cyan-400">
                            Peak: 48,000/sec
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={SPEND_DATA}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="time" stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                                    formatter={(value: number | undefined) => [`${(value || 0).toLocaleString()}`, "Tokens/sec"]}
                                />
                                <Line type="monotone" dataKey="tokens" stroke="#06b6d4" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Merchant Categories & Recent Errors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Merchant Categories */}
                    <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/5">
                        <h3 className="font-semibold text-white mb-4">Allowed Merchant Categories</h3>
                        <div className="flex flex-wrap gap-2">
                            {MERCHANT_CATEGORIES.map((category) => (
                                <span key={category} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20">
                                    {category}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Recent Errors */}
                    <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/5">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Recent Errors
                        </h3>
                        <div className="space-y-3">
                            {RECENT_ERRORS.map((error, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                                    <div className={`w-2 h-2 rounded-full mt-1 ${
                                        error.code === '429' ? 'bg-amber-500' :
                                        error.code === '500' ? 'bg-red-500' : 'bg-gray-500'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-xs text-white/60">
                                            <span className="font-mono">{error.code}</span>
                                            <span>•</span>
                                            <span>{error.time}</span>
                                        </div>
                                        <div className="text-sm text-white/80 truncate">{error.message}</div>
                                        <div className="text-xs text-white/50">{error.merchant}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Cards & Budget Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Active Card */}
                    <div className="relative group perspective-1000 h-[220px]">
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${cardGradient} p-6 flex flex-col justify-between shadow-2xl transition-transform transform group-hover:scale-[1.02]`}>
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-8 bg-white/20 rounded-md backdrop-blur-sm" />
                                <CreditCard className="text-white/80" />
                            </div>
                            <div className="space-y-4">
                                <div className="font-mono text-xl text-white tracking-widest text-shadow-sm">
                                    •••• •••• •••• {cards[0]?.last4 || "••••"}
                                </div>
                                <div className="flex justify-between items-end text-white/80 text-xs uppercase tracking-wider">
                                    <div>
                                        <div className="opacity-50 mb-0.5">Cardholder</div>
                                        <div>{agent.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="opacity-50 mb-0.5">Expires</div>
                                        <div>12/28</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Budget Utilization */}
                    <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/5 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-white/50 text-sm font-medium uppercase tracking-wider">Monthly Budget</h3>
                                <button
                                    onClick={handleBudgetEdit}
                                    className="p-1 text-white/40 hover:text-white transition-colors"
                                >
                                    <Edit3 className="w-3 h-3" />
                                </button>
                            </div>
                            {isEditingBudget ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={budgetInput}
                                        onChange={(e) => setBudgetInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveBudgetEdit();
                                            if (e.key === 'Escape') cancelBudgetEdit();
                                        }}
                                        className="text-3xl font-bold bg-transparent text-white border-b border-purple-500 focus:outline-none w-32"
                                        autoFocus
                                    />
                                    <button
                                        onClick={saveBudgetEdit}
                                        className="text-emerald-400 hover:text-emerald-300 text-sm"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={cancelBudgetEdit}
                                        className="text-red-400 hover:text-red-300 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="text-3xl font-bold text-white tracking-tight flex items-baseline gap-2 cursor-pointer hover:text-purple-400 transition-colors" onClick={handleBudgetEdit}>
                                    {formatCurrency(agent.monthly_budget_cents)}
                                    <span className="text-sm text-white/30 font-normal">USD</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/70">Used {formatCurrency(agent.current_spend_cents)}</span>
                                <span className={percentage > 90 ? "text-red-400" : "text-emerald-400"}>
                                    {100 - percentage}% Remaining
                                </span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${percentage > 90 ? "bg-red-500" :
                                        percentage > 75 ? "bg-amber-500" :
                                            "bg-emerald-500"
                                        }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Right Column - Operational Detail (Terminal) */}
            <div className={`w-full lg:w-[450px] shrink-0 h-[500px] lg:h-auto transition-opacity duration-300 ${!agent.is_active ? "opacity-50 grayscale pointer-events-none" : ""}`}>
                <LiveLogTerminal
                    agentName={agent.name}
                    isPaused={!agent.is_active}
                    hoveredTimestamp={hoveredTimestamp}
                />
            </div>
        </div>
    );
}
