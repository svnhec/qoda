'use client';

/**
 * BILLING VIEW
 * =============================================================================
 * End-of-month rebilling and revenue tracking
 * - Revenue Flow Visualization
 * - Client Invoice Table
 * - P&L Summary
 * =============================================================================
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Download,
    Send,
    DollarSign,
    TrendingUp,
    FileText,
    CheckCircle,
    Clock,
    AlertCircle
} from 'lucide-react';

// Sample invoice data (would come from backend in production)
const sampleInvoices = [
    { id: 'INV-001', client: 'Acme Corp', spend: 4500, markup: 675, total: 5175, status: 'paid', date: '2026-01-01' },
    { id: 'INV-002', client: 'TechStart', spend: 2800, markup: 420, total: 3220, status: 'paid', date: '2026-01-01' },
    { id: 'INV-003', client: 'DataFlow', spend: 6200, markup: 930, total: 7130, status: 'pending', date: '2026-01-01' },
    { id: 'INV-004', client: 'CloudNine', spend: 3400, markup: 510, total: 3910, status: 'draft', date: '2026-01-01' },
    { id: 'INV-005', client: 'AI Labs', spend: 8100, markup: 1215, total: 9315, status: 'paid', date: '2026-01-01' },
];

export function BillingView() {
    const [selectedPeriod, setSelectedPeriod] = useState('jan-2026');

    // Calculate totals
    const totalSpend = sampleInvoices.reduce((sum, inv) => sum + inv.spend, 0);
    const totalMarkup = sampleInvoices.reduce((sum, inv) => sum + inv.markup, 0);
    const totalRevenue = sampleInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const paidAmount = sampleInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                        <CheckCircle className="w-3 h-3" />
                        Paid
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                        <Clock className="w-3 h-3" />
                        Pending
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground">
                        <AlertCircle className="w-3 h-3" />
                        Draft
                    </span>
                );
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Billing & Rebilling</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Automated end-of-month invoicing with markup
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="input h-9 w-40"
                    >
                        <option value="jan-2026">January 2026</option>
                        <option value="dec-2025">December 2025</option>
                        <option value="nov-2025">November 2025</option>
                    </select>
                    <button className="btn-secondary">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Gross Spend */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-hover p-5"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="metric-label">Gross Spend</span>
                    </div>
                    <div className="value-medium">{formatCurrency(totalSpend)}</div>
                    <p className="text-xs text-muted-foreground mt-2">AI agent costs</p>
                </motion.div>

                {/* Markup Revenue */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card-hover p-5"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-accent" />
                        <span className="metric-label">Markup Revenue</span>
                    </div>
                    <div className="value-medium text-accent">{formatCurrency(totalMarkup)}</div>
                    <p className="text-xs text-muted-foreground mt-2">15% margin applied</p>
                </motion.div>

                {/* Total Billed */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card-hover p-5"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-info" />
                        <span className="metric-label">Total Billed</span>
                    </div>
                    <div className="value-medium">{formatCurrency(totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground mt-2">{sampleInvoices.length} invoices</p>
                </motion.div>

                {/* Collected */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="card-hover p-5"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        <span className="metric-label">Collected</span>
                    </div>
                    <div className="value-medium">{formatCurrency(paidAmount)}</div>
                    <div className="h-1.5 bg-secondary rounded-full mt-3 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(paidAmount / totalRevenue) * 100}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-accent"
                        />
                    </div>
                </motion.div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Invoice Table */}
                <div className="lg:col-span-2 card p-0 overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Client Invoices</h3>
                        <button className="btn-primary text-sm py-1.5 px-3">
                            <Send className="w-3.5 h-3.5" />
                            Send All Pending
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-secondary/30">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Invoice
                                    </th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Client
                                    </th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Spend
                                    </th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Markup
                                    </th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Total
                                    </th>
                                    <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sampleInvoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="hover:bg-secondary/20 transition-colors cursor-pointer"
                                    >
                                        <td className="py-3 px-4">
                                            <span className="font-mono text-sm text-foreground">{invoice.id}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-medium text-foreground">{invoice.client}</span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                                            {formatCurrency(invoice.spend)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-accent">
                                            +{formatCurrency(invoice.markup)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="py-3 px-4">
                                            {getStatusBadge(invoice.status)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="card p-0 overflow-hidden">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Revenue Flow</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        {/* Flow visualization */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-primary" />
                                <span className="text-sm text-muted-foreground flex-1">AI Spend</span>
                                <span className="font-mono text-foreground">{formatCurrency(totalSpend)}</span>
                            </div>
                            <div className="ml-1.5 border-l-2 border-dashed border-border h-8" />
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-accent" />
                                <span className="text-sm text-muted-foreground flex-1">+ Markup (15%)</span>
                                <span className="font-mono text-accent">+{formatCurrency(totalMarkup)}</span>
                            </div>
                            <div className="ml-1.5 border-l-2 border-dashed border-border h-8" />
                            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                <div className="w-3 h-3 rounded-full bg-foreground" />
                                <span className="text-sm font-medium text-foreground flex-1">Client Billed</span>
                                <span className="font-mono font-bold text-foreground">{formatCurrency(totalRevenue)}</span>
                            </div>
                        </div>

                        <div className="border-t border-border pt-4 mt-4 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Stripe Fees (~2.9%)</span>
                                <span className="font-mono text-destructive">-{formatCurrency(totalRevenue * 0.029)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Net Profit</span>
                                <span className="font-mono font-bold text-accent">
                                    {formatCurrency(totalMarkup - (totalRevenue * 0.029))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
