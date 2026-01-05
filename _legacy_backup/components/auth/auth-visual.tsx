/**
 * AUTH VISUAL COMPONENT
 * =============================================================================
 * Abstract visual for the right pane of auth pages
 * Clean, modern, with subtle animations
 * =============================================================================
 */

"use client";

import { motion } from "framer-motion";
import { Activity, CreditCard, TrendingUp, Shield } from "lucide-react";

export function AuthVisual() {
    return (
        <div className="relative w-full h-full bg-gradient-to-br from-card via-background to-card overflow-hidden">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-grid-fade opacity-50" />

            {/* Radial Gradient */}
            <div className="absolute inset-0 bg-radial-gradient" />

            {/* Content */}
            <div className="absolute inset-0 flex items-center justify-center p-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="relative"
                >
                    {/* Central Card */}
                    <div className="relative w-[400px] glass-strong rounded-2xl p-8 space-y-6">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                <Activity className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Financial Command Center</h3>
                                <p className="text-sm text-muted-foreground">Real-time AI agent observability</p>
                            </div>
                        </div>

                        {/* Stats Preview */}
                        <div className="grid grid-cols-2 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="p-4 bg-background/50 rounded-lg border border-border"
                            >
                                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
                                    <CreditCard className="w-3.5 h-3.5" />
                                    Active Cards
                                </div>
                                <div className="text-2xl font-bold font-mono text-white">24</div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="p-4 bg-background/50 rounded-lg border border-border"
                            >
                                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    This Month
                                </div>
                                <div className="text-2xl font-bold font-mono text-accent">$42.5k</div>
                            </motion.div>
                        </div>

                        {/* Transaction Preview */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="space-y-3"
                        >
                            {[
                                { agent: "Lead Gen Bot", amount: "$12.40", time: "2s ago", status: "success" },
                                { agent: "Support Agent", amount: "$8.20", time: "15s ago", status: "success" },
                                { agent: "Analytics Bot", amount: "$24.00", time: "1m ago", status: "success" },
                            ].map((tx, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + i * 0.1 }}
                                    className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-border/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="status-dot-success" />
                                        <div>
                                            <div className="text-sm font-medium text-white">{tx.agent}</div>
                                            <div className="text-xs text-muted-foreground">{tx.time}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-mono text-accent">{tx.amount}</div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Security Badge */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="flex items-center justify-center gap-2 pt-4 border-t border-border"
                        >
                            <Shield className="w-4 h-4 text-accent" />
                            <span className="text-xs text-muted-foreground">
                                Bank-grade security • Real-time controls
                            </span>
                        </motion.div>
                    </div>

                    {/* Decorative Orbits */}
                    <div className="absolute inset-0 -z-10">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-8"
                        >
                            <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary rounded-full shadow-lg shadow-primary/50" />
                        </motion.div>
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                            className="absolute -inset-16"
                        >
                            <div className="absolute top-1/2 right-0 w-1.5 h-1.5 bg-accent rounded-full shadow-lg shadow-accent/50" />
                        </motion.div>
                    </div>
                </motion.div>
            </div>

            {/* Corner Decorations */}
            <div className="absolute top-8 right-8">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="status-dot-success animate-pulse" />
                    System Operational
                </div>
            </div>

            <div className="absolute bottom-8 right-8 text-right">
                <div className="text-sm text-muted-foreground">Trusted by 200+ AI agencies</div>
                <div className="text-xs text-muted-foreground/60">$12M+ managed monthly</div>
            </div>
        </div>
    );
}
