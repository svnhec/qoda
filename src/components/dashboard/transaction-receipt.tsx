"use client";

import { useState } from "react";
import { X, Copy, MapPin, CheckCircle2, FileJson, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionReceiptProps {
    transactionId: string; // usually passed to fetch details
    isOpen: boolean;
    onClose: () => void;
}

export function TransactionReceipt({ transactionId, isOpen, onClose }: TransactionReceiptProps) {
    const [showJson, setShowJson] = useState(false);

    if (!isOpen) return null;

    // Mock Data for "Granular Inspection"
    const tx = {
        id: transactionId,
        merchant: "OpenAI API",
        amount: "$12.50",
        date: "Oct 24, 2024 at 10:42 AM",
        status: "approved",
        agent: "Support Bot V2",
        client: "Acme Corp",
        location: "San Francisco, US",
        cardLast4: "4242",
        fees: {
            base: "$10.00",
            markup: "$2.50",
            total: "$12.50"
        },
        payload: {
            id: transactionId,
            object: "issuing.authorization",
            amount: 1250,
            currency: "usd",
            merchant_data: {
                name: "OpenAI API",
                network_id: "123456789"
            },
            approved: true
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Header (Receipt Top) */}
                <div className="bg-white/5 p-8 text-center border-b border-white/10 border-dashed relative">
                    <div className="w-16 h-16 mx-auto bg-white rounded-xl shadow-lg flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold text-black">OA</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{tx.merchant}</h2>
                    <p className="text-sm text-white/40 mb-4">{tx.date}</p>
                    <div className="text-4xl font-mono font-medium text-white tracking-tight">{tx.amount}</div>

                    <div className="absolute -bottom-3 left-0 right-0 flex justify-between px-2">
                        {/* Receipt Cutout visual (circles) */}
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="w-4 h-4 bg-[#0a0a0a] rounded-full -mb-2"></div>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">

                    {/* Status Badge */}
                    <div className="flex justify-center">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Settled on Visa •••• {tx.cardLast4}
                        </span>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-white/40">Base Cost</span>
                            <span className="text-white font-mono">{tx.fees.base}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/40">Client Markup (25%)</span>
                            <span className="text-emerald-400 font-mono">+{tx.fees.markup}</span>
                        </div>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex justify-between text-base font-medium">
                            <span className="text-white">Total Bill</span>
                            <span className="text-white font-mono">{tx.fees.total}</span>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                        <div>
                            <div className="text-xs text-white/30 uppercase mb-1">Agent</div>
                            <div className="text-sm text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                {tx.agent}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-white/30 uppercase mb-1">Client</div>
                            <div className="text-sm text-white">{tx.client}</div>
                        </div>
                    </div>

                    {/* Map Snippet */}
                    <div className="h-24 rounded-lg bg-white/5 border border-white/10 overflow-hidden relative group">
                        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] text-white/20 text-xs">
                            [Map Placeholder: {tx.location}]
                        </div>
                        <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] text-white/60 bg-black/50 px-2 py-1 rounded backdrop-blur">
                            <MapPin className="w-3 h-3" /> {tx.location}
                        </div>
                    </div>

                    {/* JSON Logic */}
                    <div className="pt-2">
                        <button
                            onClick={() => setShowJson(!showJson)}
                            className="text-xs text-white/30 flex items-center gap-1 hover:text-white transition-colors"
                        >
                            <FileJson className="w-3 h-3" />
                            {showJson ? "Hide Raw Payload" : "View Webhook Payload"}
                        </button>
                        {showJson && (
                            <pre className="mt-2 p-3 bg-black rounded border border-white/10 text-[10px] text-emerald-500/70 overflow-x-auto font-mono">
                                {JSON.stringify(tx.payload, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white/5 border-t border-white/10 flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                        onClick={() => navigator.clipboard.writeText(tx.id)}
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy ID
                    </Button>
                    <Button
                        variant="destructive"
                        className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                    >
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        Dispute
                    </Button>
                </div>
            </div>
        </div>
    );
}
