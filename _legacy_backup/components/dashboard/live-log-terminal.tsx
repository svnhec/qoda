"use client";

import { useState, useEffect, useRef } from "react";
import { Pause, Play, Download, TerminalSquare } from "lucide-react";

interface LogEntry {
    id: string;
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR" | "DEBUG";
    method?: string;
    path?: string;
    status?: number;
    duration?: string;
    message: string;
}

export function LiveLogTerminal({
    agentName,
    isPaused: externalPaused,
    hoveredTimestamp
}: {
    agentName: string;
    isPaused?: boolean;
    hoveredTimestamp?: string | null;
}) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [isScrollPaused, setIsScrollPaused] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll (unless user scrolled up)
    useEffect(() => {
        if (!isPaused && !externalPaused && !isScrollPaused && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isPaused, externalPaused, isScrollPaused]);

    // Detect user scrolling
    useEffect(() => {
        const handleScroll = () => {
            if (!scrollRef.current) return;
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
            setIsScrollPaused(!isAtBottom);
        };

        const element = scrollRef.current;
        if (element) {
            element.addEventListener('scroll', handleScroll);
            return () => element.removeEventListener('scroll', handleScroll);
        }

        return undefined;
    }, []);

    // Generate mock logs
    useEffect(() => {
        const interval = setInterval(() => {
            if (isPaused || externalPaused) return;

            const now = new Date();
            const timeStr = (now.toISOString().split("T")[1] || "").slice(0, 12);

            const endpoints = ["/v1/chat/completions", "/v1/embeddings", "/v1/images/generations", "/search"];
            const methods = ["POST", "GET"];
            const statuses = [200, 200, 200, 201, 204, 400, 429, 500];

            const type = Math.random();
            let log: LogEntry;

            if (type > 0.3) {
                // API Call
                const status = statuses[Math.floor(Math.random() * statuses.length)] || 200;
                log = {
                    id: Math.random().toString(36),
                    timestamp: timeStr,
                    level: status >= 500 ? "ERROR" : status === 429 ? "WARN" : "INFO",
                    method: methods[Math.floor(Math.random() * methods.length)] || "POST",
                    path: endpoints[Math.floor(Math.random() * endpoints.length)] || "/v1/api",
                    status: status,
                    duration: `${Math.floor(Math.random() * 500 + 50)}ms`,
                    message: status === 200 ? "Request processed successfully" : status === 429 ? "Rate limit exceeded" : "Internal server error"
                };
            } else {
                // System Log
                log = {
                    id: Math.random().toString(36),
                    timestamp: timeStr,
                    level: "DEBUG",
                    message: `Processing context window: ${Math.floor(Math.random() * 8000)} tokens`
                };
            }

            setLogs(prev => [...prev.slice(-100), log]); // Keep last 100
        }, 1500);

        return () => clearInterval(interval);
    }, [isPaused, externalPaused]);

    return (
        <div className="flex flex-col h-full rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden font-mono text-xs">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#111]">
                <div className="flex items-center gap-2">
                    <TerminalSquare className="w-4 h-4 text-white/50" />
                    <span className="text-white/70 font-medium">Live Output: {agentName}.log</span>
                    {isScrollPaused && (
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            Paused (scroll up)
                        </span>
                    )}
                    {hoveredTimestamp && (
                        <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                            Correlating...
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title={isPaused ? "Resume live output" : "Pause live output"}
                    >
                        {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </button>
                    <button
                        className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title="Download logs"
                    >
                        <Download className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Terminal Body */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                {logs.length === 0 && (
                    <div className="text-white/30 italic">Targeting {agentName}... output stream initialized.</div>
                )}

                {logs.map((log) => {
                    // Simple correlation: highlight logs within ~5 minutes of hovered timestamp
                    const isCorrelated = hoveredTimestamp && Math.abs(
                        new Date(`2024-01-01T${log.timestamp}Z`).getTime() -
                        new Date(hoveredTimestamp).getTime()
                    ) < 5 * 60 * 1000; // 5 minutes

                    return (
                        <div key={log.id} className={`flex gap-3 animate-in fade-in duration-300 ${
                            isCorrelated ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''
                        }`}>
                            <span className="text-white/30 shrink-0 select-none">{log.timestamp}</span>
                            <span className={`shrink-0 font-bold w-12 text-center select-none rounded-[2px] ${log.level === "INFO" ? "text-cyan-400 bg-cyan-950/30" :
                                log.level === "WARN" ? "text-amber-400 bg-amber-950/30" :
                                    log.level === "ERROR" ? "text-red-400 bg-red-950/30" :
                                        "text-white/40"
                                }`}>
                                {log.level}
                            </span>
                            <div className="flex-1 break-all text-white/80">
                                {log.method && (
                                    <span className="text-purple-400 mr-2">{log.method}</span>
                                )}
                                {log.path && (
                                    <span className="text-white/90 mr-2">{log.path}</span>
                                )}
                                {log.status && (
                                    <span className={`mr-2 ${log.status >= 500 ? "text-red-500" :
                                        log.status >= 400 ? "text-amber-500" :
                                            "text-emerald-500"
                                        }`}>{log.status}</span>
                                )}
                                <span className="text-white/60">{log.message}</span>
                                {log.duration && (
                                    <span className="ml-2 text-white/30 opacity-50">({log.duration})</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
