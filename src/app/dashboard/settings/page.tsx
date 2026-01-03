/**
 * General Settings Page (Screen 13)
 * =============================================================================
 * Hub for organization settings, API keys, and team management.
 * Connects to Stripe Banking settings.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Shield, CreditCard, Users, Key } from "lucide-react";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    return (
        <div className="min-h-screen bg-[#050505] p-8 max-w-4xl mx-auto space-y-8">
            <div className="border-b border-white/10 pb-6">
                <h1 className="text-3xl font-bold text-white tracking-tight">Organization Settings</h1>
                <p className="text-white/40 mt-1">Manage your team, API keys, and financial infrastructure.</p>
            </div>

            <div className="grid gap-4">
                {/* Banking & Treasury */}
                <Link href="/dashboard/settings/connect">
                    <div className="group p-6 rounded-xl border border-white/10 bg-[#0a0a0a] hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors">Banking & Treasury</h3>
                                <p className="text-sm text-white/40">Configure Stripe Connect, issuing balances, and top-ups.</p>
                            </div>
                        </div>
                        <Settings className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                    </div>
                </Link>

                {/* Team Management (Placeholder) */}
                <div className="group p-6 rounded-xl border border-white/10 bg-[#0a0a0a] hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Team Members</h3>
                            <p className="text-sm text-white/40">Manage roles and permissions (Coming Soon).</p>
                        </div>
                    </div>
                </div>

                {/* API Keys (Placeholder) */}
                <div className="group p-6 rounded-xl border border-white/10 bg-[#0a0a0a] hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                            <Key className="w-5 h-5 text-cyan-500" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">API Keys</h3>
                            <p className="text-sm text-white/40">Manage programmatic access tokens (Coming Soon).</p>
                        </div>
                    </div>
                </div>

                {/* Security (Placeholder) */}
                <div className="group p-6 rounded-xl border border-white/10 bg-[#0a0a0a] hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Security & Compliance</h3>
                            <p className="text-sm text-white/40">Audit logs and SOC2 controls (Coming Soon).</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
