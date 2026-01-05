'use client';

/**
 * CARD ISSUANCE MODAL
 * =============================================================================
 * Full-featured card issuance dialog with:
 * - Card configuration (limits, categories)
 * - Preview of the virtual card
 * - Issuance flow with loading states
 * - Success animation with card reveal
 * =============================================================================
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard,
    X,
    CheckCircle,
    AlertCircle,
    Shield,
    DollarSign,
    Sparkles,
} from 'lucide-react';

interface CardIssuanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    agentId: string;
    agentName: string;
    defaultBudget?: number; // in cents
    onSuccess?: () => void;
}

interface IssuedCard {
    card_id: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    brand: string;
    is_mock?: boolean;
}

type Step = 'configure' | 'issuing' | 'success' | 'error';

export function CardIssuanceModal({
    isOpen,
    onClose,
    agentId,
    agentName,
    defaultBudget = 200000, // $2000 default
    onSuccess,
}: CardIssuanceModalProps) {
    const [step, setStep] = useState<Step>('configure');
    const [spendLimit, setSpendLimit] = useState(defaultBudget / 100);
    const [issuedCard, setIssuedCard] = useState<IssuedCard | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const handleIssueCard = async () => {
        setStep('issuing');
        setErrorMessage('');

        try {
            const response = await fetch('/api/v1/agents/issue-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agentId,
                    spend_limit_cents: String(Math.round(spendLimit * 100)),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setErrorMessage(data.error || 'Failed to issue card');
                setStep('error');
                return;
            }

            setIssuedCard(data.card);
            setStep('success');
            onSuccess?.();
        } catch {
            setErrorMessage('Network error. Please try again.');
            setStep('error');
        }
    };

    const handleClose = () => {
        setStep('configure');
        setIssuedCard(null);
        setErrorMessage('');
        onClose();
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(value);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && handleClose()}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-lg bg-card rounded-xl border border-border overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Issue Virtual Card</h2>
                                <p className="text-sm text-muted-foreground">For {agentName}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {step === 'configure' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* Card Preview */}
                                <div className="relative aspect-[1.586/1] rounded-xl p-5 flex flex-col justify-between bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 overflow-hidden">
                                    <div className="flex justify-between items-start z-10">
                                        <div className="w-10 h-7 rounded bg-gradient-to-br from-amber-400 to-amber-600" />
                                        <span className="text-xs font-mono text-white/50">VIRTUAL</span>
                                    </div>
                                    <div className="z-10 mt-4">
                                        <div className="font-mono text-lg text-white/80 tracking-widest">
                                            •••• •••• •••• ••••
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end z-10">
                                        <div>
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest">Agent</div>
                                            <div className="text-white font-medium text-sm truncate max-w-[120px]">
                                                {agentName.toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest">Limit</div>
                                            <div className="text-white font-mono text-sm">{formatCurrency(spendLimit)}</div>
                                        </div>
                                    </div>
                                    {/* Gradient overlay */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
                                </div>

                                {/* Configuration */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                                            Monthly Spend Limit
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                            <input
                                                type="number"
                                                value={spendLimit}
                                                onChange={(e) => setSpendLimit(Math.max(0, Number(e.target.value)))}
                                                className="input pl-8 pr-4 w-full text-lg font-mono"
                                                min={100}
                                                max={100000}
                                                step={100}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Agent cannot exceed this limit per billing cycle
                                        </p>
                                    </div>

                                    {/* Quick limits */}
                                    <div className="flex gap-2">
                                        {[500, 1000, 2000, 5000].map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => setSpendLimit(amount)}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${spendLimit === amount
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                ${amount.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
                                    <Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-foreground">Secure Virtual Card</p>
                                        <p className="text-muted-foreground mt-1">
                                            Card details are encrypted and PCI-compliant. You can adjust limits or freeze the card anytime.
                                        </p>
                                    </div>
                                </div>

                                {/* Issue Button */}
                                <button
                                    onClick={handleIssueCard}
                                    className="btn-primary w-full py-3 text-base"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Issue Card Now
                                </button>
                            </motion.div>
                        )}

                        {step === 'issuing' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-12"
                            >
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                    <CreditCard className="w-8 h-8 text-primary absolute inset-0 m-auto" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mt-6">Creating Your Card</h3>
                                <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
                                    Setting up secure virtual card infrastructure...
                                </p>
                            </motion.div>
                        )}

                        {step === 'success' && issuedCard && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6"
                            >
                                {/* Success Header */}
                                <div className="text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', delay: 0.2 }}
                                        className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto"
                                    >
                                        <CheckCircle className="w-8 h-8 text-accent" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold text-foreground mt-4">Card Issued!</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {issuedCard.is_mock ? 'Demo card created' : 'Your virtual card is ready to use'}
                                    </p>
                                </div>

                                {/* Issued Card Display */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="relative aspect-[1.586/1] rounded-xl p-5 flex flex-col justify-between bg-gradient-to-br from-emerald-900/50 to-zinc-900 border border-accent/30 overflow-hidden shadow-lg shadow-accent/10"
                                >
                                    <div className="flex justify-between items-start z-10">
                                        <div className="w-10 h-7 rounded bg-gradient-to-br from-amber-400 to-amber-600" />
                                        <span className="text-xs font-mono text-accent uppercase">{issuedCard.brand}</span>
                                    </div>
                                    <div className="z-10 mt-4">
                                        <div className="font-mono text-xl text-white tracking-widest">
                                            •••• •••• •••• {issuedCard.last4}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end z-10">
                                        <div>
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest">Agent</div>
                                            <div className="text-white font-medium text-sm truncate max-w-[120px]">
                                                {agentName.toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest">Expires</div>
                                            <div className="text-white font-mono text-sm">
                                                {String(issuedCard.exp_month).padStart(2, '0')}/{issuedCard.exp_year}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 blur-[80px] rounded-full pointer-events-none" />
                                </motion.div>

                                {issuedCard.is_mock && (
                                    <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                                        <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-medium text-warning">Demo Mode</p>
                                            <p className="text-muted-foreground mt-1">
                                                This is a mock card for demonstration. Connect Stripe Issuing to issue real cards.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleClose}
                                    className="btn-secondary w-full py-3"
                                >
                                    Done
                                </button>
                            </motion.div>
                        )}

                        {step === 'error' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-12"
                            >
                                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertCircle className="w-8 h-8 text-destructive" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mt-6">Issuance Failed</h3>
                                <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
                                    {errorMessage}
                                </p>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setStep('configure')}
                                        className="btn-secondary"
                                    >
                                        Try Again
                                    </button>
                                    <button
                                        onClick={handleClose}
                                        className="btn-ghost"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
