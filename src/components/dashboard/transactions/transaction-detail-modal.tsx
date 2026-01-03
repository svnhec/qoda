'use client';

/**
 * TRANSACTION DETAIL MODAL COMPONENT
 * =============================================================================
 * Modal view for transaction details:
 * - Merchant logo/info
 * - Status timeline
 * - Raw JSON viewer
 * - Actions (dispute, copy ID)
 * =============================================================================
 */

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Copy,
    ExternalLink,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    CreditCard,
    Tag,
    Building2,
    Code,
    FileText
} from 'lucide-react';
import { useState } from 'react';

interface FullTransaction {
    id: string;
    amount_cents: string;
    currency: string;
    merchant_name: string;
    merchant_category: string;
    status: string;
    created_at: string;
    agents: { name: string; id: string } | null;
    clients: { name: string; id: string } | null;
    stripe_transaction_id: string;
}

export function TransactionDetailModal({ transaction }: { transaction: FullTransaction }) {
    const router = useRouter();
    const [showRaw, setShowRaw] = useState(false);

    const formatCurrency = (cents: string) => {
        const value = Number(cents) / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: transaction.currency.toUpperCase(),
        }).format(value);
    };

    const handleClose = () => {
        router.back();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast would go here
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-[#0a0a0a] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">Transaction Details</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Amount & Merchant Hero */}
                    <div className="p-8 text-center bg-gradient-to-b from-white/5 to-transparent">
                        <div className="w-16 h-16 rounded-full bg-white/10 mx-auto flex items-center justify-center mb-4 text-2xl font-bold text-white">
                            {transaction.merchant_name.charAt(0)}
                        </div>
                        <h1 className="text-4xl font-mono font-bold text-white mb-2">
                            {formatCurrency(transaction.amount_cents)}
                        </h1>
                        <p className="text-lg text-white/80">{transaction.merchant_name}</p>
                        <div className="flex justify-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${transaction.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                transaction.status === 'declined' ? 'bg-red-500/10 text-red-500' :
                                    'bg-amber-500/10 text-amber-500'
                                }`}>
                                {transaction.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                                    transaction.status === 'declined' ? <XCircle className="w-3 h-3" /> :
                                        <Clock className="w-3 h-3" />}
                                {transaction.status}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-white/60">
                                <Tag className="w-3 h-3" />
                                {transaction.merchant_category}
                            </span>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Attribution */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Attribution</h3>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="p-2 rounded bg-purple-500/20 text-purple-400">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs text-white/40">Client Project</div>
                                    <div className="text-sm font-medium text-white">{transaction.clients?.name || 'Unattributed'}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="p-2 rounded bg-blue-500/20 text-blue-400">
                                    <Code className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs text-white/40">Initiated By Agent</div>
                                    <div className="text-sm font-medium text-white">{transaction.agents?.name || 'Unknown Agent'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Payment Details</h3>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/40 flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" /> Time
                                    </span>
                                    <span className="text-white">
                                        {new Date(transaction.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/40 flex items-center gap-2">
                                        <CreditCard className="w-3.5 h-3.5" /> Method
                                    </span>
                                    <span className="text-white font-mono">Virtual Card</span>
                                </div>
                                <div className="flex justify-between items-center text-sm group cursor-pointer" onClick={() => copyToClipboard(transaction.stripe_transaction_id)}>
                                    <span className="text-white/40 flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5" /> Stripe ID
                                    </span>
                                    <span className="text-white/60 font-mono text-xs group-hover:text-white flex items-center gap-1">
                                        {transaction.stripe_transaction_id.slice(0, 12)}...
                                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Raw JSON Toggle */}
                    <div className="px-6 pb-6">
                        <button
                            onClick={() => setShowRaw(!showRaw)}
                            className="text-xs text-white/40 flex items-center gap-1 hover:text-white transition-colors mb-2"
                        >
                            <Code className="w-3 h-3" />
                            {showRaw ? 'Hide Raw Data' : 'View Raw Data'}
                        </button>

                        <AnimatePresence>
                            {showRaw && (
                                <motion.pre
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-black/50 p-4 rounded-lg text-[10px] font-mono text-emerald-400 overflow-x-auto border border-white/5"
                                >
                                    {JSON.stringify(transaction, null, 2)}
                                </motion.pre>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/5 flex justify-between bg-white/5">
                    <button
                        onClick={() => window.open(`https://dashboard.stripe.com/test/issuing/authorizations/${transaction.stripe_transaction_id}`, '_blank')}
                        className="btn-ghost text-xs"
                    >
                        <ExternalLink className="w-3.5 h-3.5 mr-2" />
                        View in Stripe
                    </button>
                    {transaction.status === 'approved' && (
                        <button className="btn-secondary text-xs hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20">
                            <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                            Dispute Transaction
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
