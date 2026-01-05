"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, CreditCard, CheckCircle2, Building } from "lucide-react";
import { createClientAction } from "@/app/dashboard/clients/actions";

export function CreateClientWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [markup, setMarkup] = useState(20);
    const [paymentMethodAdded, setPaymentMethodAdded] = useState(false);

    // Mock Payment Step
    const handleAddPayment = () => {
        setIsLoading(true);
        setTimeout(() => {
            setPaymentMethodAdded(true);
            setIsLoading(false);
        }, 1500);
    };

    // Final Submit
    const handleSubmit = async () => {
        setIsLoading(true);
        const input = {
            name,
            contact_email: email,
            contact_phone: null,
            // Markup would be stored in metadata or separate table in real app
        };

        const result = await createClientAction(input);

        if (result.success) {
            router.push("/dashboard/clients");
            router.refresh();
        } else {
            alert(result.error);
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Steps Header */}
            <div className="flex border-b border-white/10">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`flex-1 p-4 text-center text-sm font-medium border-b-2 transition-colors ${step === s
                            ? "border-emerald-500 text-emerald-400"
                            : step > s
                                ? "border-emerald-500/30 text-emerald-500/50"
                                : "border-transparent text-white/30"
                            }`}
                    >
                        Step {s}
                    </div>
                ))}
            </div>

            <div className="p-8 min-h-[400px]">
                {/* Step 1: Details */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white">Client Identity</h2>
                            <p className="text-white/40 mt-2">Who are we billing?</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Company Name</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Acme Corp"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Billing Email</label>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="finance@acme.com"
                                    type="email"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!name}
                                className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                Next <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Billing */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white">Payment Method</h2>
                            <p className="text-white/40 mt-2">Securely store payment details via Stripe.</p>
                        </div>

                        {!paymentMethodAdded ? (
                            <div className="p-6 border border-white/10 rounded-xl bg-white/5 space-y-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <CreditCard className="w-6 h-6 text-white/70" />
                                    <span className="text-white font-medium">Add Credit Card</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="Card Number" className="col-span-2 bg-[#050505] border border-white/10 p-3 rounded text-white/50 text-sm" disabled />
                                    <input placeholder="MM / YY" className="bg-[#050505] border border-white/10 p-3 rounded text-white/50 text-sm" disabled />
                                    <input placeholder="CVC" className="bg-[#050505] border border-white/10 p-3 rounded text-white/50 text-sm" disabled />
                                </div>
                                <button
                                    onClick={handleAddPayment}
                                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Payment Method"}
                                </button>
                                <p className="text-center text-xs text-white/30 flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Encrypted by Stripe (Mock)
                                </p>
                            </div>
                        ) : (
                            <div className="p-8 border border-emerald-500/30 bg-emerald-500/5 rounded-xl text-center space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                                    <CheckCircle2 className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white">Payment Method Verified</h3>
                                <p className="text-white/40 text-sm">Visa ending in 4242 added successfully.</p>
                                <button
                                    onClick={() => setStep(3)}
                                    className="mt-4 bg-white text-black px-8 py-2 rounded-lg font-bold hover:bg-white/90 transition-all"
                                >
                                    Continue
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Terms (Markup) */}
                {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right duration-300">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white">Commercial Terms</h2>
                            <p className="text-white/40 mt-2">Set your margin for this client.</p>
                        </div>

                        <div className="p-8 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-8 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-50" />
                            <div className="relative z-10">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <label className="text-sm font-bold text-emerald-300 uppercase tracking-wider">Margin Configuration</label>
                                        <p className="text-xs text-emerald-200/60 mt-1">Set your profit margin for this client</p>
                                    </div>
                                    <div className="text-5xl font-bold text-emerald-400">{markup}%</div>
                                </div>

                                <div className="relative group">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={markup}
                                        onChange={(e) => setMarkup(Number(e.target.value))}
                                        className="w-full h-3 bg-emerald-500/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all"
                                    />
                                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-emerald-500/10 -z-10 rounded-full"></div>
                                    <div className="flex justify-between text-xs text-white/40 mt-2">
                                        <span>0% (Cost Only)</span>
                                        <span>100% (Double)</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 pt-6 border-t border-emerald-500/20">
                                    <div className="text-center p-4 bg-slate-950/50 rounded-xl border border-slate-500/20">
                                        <div className="text-xs text-slate-400 mb-2">Agent Spend (COGS)</div>
                                        <div className="text-2xl font-mono text-white">$100.00</div>
                                    </div>
                                    <div className="text-center p-4 bg-emerald-950/30 rounded-xl border border-emerald-500/30">
                                        <div className="text-xs text-emerald-400 mb-2">Your Profit</div>
                                        <div className="text-2xl font-bold text-emerald-400">+${markup}.00</div>
                                    </div>
                                    <div className="text-center p-4 bg-purple-950/30 rounded-xl border border-purple-500/30">
                                        <div className="text-xs text-purple-400 mb-2">Client Pays</div>
                                        <div className="text-2xl font-bold text-purple-400">${100 + markup}.00</div>
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="text-sm text-white/60 mb-1">Profit Calculation</div>
                                    <div className="text-lg font-bold text-emerald-400">
                                        For every $100 spent by agents, you earn ${markup}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-emerald-500/20">
                            {/* Trust Signals */}
                            <div className="flex items-center justify-center gap-6 mb-6">
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    </div>
                                    SOC2 Compliant
                                </div>
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    </div>
                                    PCI DSS Level 1
                                </div>
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    </div>
                                    GDPR Ready
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all transform hover:scale-[1.01] border border-emerald-400/20"
                            >
                                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {isLoading ? "Finalizing Agreement..." : "Establish Commercial Relationship"}
                            </button>

                            <p className="text-center text-xs text-white/40 mt-4">
                                By creating this client, you agree to our standard terms and conditions for billing and payment processing.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
