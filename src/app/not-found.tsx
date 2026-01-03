"use client";

import Link from "next/link";
import { AlertTriangle, Copy, ArrowLeft, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlitchText } from "@/components/ui/glitch-text";
import { useState, useEffect } from "react";

export default function NotFound() {
    const [copied, setCopied] = useState(false);
    const [pathname, setPathname] = useState("...");
    const traceId = `req_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36).substring(4)}`;

    useEffect(() => {
        if (typeof window !== "undefined") {
            setPathname(window.location.pathname);
        }
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(traceId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
            {/* Central Visual */}
            <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-red-500/20 blur-[100px] rounded-full opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative animate-bounce-slow">
                    <AlertTriangle className="w-24 h-24 text-red-500 opacity-80" />
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent blur-sm" />
            </div>

            {/* Error Code */}
            <div className="mb-2">
                <GlitchText text="404" className="text-8xl font-mono font-bold text-white tracking-tighter" />
            </div>

            {/* Diagnosis */}
            <h1 className="text-xl text-white font-medium mb-2">Signal Lost</h1>
            <p className="text-white/40 text-center max-w-sm mb-8">
                The requested resource could not be located in the current namespace. It may have been moved, deleted, or never existed.
            </p>

            {/* Actionable Recovery */}
            <div className="flex gap-4 mb-12">
                <Button asChild variant="default" className="bg-white text-black hover:bg-white/90">
                    <Link href="/dashboard">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Return to Cockpit
                    </Link>
                </Button>
                <Button variant="outline" className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
                    <Link href="https://status.stripe.com" target="_blank">
                        Check System Status
                    </Link>
                </Button>
            </div>

            {/* Trace ID Block */}
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs relative group">
                <div className="flex justify-between items-center text-white/30 mb-2 uppercase tracking-wider text-[10px]">
                    <span className="flex items-center gap-2">
                        <Terminal className="w-3 h-3" />
                        System Diagnostic Trace
                    </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                    <code className="text-red-400/80 break-all">
                        GET {pathname} - {traceId}
                    </code>
                    <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-white"
                        title="Copy Trace ID"
                    >
                        {copied ? <span className="text-emerald-500 font-bold">Copied</span> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
                <div className="absolute inset-0 border border-red-500/10 rounded-lg pointer-events-none group-hover:border-red-500/30 transition-colors" />
            </div>
        </div>
    );
}
