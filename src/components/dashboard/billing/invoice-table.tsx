'use client';

import { Download, Search, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/types/currency';

interface Invoice {
    id: string;
    client: string;
    date: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'OVERDUE';
}

const INVOICES: Invoice[] = [
    { id: 'INV-2024-001', client: 'Acme Corp', date: '2024-10-24', amount: 4500.00, status: 'PAID' },
    { id: 'INV-2024-002', client: 'Globex Inc', date: '2024-10-25', amount: 12500.00, status: 'PENDING' },
    { id: 'INV-2024-003', client: 'Soylent Corp', date: '2024-10-26', amount: 3200.00, status: 'PAID' },
    { id: 'INV-2024-004', client: 'Umbrella Corp', date: '2024-10-28', amount: 8900.00, status: 'OVERDUE' },
    { id: 'INV-2024-005', client: 'Stark Ind', date: '2024-10-29', amount: 15400.00, status: 'PAID' },
];

export function InvoiceTable() {
    return (
        <div className="rounded-xl border border-white/5 bg-[#0a0a0a] overflow-hidden flex flex-col h-full">
            {/* Table Toolbar */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">Recent Invoices</h3>
                    <span className="text-xs text-white/40 font-mono bg-white/5 px-2 py-0.5 rounded-full">24</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            className="h-8 pl-9 pr-4 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all w-48"
                        />
                    </div>
                    <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10">
                        <Filter size={16} />
                    </button>
                    <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10">
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs text-white/40 font-mono uppercase sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="p-4 font-medium font-sans">Invoice ID</th>
                            <th className="p-4 font-medium font-sans">Client</th>
                            <th className="p-4 font-medium font-sans">Date Issued</th>
                            <th className="p-4 font-medium font-sans text-right">Amount</th>
                            <th className="p-4 font-medium font-sans text-right">Status</th>
                            <th className="p-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {INVOICES.map((inv) => (
                            <tr key={inv.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 font-mono text-white/80">{inv.id}</td>
                                <td className="p-4 text-white font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${inv.client.length % 2 === 0 ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                        {inv.client}
                                    </div>
                                </td>
                                <td className="p-4 text-white/40 font-mono text-xs">{inv.date}</td>
                                <td className="p-4 text-right font-mono text-white">
                                    {formatCurrency(BigInt(inv.amount))}
                                </td>
                                <td className="p-4 text-right">
                                    <span className={`
                                  inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border
                                  ${inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            inv.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                'bg-red-500/10 text-red-500 border-red-500/20'}
                              `}>
                                        {inv.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="text-white/20 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                        <Download size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
