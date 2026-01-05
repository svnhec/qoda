"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, Shield, CreditCard, ChevronRight, Store } from "lucide-react";
import { createAgentAction } from "@/app/dashboard/agents/actions";
import { logger } from "@/lib/logger";
import { VelocitySlider } from "@/components/ui/velocity-slider";

interface Client {
    id: string;
    name: string;
}

export function CreateAgentForm({ clients }: { clients: Client[] }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [template, setTemplate] = useState<"custom" | "dev" | "media" | "research">("custom");

    // Form State
    const [budget, setBudget] = useState(100);
    const [name, setName] = useState("");
    const [instantIssue, setInstantIssue] = useState(true);

    // Velocity Controls (Dual-handle sliders)
    const [softLimitPerMinute, setSoftLimitPerMinute] = useState(50);
    const [hardLimitPerMinute, setHardLimitPerMinute] = useState(100);
    const [softLimitPerDay, setSoftLimitPerDay] = useState(1000);
    const [hardLimitPerDay, setHardLimitPerDay] = useState(2000);

    // Merchant Categories
    const [allowedCategories, setAllowedCategories] = useState<string[]>(["SaaS", "Cloud Services", "AI/ML"]);

    const MERCHANT_CATEGORIES = [
        "SaaS", "Cloud Services", "AI/ML", "API Services", "Marketing Tools",
        "Dev Tools", "Content Platforms", "Data Services", "Infrastructure"
    ];

    const templates = {
        dev: {
            name: "Dev Bot",
            budget: 200,
            softLimitPerMinute: 20, hardLimitPerMinute: 50,
            softLimitPerDay: 500, hardLimitPerDay: 1000,
            categories: ["SaaS", "Dev Tools", "Cloud Services"],
            icon: "🤖"
        },
        media: {
            name: "Media Buyer",
            budget: 5000,
            softLimitPerMinute: 500, hardLimitPerMinute: 1000,
            softLimitPerDay: 20000, hardLimitPerDay: 40000,
            categories: ["Marketing Tools", "API Services", "Content Platforms"],
            icon: "📢"
        },
        research: {
            name: "Research Spider",
            budget: 800,
            softLimitPerMinute: 100, hardLimitPerMinute: 200,
            softLimitPerDay: 3000, hardLimitPerDay: 6000,
            categories: ["AI/ML", "Data Services", "API Services"],
            icon: "🕷️"
        }
    };

    const applyTemplate = (key: keyof typeof templates) => {
        setTemplate(key);
        setBudget(templates[key].budget);
        setSoftLimitPerMinute(templates[key].softLimitPerMinute);
        setHardLimitPerMinute(templates[key].hardLimitPerMinute);
        setSoftLimitPerDay(templates[key].softLimitPerDay);
        setHardLimitPerDay(templates[key].hardLimitPerDay);
        setAllowedCategories(templates[key].categories);
        // Don't override name if already typed
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const input = {
            name: formData.get("name") as string,
            description: "Created via Advanced Provisioning Wizard",
            client_id: (formData.get("client_id") as string) || null,
            monthly_budget_dollars: budget.toString(),
            soft_limit_cents_per_minute: (softLimitPerMinute * 100).toString(),
            hard_limit_cents_per_minute: (hardLimitPerMinute * 100).toString(),
            soft_limit_cents_per_day: (softLimitPerDay * 100).toString(),
            hard_limit_cents_per_day: (hardLimitPerDay * 100).toString(),
            allowed_merchant_categories: allowedCategories,
            instant_issue: instantIssue,
        };

        try {
            const result = await createAgentAction(input);
            if (result.success) {
                // If instant issue is on, we would chain a card issuance call here
                // For MVP just redirect
                router.push("/dashboard/agents");
                router.refresh();
            } else {
                alert(result.error); // Simple error handling for now
            }
        } catch (err) {
            logger.error("Agent creation failed", {
                error: err instanceof Error ? err.message : String(err)
            });
        } finally {
            setIsLoading(false);
        }
    }

    // Liability Check
    const liabilityRisk = budget > 1000 ? "High" : budget > 300 ? "Medium" : "Low";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

            {/* 1. Identity */}
            <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">1</span>
                    Agent Identity
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60 uppercase">Agent Name</label>
                        <input
                            name="name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Sales Outreach Bot"
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-white/60 uppercase">Assign to Client</label>
                        <div className="relative">
                            <select
                                name="client_id"
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:border-purple-500/50 outline-none cursor-pointer"
                            >
                                <option value="">Internal (No Client)</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 rotate-90 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Templates */}
                <div className="flex gap-2 pt-2">
                    <span className="text-xs text-white/40 py-2">Quick Start:</span>
                    {(Object.keys(templates) as Array<keyof typeof templates>).map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => applyTemplate(t)}
                            className={`px-3 py-1.5 rounded text-xs border transition-all ${template === t
                                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
                                }`}
                        >
                            {templates[t].icon} {templates[t].name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Guardrails (Financial Controls) */}
            <div className="space-y-6 p-6 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 animate-in slide-in-from-bottom duration-500 delay-100">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">2</span>
                        Control Systems
                    </h2>
                    <div className={`text-xs px-2 py-1 rounded border ${liabilityRisk === "High" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                        liabilityRisk === "Medium" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                            "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        }`}>
                        {liabilityRisk} Risk Profile
                    </div>
                </div>

                {/* Budget Slider */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            Monthly Hard Stop
                        </label>
                        <div className="text-2xl font-bold text-white tracking-tight">
                            ${budget}
                        </div>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="10000"
                        step="10"
                        value={budget}
                        onChange={(e) => {
                            setBudget(Number(e.target.value));
                            setTemplate("custom");
                        }}
                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#050505] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    />
                    <div className="flex justify-between text-xs text-white/30 font-mono">
                        <span>$10</span>
                        <span>$10,000</span>
                    </div>
                </div>

                {/* Velocity Controls - Dual-Handle Sliders */}
                <div className="space-y-8 pt-4 border-t border-white/5">
                    {/* Per Minute Limits */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-cyan-500" />
                                Per Minute Limits (Soft/Hard)
                            </label>
                            <div className="text-sm font-bold text-cyan-400 tracking-tight">
                                ${softLimitPerMinute}/${hardLimitPerMinute}
                            </div>
                        </div>
                        <VelocitySlider
                            min={10}
                            max={500}
                            step={10}
                            defaultValue={[softLimitPerMinute, hardLimitPerMinute]}
                            onValueChange={([soft, hard]) => {
                                setSoftLimitPerMinute(soft);
                                setHardLimitPerMinute(hard);
                                setTemplate("custom");
                            }}
                        />
                    </div>

                    {/* Per Day Limits */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-purple-500" />
                                Per Day Limits (Soft/Hard)
                            </label>
                            <div className="text-sm font-bold text-purple-400 tracking-tight">
                                ${softLimitPerDay}/${hardLimitPerDay}
                            </div>
                        </div>
                        <VelocitySlider
                            min={100}
                            max={10000}
                            step={100}
                            defaultValue={[softLimitPerDay, hardLimitPerDay]}
                            onValueChange={([soft, hard]) => {
                                setSoftLimitPerDay(soft);
                                setHardLimitPerDay(hard);
                                setTemplate("custom");
                            }}
                        />
                    </div>

                    <p className="text-xs text-white/40 pt-2">
                        Simulation: This agent will be <strong>alerted</strong> when passing the first threshold,
                        and <strong>blocked</strong> completely at the second.
                    </p>
                </div>

                {/* Merchant Category Whitelist */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-end">
                        <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                            <Store className="w-4 h-4 text-green-500" />
                            Merchant Categories (Whitelist)
                        </label>
                        <div className="text-xs text-white/40">
                            {allowedCategories.length} selected
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {MERCHANT_CATEGORIES.map((category) => (
                            <label key={category} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allowedCategories.includes(category)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setAllowedCategories([...allowedCategories, category]);
                                        } else {
                                            setAllowedCategories(allowedCategories.filter(c => c !== category));
                                        }
                                        setTemplate("custom");
                                    }}
                                    className="text-green-500 bg-white/10 border-white/20 focus:ring-green-500/20"
                                />
                                <span className="text-sm text-white/60">{category}</span>
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-white/40">
                        Agent can only spend on these merchant categories. Leave empty to allow all.
                    </p>
                </div>
            </div>

            {/* 3. Liability & Permissions Preview */}
            <div className="space-y-6 p-6 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 animate-in slide-in-from-bottom duration-500 delay-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">3</span>
                        Liability Assessment
                    </h2>
                    <div className={`text-xs px-2 py-1 rounded border ${liabilityRisk === "High" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                        liabilityRisk === "Medium" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                            "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        }`}>
                        {liabilityRisk} Risk Profile
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Projected Liability */}
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Max Monthly Liability</div>
                        <div className="text-2xl font-bold text-white">
                            ${budget.toLocaleString()}
                        </div>
                        <div className="text-xs text-white/40 mt-1">
                            Based on hard monthly limit
                        </div>
                    </div>

                    {/* Permissions List */}
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-white/50 uppercase tracking-wider mb-2">Permissions</div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-white/60">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Can spend on: {allowedCategories.length > 0 ? allowedCategories.slice(0, 2).join(", ") + (allowedCategories.length > 2 ? "..." : "") : "All categories"}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/60">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Velocity limits enforced
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/60">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Real-time monitoring active
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Provisioning */}
            <div className="space-y-4 animate-in slide-in-from-bottom duration-500 delay-300">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="font-medium text-white">Instant Issue Virtual Card</div>
                            <div className="text-xs text-white/50">Generate a card immediately for this agent.</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setInstantIssue(!instantIssue)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${instantIssue ? "bg-purple-500" : "bg-white/10"}`}
                    >
                        <div className={`absolute top-1 bottom-1 w-4 h-4 bg-white rounded-full transition-all ${instantIssue ? "left-7" : "left-1"}`} />
                    </button>
                </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-white/10 flex items-center gap-4">
                <button
                    type="submit"
                    disabled={isLoading || !name}
                    className="flex-1 py-4 bg-white text-black font-bold rounded-xl hover:bg-white/90 disabled:bg-white/20 disabled:text-white/30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? "Provisioning..." : "Launch Agent"}
                </button>
            </div>
        </form>
    );
}
