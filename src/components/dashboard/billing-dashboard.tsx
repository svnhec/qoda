"use client";

import { formatCurrency } from "@/lib/types/currency";
import {
    Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle
} from "recharts";
import { Download, RefreshCw, AlertTriangle, FileText, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillingStats {
    totalRevenue: bigint;
    totalSpend: bigint;
    netProfit: bigint;
    outstandingAmount: bigint;
}

export function BillingDashboard({ stats }: { stats: BillingStats }) {

    // Sankey Data (Mocked but proportional to stats could be better)
    // For visual impact, we use fixed proportions that look good
    const data = {
        nodes: [
            { name: "Client Payments" },
            { name: "Gross Revenue" },
            { name: "Agent Spend (COGS)" },
            { name: "Stripe Fees" },
            { name: "Net Profit" }
        ],
        links: [
            { source: 0, target: 1, value: 10000 },
            { source: 1, target: 2, value: 6000 },
            { source: 1, target: 3, value: 500 },
            { source: 1, target: 4, value: 3500 }
        ]
    };

    // Custom Node for Sankey
    const renderNode = (props: { x: number; y: number; width: number; height: number; index: number; payload: { name: string } }) => {
        const { x, y, width, height, index, payload } = props;
        const isProfit = payload.name === "Net Profit";
        const isCost = payload.name.includes("COGS");

        return (
            <Layer key={`node-${index}`}>
                <Rectangle
                    x={x} y={y} width={width} height={height}
                    fill={isProfit ? "#10b981" : isCost ? "#ef4444" : "#8b5cf6"}
                    fillOpacity={0.8}
                    radius={[4, 4, 4, 4]}
                />
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={10}
                    style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                >

                </text>
                <text
                    x={x < 100 ? x - 10 : x + width + 10}
                    y={y + height / 2}
                    textAnchor={x < 100 ? "end" : "start"}
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={12}
                    fontWeight="bold"
                >
                    {payload.name}
                </text>
            </Layer>
        );
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <div className="w-16 h-16 bg-purple-500 rounded-full blur-2xl" />
                    </div>
                    <div className="text-sm text-white/40 font-medium uppercase tracking-wider mb-1">Gross Revenue</div>
                    <div className="text-3xl font-bold text-white mb-2">{formatCurrency(stats.totalRevenue)}</div>
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>+12.5% vs last month</span>
                    </div>
                </div>

                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/10">
                    <div className="text-sm text-white/40 font-medium uppercase tracking-wider mb-1">COGS (Spend)</div>
                    <div className="text-3xl font-bold text-white mb-2">{formatCurrency(stats.totalSpend)}</div>
                    <div className="text-xs text-white/30">
                        Platform & Agent Costs
                    </div>
                </div>

                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-emerald-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <div className="w-16 h-16 bg-emerald-500 rounded-full blur-2xl" />
                    </div>
                    <div className="text-sm text-emerald-500/60 font-medium uppercase tracking-wider mb-1">Net Profit</div>
                    <div className="text-3xl font-bold text-emerald-400 mb-2">{formatCurrency(stats.netProfit)}</div>
                    <div className="text-xs text-emerald-500/40">
                        ~{Number((stats.netProfit * 100n) / (stats.totalRevenue || 1n))}% Margin
                    </div>
                </div>

                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/10">
                    <div className="text-sm text-white/40 font-medium uppercase tracking-wider mb-1">Outstanding</div>
                    <div className="text-3xl font-bold text-amber-500 mb-2">{formatCurrency(stats.outstandingAmount)}</div>
                    <div className="text-xs text-white/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        3 Invoices Overdue
                    </div>
                </div>
            </div>

            {/* Middle: Money Flow Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                <div className="lg:col-span-2 p-6 rounded-xl bg-[#0a0a0a] border border-white/10 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Cash Flow Visualization</h3>
                        <div className="flex gap-2">
                            <Button variant="outline" className="h-8 text-xs bg-white/5 border-white/10 hover:bg-white/10">
                                This Month
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                        {/* Adjust margins to prevent label cutoff */}
                        <ResponsiveContainer width="100%" height="100%">
                            <Sankey
                                data={data}
                                node={renderNode}
                                nodePadding={50}
                                margin={{
                                    left: 100,
                                    right: 100,
                                    top: 20,
                                    bottom: 20,
                                }}
                                link={{ stroke: '#ffffff20' }}
                            >
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }}
                                    formatter={(val: number | undefined) => `$${(val || 0)}`}
                                />
                            </Sankey>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Quick Actions & Sync */}
                <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/10 flex flex-col gap-4">
                    <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Accounting Controls</h3>

                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 text-blue-400 rounded">
                                <RefreshCw className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white">Sync to Xero</div>
                                <div className="text-xs text-white/40">Last synced 2h ago</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 text-green-400 rounded">
                                <Download className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white">Export CSV</div>
                                <div className="text-xs text-white/40">Full Ledger</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Invoice Ledger */}
            <div className="p-6 rounded-xl bg-[#0a0a0a] border border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Invoice Ledger</h3>
                    <Button variant="outline" className="h-8 text-xs border-white/10 hover:bg-white/10 bg-transparent text-white/70">
                        View All
                    </Button>
                </div>
                <div className="rounded-lg border border-white/10 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-white/50 font-medium">
                            <tr>
                                <th className="p-4">Invoice ID</th>
                                <th className="p-4">Client</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {[1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="group hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono text-white/70">#INV-2024-00{i}</td>
                                    <td className="p-4 text-white font-medium">Client {String.fromCharCode(65 + i)} Inc.</td>
                                    <td className="p-4 text-white/50">Oct {10 + i}, 2024</td>
                                    <td className="p-4 text-right font-mono text-white">${(1000 + i * 500).toLocaleString()}.00</td>
                                    <td className="p-4 text-center">
                                        {i === 2 ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-xs border border-amber-500/20">Pending</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-xs border border-emerald-500/20">Paid</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="text-white/30 hover:text-white transition-colors">
                                            <FileText className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
