"use client";

import { cn } from "@/lib/utils";

interface GlitchTextProps {
    text: string;
    className?: string;
}

export function GlitchText({ text, className }: GlitchTextProps) {
    return (
        <div className={cn("relative inline-block group", className)}>
            <span className="relative z-10">{text}</span>
            <span className="absolute top-0 left-0 -ml-[2px] text-red-500 opacity-0 group-hover:opacity-100 group-hover:animate-pulse z-0 select-none">
                {text}
            </span>
            <span className="absolute top-0 left-0 ml-[2px] text-cyan-500 opacity-0 group-hover:opacity-100 group-hover:animate-pulse delay-75 z-0 select-none">
                {text}
            </span>
        </div>
    );
}
