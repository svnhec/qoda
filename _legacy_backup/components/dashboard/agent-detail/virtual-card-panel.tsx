'use client';

import { useState } from 'react';
import { Copy, Eye, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function VirtualCardPanel({ isActive }: { isActive: boolean }) {
    const [showNumber, setShowNumber] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authStep, setAuthStep] = useState<'idle' | 'scanning' | 'approved'>('idle');

    const handleCopyClick = () => {
        if (showNumber) {
            navigator.clipboard.writeText("4242 4242 4242 1234"); // Dummy copy
        } else {
            setIsAuthModalOpen(true);
            setAuthStep('scanning');

            // Simulate auth delay
            setTimeout(() => setAuthStep('approved'), 1500);
            setTimeout(() => {
                setIsAuthModalOpen(false);
                setShowNumber(true);
                setAuthStep('idle');
                // Hide again after 10s
                setTimeout(() => setShowNumber(false), 10000);
            }, 2200);
        }
    };

    return (
        <div className="relative">
            <div className={`
          relative w-full aspect-[1.586/1] rounded-xl p-6 flex flex-col justify-between overflow-hidden transition-all
          bg-gradient-to-br from-zinc-900 to-black border border-white/10
          ${!isActive ? 'grayscale opacity-50' : 'shadow-2xl shadow-lime-900/10'}
      `}>
                {/* Card Details */}
                <div className="flex justify-between items-start z-10">
                    <div className="w-10 h-7 rounded bg-[#fbbf24] opacity-80" />
                    <div className="text-white/50 font-mono text-sm">DEBIT</div>
                </div>

                <div className="z-10 mt-4">
                    <div className="font-mono text-xl text-white tracking-widest flex items-center gap-4">
                        {showNumber ? (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                4242 4242 4242 1234
                            </motion.span>
                        ) : (
                            <span>•••• •••• •••• 1234</span>
                        )}
                        {isActive && (
                            <button
                                onClick={handleCopyClick}
                                className="p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            >
                                {showNumber ? <Copy size={14} /> : <Eye size={14} />}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-end z-10">
                    <div>
                        <div className="text-[9px] text-white/40 uppercase tracking-widest">Cardholder</div>
                        <div className="text-white font-medium text-sm">AGENT-007</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] text-white/40 uppercase tracking-widest">Expires</div>
                        <div className="text-white font-mono text-sm">12/28</div>
                    </div>
                </div>

                {/* Background Noise */}
                <div className="absolute inset-0 opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 blur-[80px] rounded-full pointer-events-none" />
            </div>

            {/* Auth Simulation Modal */}
            <AnimatePresence>
                {isAuthModalOpen && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 rounded-xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="flex flex-col items-center gap-3"
                        >
                            {authStep === 'scanning' ? (
                                <>
                                    <div className="w-12 h-12 rounded-full border-2 border-lime-500/30 border-t-lime-500 animate-spin" />
                                    <span className="text-xs font-mono text-lime-500 animate-pulse">VERIFYING BIOMETRICS...</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-full bg-lime-500/20 text-lime-500 flex items-center justify-center">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <span className="text-xs font-mono text-lime-500">ACCESS GRANTED</span>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
