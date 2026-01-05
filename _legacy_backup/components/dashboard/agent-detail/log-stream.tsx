'use client';

import { useEffect, useRef } from 'react';
import { useHoverContext } from './hover-context';

/* -------------------------------------------------------------------------
   Log Data Mock
   ------------------------------------------------------------------------- */
interface LogEntry {
    id: string;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    message: string;
    metadata?: Record<string, any>;
}

const generateLogs = (): LogEntry[] => {
    const logs: LogEntry[] = [];
    const now = new Date();

    // Generate logs for the last 24 hours, bursty
    for (let i = 0; i < 200; i++) {
        const time = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
        logs.push({
            id: Math.random().toString(36).substr(2, 9),
            timestamp: time.toISOString(),
            level: Math.random() > 0.9 ? 'ERROR' : Math.random() > 0.8 ? 'WARN' : 'INFO',
            message: 'Processing task batch...',
            metadata: { latency: Math.floor(Math.random() * 500) + 'ms', tokens: Math.floor(Math.random() * 1000) }
        });
    }
    return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

const SAMPLE_LOGS = generateLogs();

export function LogStream() {
    const { hoveredTimestamp } = useHoverContext();
    const scrollRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Auto-scroll to correlated timestamp
    useEffect(() => {
        if (!hoveredTimestamp || !scrollRef.current) return;

        // Find the closest log entry
        let bestMatch: LogEntry | null = null;
        let minDiff = Infinity;

        SAMPLE_LOGS.forEach(log => {
            const diff = Math.abs(new Date(log.timestamp).getTime() - hoveredTimestamp);
            if (diff < minDiff) {
                minDiff = diff;
                bestMatch = log;
            }
        });

        if (bestMatch && minDiff < 5 * 60 * 1000) { // Only scroll if within 5 mins
            const match = bestMatch as LogEntry;
            const el = itemRefs.current.get(match.id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight effect handled by CSS/State if needed, but smooth scroll is good feedback
            }
        }
    }, [hoveredTimestamp]);

    return (
        <div className="h-full bg-[#1e1e1e] rounded-xl border border-white/10 flex flex-col font-mono text-sm overflow-hidden">
            <div className="bg-[#252526] px-4 py-2 border-b border-black flex items-center justify-between shrink-0">
                <span className="text-white/60 text-xs uppercase">Terminal / Stream</span>
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
                {SAMPLE_LOGS.map((log) => {
                    const logTime = new Date(log.timestamp).getTime();
                    const isHighlighted = hoveredTimestamp && Math.abs(logTime - hoveredTimestamp) < 60000; // 1 min window correlation

                    return (
                        <div
                            key={log.id}
                            ref={el => {
                                if (el) itemRefs.current.set(log.id, el);
                                else itemRefs.current.delete(log.id);
                            }}
                            className={`group flex items-start gap-3 p-1 rounded transition-colors ${isHighlighted ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <span className="text-white/30 text-xs w-32 shrink-0 select-none">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>

                            <div className="flex-1 break-all">
                                <span className={`${log.level === 'ERROR' ? 'text-red-400' :
                                    log.level === 'WARN' ? 'text-amber-400' :
                                        'text-blue-400'
                                    } font-bold mr-2`}>
                                    [{log.level}]
                                </span>
                                <span className="text-[#d4d4d4] mr-2">{log.message}</span>
                                {log.metadata && (
                                    <span className="text-[#ce9178]">{JSON.stringify(log.metadata)}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div className="text-lime-500 animate-pulse mt-2">_</div>
            </div>
        </div>
    );
}
