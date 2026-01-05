'use client';

/**
 * INVOICE DETAIL VIEW COMPONENT
 * =============================================================================
 * Full invoice preview and management:
 * - Header with client info
 * - Transaction breakdown table
 * - Markup calculations
 * - Send/download actions
 * =============================================================================
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Download,
    Send,
    Edit2,
    Check,
    X,
    FileText,
    Calendar,
    DollarSign,
    User,
    Printer,
    Mail,
    CheckCircle,
    Clock,
    AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Invoice {
    id: string;
    period_start: string;
    period_end: string;
    subtotal_cents: string;
    markup_cents: string;
    total_cents: string;
    status: string;
    created_at: string;
    sent_at: string | null;
    paid_at: string | null;
    clients: {
        id: string;
        name: string;
        contact_email: string;
        markup_percentage: number;
    };
}

interface Transaction {
    id: string;
    amount_cents: string;
    merchant_name: string;
    merchant_category: string;
    status: string;
    created_at: string;
    agents: { name: string } | null;
}

interface InvoiceDetailViewProps {
    invoice: Invoice;
    transactions: Transaction[];
}

export function InvoiceDetailView({ invoice, transactions }: InvoiceDetailViewProps) {
    const [excludedTxns, setExcludedTxns] = useState<Set<string>>(new Set());
    const [customMarkup, setCustomMarkup] = useState(invoice.clients.markup_percentage);
    const [isEditing, setIsEditing] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const formatCurrency = (cents: string | number) => {
        const value = Number(cents) / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    // Calculate totals excluding removed transactions
    const includedTxns = transactions.filter(t => !excludedTxns.has(t.id));
    const subtotal = includedTxns.reduce((sum, t) => sum + Number(t.amount_cents), 0);
    const markupAmount = Math.round(subtotal * (customMarkup / 100));
    const total = subtotal + markupAmount;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-accent/10 text-accent">
                        <CheckCircle className="w-4 h-4" />
                        Paid
                    </span>
                );
            case 'sent':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-info/10 text-info">
                        <Mail className="w-4 h-4" />
                        Sent
                    </span>
                );
            case 'overdue':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-destructive/10 text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        Overdue
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-secondary text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Draft
                    </span>
                );
        }
    };

    const handleSend = async () => {
        setIsSending(true);
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/send`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to send');
            // Force refresh or update local state
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('Failed to send invoice');
        } finally {
            setIsSending(false);
        }
    };

    const toggleExclude = (txnId: string) => {
        const newExcluded = new Set(excludedTxns);
        if (newExcluded.has(txnId)) {
            newExcluded.delete(txnId);
        } else {
            newExcluded.add(txnId);
        }
        setExcludedTxns(newExcluded);
    };

    return (
        <div className="p-6 lg:p-8 bg-background min-h-screen">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
                <div>
                    <Link
                        href="/dashboard/billing"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Billing
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                Invoice #{invoice.id.slice(0, 8).toUpperCase()}
                            </h1>
                            <p className="text-muted-foreground">
                                {invoice.clients.name}
                            </p>
                        </div>
                        {getStatusBadge(invoice.status)}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="btn-ghost">
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                    <button className="btn-secondary">
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                    {invoice.status === 'draft' && (
                        <button
                            onClick={handleSend}
                            disabled={isSending}
                            className="btn-primary"
                        >
                            <Send className="w-4 h-4" />
                            {isSending ? 'Sending...' : 'Send Invoice'}
                        </button>
                    )}
                </div>
            </div>

            {/* Invoice Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Invoice Details Card */}
                    <div className="card p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                    <User className="w-4 h-4" />
                                    Client
                                </div>
                                <p className="font-medium text-foreground">{invoice.clients.name}</p>
                                <p className="text-sm text-muted-foreground">{invoice.clients.contact_email}</p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                    <Calendar className="w-4 h-4" />
                                    Period
                                </div>
                                <p className="font-medium text-foreground">
                                    {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                                    <DollarSign className="w-4 h-4" />
                                    Markup
                                </div>
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={customMarkup}
                                            onChange={(e) => setCustomMarkup(Number(e.target.value))}
                                            className="input w-20 h-8 text-sm"
                                            min={0}
                                            max={100}
                                        />
                                        <span className="text-muted-foreground">%</span>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="p-1 rounded hover:bg-secondary text-accent"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-foreground">{customMarkup}%</p>
                                        {invoice.status === 'draft' && (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-muted-foreground text-sm mb-1">Invoice Date</div>
                                <p className="font-medium text-foreground">{formatDate(invoice.created_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="card p-0 overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold text-foreground">Transaction Breakdown</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {includedTxns.length} of {transactions.length} transactions included
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-secondary/30">
                                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Merchant
                                        </th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Agent
                                        </th>
                                        <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Amount
                                        </th>
                                        {invoice.status === 'draft' && (
                                            <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                                                Include
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {transactions.map((txn) => (
                                        <tr
                                            key={txn.id}
                                            className={`${excludedTxns.has(txn.id) ? 'opacity-40 bg-secondary/10' : 'hover:bg-secondary/20'} transition-colors`}
                                        >
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {formatDate(txn.created_at)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-medium text-foreground">{txn.merchant_name}</span>
                                                <span className="block text-xs text-muted-foreground">{txn.merchant_category}</span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-foreground">
                                                {txn.agents?.name || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-foreground">
                                                {formatCurrency(txn.amount_cents)}
                                            </td>
                                            {invoice.status === 'draft' && (
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        onClick={() => toggleExclude(txn.id)}
                                                        className={`p-1.5 rounded ${excludedTxns.has(txn.id)
                                                            ? 'bg-secondary text-muted-foreground'
                                                            : 'bg-accent/10 text-accent'
                                                            }`}
                                                    >
                                                        {excludedTxns.has(txn.id) ? (
                                                            <X className="w-4 h-4" />
                                                        ) : (
                                                            <Check className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-6">
                    {/* Totals Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card p-6 bg-gradient-to-br from-primary/5 to-transparent"
                    >
                        <h3 className="font-semibold text-foreground mb-4">Invoice Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal ({includedTxns.length} txns)</span>
                                <span className="font-mono text-foreground">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Markup ({customMarkup}%)</span>
                                <span className="font-mono text-accent">+{formatCurrency(markupAmount)}</span>
                            </div>
                            <div className="border-t border-border pt-3">
                                <div className="flex justify-between">
                                    <span className="font-semibold text-foreground">Total</span>
                                    <span className="font-mono font-bold text-xl text-foreground">{formatCurrency(total)}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Profit Card */}
                    <div className="card p-6">
                        <h3 className="font-semibold text-foreground mb-4">Your Profit</h3>
                        <div className="text-3xl font-bold text-accent font-mono">
                            {formatCurrency(markupAmount)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            {customMarkup}% of {formatCurrency(subtotal)} spend
                        </p>
                    </div>

                    {/* Timeline */}
                    <div className="card p-6">
                        <h3 className="font-semibold text-foreground mb-4">Timeline</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">Created</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(invoice.created_at)}</p>
                                </div>
                            </div>
                            {invoice.sent_at && (
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-info mt-2" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Sent</p>
                                        <p className="text-xs text-muted-foreground">{formatDate(invoice.sent_at)}</p>
                                    </div>
                                </div>
                            )}
                            {invoice.paid_at && (
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Paid</p>
                                        <p className="text-xs text-muted-foreground">{formatDate(invoice.paid_at)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
