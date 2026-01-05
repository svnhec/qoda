'use client';

/**
 * FUNDING VIEW COMPONENT
 * =============================================================================
 * Manage Stripe Issuing balance:
 * - Add funds form
 * - Auto-topup configuration
 * - Transaction history table
 * =============================================================================
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft,
    Settings,
    Shield,
    AlertCircle,
    Loader2,
    Landmark
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Organization {
    id: string;
    name: string;
    stripe_account_id: string | null;
    issuing_balance_cents: string;
    auto_topup_enabled: boolean;
    auto_topup_threshold_cents: string | null;
    auto_topup_amount_cents: string | null;
}

interface FundingTxn {
    id: string;
    amount_cents: string;
    status: string;
    created_at: string;
    description: string;
}

interface FundingViewProps {
    organization: Organization | null;
    fundingHistory: FundingTxn[];
}

export function FundingView({ organization, fundingHistory }: FundingViewProps) {
    const router = useRouter();
    const [amount, setAmount] = useState(100);
    const [isLoading, setIsLoading] = useState(false);
    const [isAutoTopupOpen, setIsAutoTopupOpen] = useState(false);

    // If no org data (shouldn't happen due to page check)
    if (!organization) return null;

    const balance = BigInt(organization.issuing_balance_cents || 0);
    const lowBalanceThreshold = 10000n; // $100.00

    const formatCurrency = (cents: string | number | bigint) => {
        const value = Number(cents) / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value);
    };

    const handleAddFunds = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/funding/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount_cents: amount * 100 })
            });

            if (!res.ok) throw new Error('Failed to add funds');

            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Failed to add funds');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 bg-background min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Funding & Balance</h1>
                <p className="text-muted-foreground mt-1">Manage your issuing balance and top-up settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Balance & Top-up */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Balance Card */}
                    <div className="card p-6 bg-gradient-to-br from-secondary to-background border-border relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Available Balance</h2>
                                {balance < lowBalanceThreshold && (
                                    <span className="flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2 py-1 rounded">
                                        <AlertCircle className="w-3 h-3" />
                                        LOW BALANCE
                                    </span>
                                )}
                            </div>
                            <div className="text-4xl font-mono font-bold text-foreground mb-6">
                                {formatCurrency(balance)}
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 px-3 py-1.5 rounded-lg">
                                    <Landmark className="w-4 h-4 text-primary" />
                                    Wells Fargo ••4242
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 px-3 py-1.5 rounded-lg">
                                    <Shield className="w-4 h-4 text-accent" />
                                    FDIC Insured
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
                    </div>

                    {/* Quick Add Funds */}
                    <div className="card p-6">
                        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                            <ArrowDownLeft className="w-5 h-5 text-accent" />
                            Add Funds
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                                        className="input w-full pl-8 text-lg font-mono"
                                        min={100}
                                        step={100}
                                    />
                                </div>
                                <div className="flex gap-2 mt-3">
                                    {[100, 500, 1000, 5000].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setAmount(val)}
                                            className={`px-3 py-1 text-xs rounded border transition-colors ${amount === val
                                                ? 'bg-primary/10 border-primary text-primary'
                                                : 'bg-secondary border-transparent text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            ${val}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col justify-end">
                                <button
                                    onClick={handleAddFunds}
                                    disabled={isLoading || amount < 50}
                                    className="btn-primary w-full py-3"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Add Funds
                                        </>
                                    )}
                                </button>
                                <p className="text-xs text-center text-muted-foreground mt-3">
                                    Transfers typically arrive within 1-2 business days via ACH.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="card p-0 overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold text-foreground">Recent Funding Activity</h3>
                        </div>
                        <div className="divide-y divide-border">
                            {fundingHistory.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No funding history yet.
                                </div>
                            ) : (
                                fundingHistory.map(txn => (
                                    <div key={txn.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${txn.amount_cents.startsWith('-')
                                                ? 'bg-destructive/10 text-destructive'
                                                : 'bg-accent/10 text-accent'
                                                }`}>
                                                {txn.amount_cents.startsWith('-')
                                                    ? <ArrowUpRight className="w-4 h-4" />
                                                    : <ArrowDownLeft className="w-4 h-4" />
                                                }
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{txn.description}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(txn.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`font-mono font-medium ${txn.amount_cents.startsWith('-') ? 'text-foreground' : 'text-accent'
                                            }`}>
                                            {txn.amount_cents.startsWith('-') ? '-' : '+'}{formatCurrency(txn.amount_cents.replace('-', ''))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Auto Top-up */}
                <div className="space-y-6">
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Settings className="w-4 h-4 text-primary" />
                                Auto Top-up
                            </h3>
                            <div className={`px-2 py-0.5 rounded text-xs font-bold ${organization.auto_topup_enabled
                                ? 'bg-accent/10 text-accent'
                                : 'bg-secondary text-muted-foreground'
                                }`}>
                                {organization.auto_topup_enabled ? 'ON' : 'OFF'}
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-6">
                            Automatically add funds when your balance drops below a threshold to ensure agents never get declined.
                        </p>

                        {!isAutoTopupOpen && (
                            <button
                                onClick={() => setIsAutoTopupOpen(true)}
                                className="btn-secondary w-full"
                            >
                                Configure
                            </button>
                        )}

                        {isAutoTopupOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">When balance falls below</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                        <input
                                            type="number"
                                            defaultValue={Number(organization.auto_topup_threshold_cents || 100000) / 100}
                                            className="input w-full pl-6 text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Add this amount</label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                        <input
                                            type="number"
                                            defaultValue={Number(organization.auto_topup_amount_cents || 500000) / 100}
                                            className="input w-full pl-6 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setIsAutoTopupOpen(false)}
                                        className="btn-primary flex-1 py-2 text-sm"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setIsAutoTopupOpen(false)}
                                        className="btn-ghost flex-1 py-2 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex gap-3">
                            <Shield className="w-5 h-5 text-primary shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium text-foreground mb-1">Bank-Grade Security</p>
                                <p className="text-muted-foreground">
                                    Your funds are held in an FDIC-insured account eligible for pass-through insurance. Transfers are encrypted and secure.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
