"use client";

import { useState } from "react";
import {
    Building2,
    ArrowUpRight,
    Plus,
    RefreshCw,
    ShieldCheck,
    Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/types/currency";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

interface BankingInterfaceProps {
    stripeAccountId: string;
}

export function BankingInterface({ stripeAccountId }: BankingInterfaceProps) {
    const [balance] = useState<bigint>(1245000n); // $12,450.00
    const [isAutoTopUp, setIsAutoTopUp] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Mock History Data for Chart
    const data = [
        { name: "Mon", balance: 10000 },
        { name: "Tue", balance: 12000 },
        { name: "Wed", balance: 8500 },
        { name: "Thu", balance: 15000 },
        { name: "Fri", balance: 12450 },
        { name: "Sat", balance: 11000 },
        { name: "Sun", balance: 12450 },
    ];

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1500);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Top Section: Balance & Main Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Balance Card ("Vault" Mood) */}
                <div className="md:col-span-2 p-8 rounded-2xl bg-gradient-to-br from-[#1a1f36] to-[#0a0a0a] border border-[#3c4257] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Building2 className="w-32 h-32 text-white" />
                    </div>

                    <div className="relative z-10 flex flex-col justify-between h-full gap-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-sm font-medium text-[#aab7c4] uppercase tracking-wide flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    Issuing Balance
                                </h2>
                                <div className="mt-2 text-5xl font-mono font-bold text-white tracking-tighter">
                                    {formatCurrency(balance)}
                                </div>
                                <div className="mt-1 text-sm text-[#aab7c4]">
                                    Available for spending
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                    className="bg-white/5 border-white/10 text-white/70 hover:text-white"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button className="bg-[#635bff] hover:bg-[#5851d8] text-white font-medium px-6 shadow-lg shadow-[#635bff]/20 border border-white/10">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Funds
                            </Button>
                            <Button variant="outline" className="bg-transparent border-[#3c4257] text-white/80 hover:bg-white/5 hover:text-white">
                                <Landmark className="w-4 h-4 mr-2" />
                                Payout to Bank
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Status & Auto-Top-Up */}
                <div className="flex flex-col gap-6">

                    {/* Connection Status */}
                    <div className="p-6 rounded-xl bg-[#0a0a0a] border border-emerald-500/20 shadow-lg flex flex-col justify-between flex-1">
                        <div>
                            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Stripe Connection</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                </div>
                                <div>
                                    <div className="text-white font-bold">Operational</div>
                                    <div className="text-xs text-white/40 font-mono">{stripeAccountId}</div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-emerald-400">
                            <ShieldCheck className="w-3 h-3" />
                            KYC Verified
                        </div>
                    </div>

                    {/* Auto Top-up */}
                    <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/10 shadow-lg flex flex-col justify-between flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Auto Top-Up</h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={isAutoTopUp} onChange={(e) => setIsAutoTopUp(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#635bff]"></div>
                            </label>
                        </div>
                        <div className="text-sm text-white/80">
                            {isAutoTopUp ? (
                                <>
                                    Automatically add <b>$5,000</b> when balance drops below <b>$1,000</b>.
                                </>
                            ) : (
                                <span className="text-white/40">Auto top-up is disabled.</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance History Chart */}
            <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 h-[300px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4" /> 7-Day Balance History
                    </h3>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#635bff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#635bff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1a1f36", border: "1px solid #3c4257", borderRadius: "8px", color: "#fff" }}
                                itemStyle={{ color: "#fff" }}
                                formatter={(value: number | undefined) => [`$${(value || 0)}`, "Balance"]}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#635bff"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Payouts / Funding (Simple List) */}
            <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4 border-b border-white/10 pb-4">Recent Funding Events</h3>
                <div className="space-y-1">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded text-emerald-500">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">Top-up from Bank Account</div>
                                    <div className="text-xs text-white/40">Chase ••8842</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-mono font-bold text-white">+$5,000.00</div>
                                <div className="text-xs text-white/40">Oct {10 + i}, 2024</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
