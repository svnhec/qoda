"use client";

import { useState } from "react";
import {
    Key, Users, Webhook, Shield, ChevronRight, Copy, Eye, EyeOff, RotateCw, CheckCircle2, AlertTriangle, Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsHub() {
    const [activeTab, setActiveTab] = useState("developer");

    return (
        <div className="flex h-[calc(100vh-140px)] bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/10 p-4 bg-black/40 flex flex-col gap-1">
                <NavButton
                    active={activeTab === "developer"}
                    onClick={() => setActiveTab("developer")}
                    icon={Terminal}
                    label="Developer Keys"
                />
                <NavButton
                    active={activeTab === "team"}
                    onClick={() => setActiveTab("team")}
                    icon={Users}
                    label="Team Access"
                />
                <NavButton
                    active={activeTab === "webhooks"}
                    onClick={() => setActiveTab("webhooks")}
                    icon={Webhook}
                    label="Webhooks"
                />
                <div className="h-px bg-white/10 my-2" />
                <NavButton
                    active={false}
                    onClick={() => { }}
                    icon={Shield}
                    label="Audit Logs"
                    disabled
                />
            </div>

            {/* Content Panel */}
            <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-8">
                {activeTab === "developer" && <DeveloperSettings />}
                {activeTab === "team" && <TeamSettings />}
                {activeTab === "webhooks" && <WebhookSettings />}
            </div>
        </div>
    );
}

interface NavButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    disabled?: boolean;
}

function NavButton({ active, onClick, icon: Icon, label, disabled = false }: NavButtonProps) {
    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            aria-current={active ? "page" : undefined}
            aria-disabled={disabled}
            className={`flex items-center gap-3 w-full px-4 py-2 text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] ${active
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : disabled
                        ? "text-white/20 cursor-not-allowed opacity-50"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
        >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {label}
            {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" aria-hidden="true" />}
        </button>
    );
}

function DeveloperSettings() {
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText("sk_live_51M...");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">API Configuration</h2>
                <p className="text-white/40 text-sm">Manage programmatic access to your Switchboard engine.</p>
            </div>

            {/* API Key Roller */}
            <div className="p-6 border border-white/10 rounded-xl bg-white/5 relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-white font-medium flex items-center gap-2">
                            <Key className="w-4 h-4 text-amber-500" />
                            Secret Key
                        </h3>
                        <p className="text-xs text-white/40 mt-1">Used for server-side API requests. Keep this safe.</p>
                    </div>
                    <Button variant="outline" className="text-xs h-7 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400">
                        Roll Key
                    </Button>
                </div>

                <div className="flex gap-2">
                    <div
                        className="flex-1 bg-black border border-white/10 rounded-lg flex items-center px-4 font-mono text-sm text-white/80 h-10 relative overflow-hidden"
                        role="textbox"
                        aria-readonly="true"
                        aria-label="API Secret Key"
                        tabIndex={0}
                    >
                        {showKey ? "sk_live_51M0Q8...x7bA" : "••••••••••••••••••••••••••••••••"}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black pointer-events-none" />
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setShowKey(!showKey)}
                        className="w-10 px-0 border-white/10 hover:bg-white/10"
                        aria-label={showKey ? "Hide API key" : "Show API key"}
                        aria-pressed={showKey}
                    >
                        {showKey ? <EyeOff className="w-4 h-4 text-white/60" aria-hidden="true" /> : <Eye className="w-4 h-4 text-white/60" aria-hidden="true" />}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleCopy}
                        className="w-10 px-0 border-white/10 hover:bg-white/10 relative"
                        aria-label={copied ? "Key copied to clipboard" : "Copy API key to clipboard"}
                        aria-live="polite"
                    >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" /> : <Copy className="w-4 h-4 text-white/60" aria-hidden="true" />}
                    </Button>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-amber-500/80 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" />
                    Displaying full key is only allowed for 30 seconds after generation.
                </div>
            </div>

            <div className="p-6 border border-white/10 rounded-xl bg-white/5 opacity-50 pointer-events-none">
                <h3 className="text-white font-medium mb-1">Publishable Key</h3>
                <p className="text-xs text-white/40">Coming soon for client-side usage.</p>
            </div>
        </div>
    );
}

function WebhookSettings() {
    const [url, setUrl] = useState("https://api.acme.com/webhooks/switchboard");
    const [testing, setTesting] = useState(false);

    const handleTest = () => {
        setTesting(true);
        setTimeout(() => setTesting(false), 1500);
    };

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Webhooks</h2>
                <p className="text-white/40 text-sm">Real-time event notifications for your system.</p>
            </div>

            <div className="space-y-4">
                <label className="text-xs font-bold text-white/60 uppercase">Endpoint URL</label>
                <div className="flex gap-2">
                    <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                    <Button
                        onClick={handleTest}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    >
                        {testing ? <RotateCw className="w-4 h-4 animate-spin mr-2" /> : <Webhook className="w-4 h-4 mr-2" />}
                        {testing ? "Sending..." : "Test Payload"}
                    </Button>
                </div>
                <div className="text-[10px] flex items-center gap-2 text-white/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Listening for: charge.succeeded, agent.created, card.issued
                </div>
            </div>

            <div className="p-4 bg-black rounded-lg border border-white/10">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono text-white/50">Recent Deliveries</span>
                    <span className="text-[10px] text-emerald-500">All Systems Operational</span>
                </div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between py-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 text-[10px] font-mono">200 OK</span>
                            <span className="text-xs text-white/60">evt_1M{i}8s...</span>
                        </div>
                        <span className="text-[10px] text-white/30">{i}m ago</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TeamSettings() {
    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Team Management</h2>
                <p className="text-white/40 text-sm">Control who has access to the dashboard.</p>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden bg-white/5" role="table" aria-label="Team members">
                <div className="p-4 border-b border-white/10 bg-white/5 flex grid grid-cols-3 gap-4 text-xs font-bold text-white/50 uppercase" role="row">
                    <div className="col-span-2" role="columnheader">User</div>
                    <div role="columnheader">Role</div>
                </div>
                {[
                    { name: "Alice Founder", email: "alice@acme.com", role: "Owner" },
                    { name: "Bob Engineer", email: "bob@acme.com", role: "Admin" },
                    { name: "Charlie Finance", email: "charlie@acme.com", role: "Viewer" }
                ].map((user, i) => (
                    <div key={i} className="p-4 border-b last:border-0 border-white/5 grid grid-cols-3 gap-4 items-center hover:bg-white/5 transition-colors" role="row">
                        <div className="col-span-2 flex items-center gap-3" role="cell">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white" role="img" aria-label={`${user.name} avatar`}>
                                {user.name[0]}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white">{user.name}</div>
                                <div className="text-xs text-white/40">{user.email}</div>
                            </div>
                        </div>
                        <div role="cell">
                            <select
                                defaultValue={user.role}
                                aria-label={`Role for ${user.name}`}
                                className="bg-black/50 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            >
                                <option value="Owner">Owner</option>
                                <option value="Admin">Admin</option>
                                <option value="Editor">Editor</option>
                                <option value="Viewer">Viewer</option>
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 rounded-xl border border-dashed border-white/10 flex items-center justify-center">
                <Button variant="ghost" className="text-white/50 hover:text-white">
                    + Invite New Member
                </Button>
            </div>
        </div>
    );
}
