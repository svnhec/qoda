'use client';

import { useState } from 'react';
import {
    Landmark,
    ArrowUpRight,
    ArrowDownLeft,
    RefreshCw,
    ShieldCheck,
    Wallet
} from 'lucide-react';
import { formatCurrency } from '@/lib/types/currency';

export function BankingView() {
    const [balance] = useState(1245000); // $12,450.00
    const [isAutoTopUpEnabled, setIsAutoTopUpEnabled] = useState(true);

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#050505] text-white p-8 font-sans">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Landmark className="text-lime-500" />
                        Treasury Vault
                    </h1>
                    <p className="text-white/40 text-sm mt-1">Manage global issuing balance and banking rails.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-mono flex items-center gap-2">
                        <ShieldCheck size={12} />
                        <span>BANKING RAILS ACTIVE</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">

                {/* Main Vault Card (Left - 8 cols) */}
                <div className="col-span-8 space-y-6">

                    {/* Balance Card */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-black p-8">
                        <div className="absolute top-0 right-0 p-32 bg-lime-500/5 blur-[100px] rounded-full pointer-events-none" />

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="text-sm font-mono text-white/40 uppercase tracking-widest mb-2">Available Issuing Balance</div>
                                <div className="text-5xl font-bold text-white tracking-tight">
                                    {formatCurrency(BigInt(balance))}
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2 text-sm">
                                <ArrowUpRight size={16} />
                                Add Funds
                            </button>
                        </div>

                        {/* Quick Stats */}
                        <div className="relative z-10 grid grid-cols-3 gap-8 mt-12 border-t border-white/5 pt-8">
                            <div>
                                <div className="text-xs text-white/40 mb-1">Monthly Spend Limit</div>
                                <div className="text-lg font-mono text-white">$50,000.00</div>
                                <div className="w-full bg-white/10 h-1 mt-3 rounded-full overflow-hidden">
                                    <div className="bg-white/40 h-full w-[24%]" />
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-white/40 mb-1">Next Settlement</div>
                                <div className="text-lg font-mono text-white">Instant</div>
                            </div>
                            <div>
                                <div className="text-xs text-white/40 mb-1">Yield (APY)</div>
                                <div className="text-lg font-mono text-lime-500">4.82%</div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction History (Simplified) */}
                    <div className="rounded-xl border border-white/5 bg-[#0a0a0a] overflow-hidden">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-semibold text-white">Recent Movements</h3>
                            <button className="text-xs text-white/40 hover:text-white">View All</button>
                        </div>
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-white/40 font-mono uppercase bg-white/5">
                                <tr>
                                    <th className="p-4 font-medium">Type</th>
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium text-right">Amount</th>
                                    <th className="p-4 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {[1, 2, 3].map((_, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-white/5 text-white/60">
                                                {i === 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                            </div>
                                            <span>{i === 0 ? "Manual Top-up" : "Agent Dispute Resolution"}</span>
                                        </td>
                                        <td className="p-4 text-white/40 font-mono">Oct 2{8 - i}, 10:4{i} AM</td>
                                        <td className={`p-4 text-right font-mono ${i === 0 ? 'text-lime-500' : 'text-white'}`}>
                                            {i === 0 ? '+' : '-'}${i === 0 ? '5,000.00' : '124.50'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">SETTLED</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Controls (Right - 4 cols) */}
                <div className="col-span-4 space-y-6">

                    {/* Connect Identity */}
                    <div className="p-6 rounded-xl border border-white/5 bg-[#0a0a0a]">
                        <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                            <Wallet size={16} className="text-purple-500" />
                            Stripe Connect
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                                <span className="text-sm text-emerald-200">Identity Verified</span>
                                <ShieldCheck size={16} className="text-emerald-500" />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-sm text-white/60">Payouts Enabled</span>
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            </div>
                            <button className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors">
                                Manage Stripe Account
                            </button>
                        </div>
                    </div>

                    {/* Auto Top-up Configuration */}
                    <div className="p-6 rounded-xl border border-white/5 bg-[#0a0a0a]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <RefreshCw size={16} className={isAutoTopUpEnabled ? "text-lime-500 animate-spin-slow" : "text-white/40"} />
                                Auto-Pilot
                            </h3>
                            <button
                                onClick={() => setIsAutoTopUpEnabled(!isAutoTopUpEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] ${isAutoTopUpEnabled ? 'bg-lime-500' : 'bg-white/10'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoTopUpEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className={`space-y-4 transition-opacity ${!isAutoTopUpEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Trigger Threshold</label>
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                                    <span className="text-white/40">$</span>
                                    <input type="text" defaultValue="1,000.00" className="bg-transparent text-white focus:outline-none w-full font-mono" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider block mb-2">Top-up Amount</label>
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                                    <span className="text-white/40">$</span>
                                    <input type="text" defaultValue="5,000.00" className="bg-transparent text-white focus:outline-none w-full font-mono" />
                                </div>
                            </div>
                            <div className="text-xs text-white/30 italic">
                                * Funds are pulled from linked Wells Fargo account ending in •••• 8832
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
