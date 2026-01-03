"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlitchText } from "@/components/ui/glitch-text";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const traceId = error.digest || `err_${Math.random().toString(36).substring(2, 10)}`;

    useEffect(() => {
        console.error(error);
    }, [error]);

    const handleCopy = () => {
        navigator.clipboard.writeText(traceId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
            {/* Central Visual */}
            <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full opacity-20" />
                <div className="relative animate-pulse">
                    <AlertCircle className="w-24 h-24 text-amber-500 opacity-80" />
                </div>
            </div>

            {/* Error Code */}
            <div className="mb-2">
                <GlitchText text="500" className="text-8xl font-mono font-bold text-white tracking-tighter" />
            </div>

            {/* Diagnosis */}
            <h1 className="text-xl text-white font-medium mb-2">System Critical</h1>
            <p className="text-white/40 text-center max-w-sm mb-8">
                An unrecoverable exception occurred within the core engine. State has been dumped to logs.
            </p>

            {/* Actionable Recovery */}
            <div className="flex gap-4 mb-12">
                <Button onClick={reset} variant="default" className="bg-amber-500 text-black hover:bg-amber-400">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reboot Runtime
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/dashboard"} className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
                    Force Quit to Home
                </Button>
            </div>

            {/* Trace ID Block */}
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs relative group">
                <div className="flex justify-between items-center text-white/30 mb-2 uppercase tracking-wider text-[10px]">
                    <span className="flex items-center gap-2">
                        <Terminal className="w-3 h-3" />
                        Stack Token
                    </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                    <code className="text-amber-500/80 break-all">
                        {traceId} <br />
                        <span className="text-white/20 select-none">Err: {error.message.substring(0, 50)}...</span>
                    </code>
                    <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-white/10 rounded transition-colors text-white/40 hover:text-white shrink-0"
                        title="Copy Error ID"
                    >
                        {copied ? <span className="text-emerald-500 font-bold">Copied</span> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
                <div className="absolute inset-0 border border-amber-500/10 rounded-lg pointer-events-none group-hover:border-amber-500/30 transition-colors" />
            </div>
        </div>
    );
}
