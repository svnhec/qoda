"use client";

/**
 * Interactive CLI Terminal Component
 * =============================================================================
 * Typing effect with command execution and JSON response display.
 * Signals "API-first" capability for technical users.
 * =============================================================================
 */

import { useState, useEffect, useRef } from "react";

interface Command {
    input: string;
    output: string;
    delay?: number;
}

// Commands for different sections - scrollytelling
const getCommandsForSection = (section: string): Command[] => {
    switch (section) {
        case "hero":
            return [
                {
                    input: "qoda agent issue --name 'email-outreach' --limit $500",
                    output: JSON.stringify({
                        id: "agent_3x7k9mPqR2",
                        name: "email-outreach",
                        card: {
                            last4: "4242",
                            brand: "visa",
                            exp: "12/27",
                        },
                        limits: {
                            monthly: "$500.00",
                            per_transaction: "$100.00",
                        },
                        status: "active",
                        velocity: "$0.00/min",
                    }, null, 2),
                    delay: 50,
                },
            ];

        case "features":
            return [
                {
                    input: "qoda spend stream --agent email-outreach",
                    output: JSON.stringify({
                        stream: "active",
                        velocity: "$12.47/min",
                        transactions: [
                            { merchant: "OpenAI API", amount: "$3.21", time: "2s ago" },
                            { merchant: "SendGrid", amount: "$0.85", time: "8s ago" },
                            { merchant: "AWS Lambda", amount: "$1.12", time: "15s ago" },
                        ],
                        budget_remaining: "$423.82",
                    }, null, 2),
                    delay: 40,
                },
            ];

        case "velocity":
        default:
            return [
                {
                    input: "qoda invoice generate --client 'acme-corp' --period current",
                    output: JSON.stringify({
                        invoice_id: "inv_8kL2mNpQ",
                        client: "Acme Corp",
                        period: "Jan 2026",
                        subtotal: "$2,847.00",
                        markup: "+15%",
                        total: "$3,274.05",
                        status: "ready",
                        pdf_url: "https://qoda.io/inv/8kL2mNpQ",
                    }, null, 2),
                    delay: 45,
                },
            ];
    }
};

export default function CLITerminal({ section = "hero" }: { section?: string }) {
    const [currentCommandIndex, setCurrentCommandIndex] = useState(0);
    const [displayedInput, setDisplayedInput] = useState("");
    const [displayedOutput, setDisplayedOutput] = useState("");
    const [isTypingInput, setIsTypingInput] = useState(true);
    const [showCursor, setShowCursor] = useState(true);
    const terminalRef = useRef<HTMLDivElement>(null);

    const commands = getCommandsForSection(section);
    const currentCommand = commands[currentCommandIndex];

    // Reset when section changes
    useEffect(() => {
        setCurrentCommandIndex(0);
        setDisplayedInput("");
        setDisplayedOutput("");
        setIsTypingInput(true);
    }, [section]);

    // Typing effect for input
    useEffect(() => {
        if (!currentCommand) return;

        if (isTypingInput) {
            if (displayedInput.length < currentCommand.input.length) {
                const timeout = setTimeout(() => {
                    setDisplayedInput(currentCommand.input.slice(0, displayedInput.length + 1));
                }, currentCommand.delay || 50);
                return () => clearTimeout(timeout);
            } else {
                // Finished typing input, pause then show output
                const timeout = setTimeout(() => {
                    setIsTypingInput(false);
                    setDisplayedOutput(currentCommand.output);
                }, 500);
                return () => clearTimeout(timeout);
            }
        } else {
            // Output is shown, wait and move to next command
            const timeout = setTimeout(() => {
                const nextIndex = (currentCommandIndex + 1) % commands.length;
                setCurrentCommandIndex(nextIndex);
                setDisplayedInput("");
                setDisplayedOutput("");
                setIsTypingInput(true);
            }, 4000);
            return () => clearTimeout(timeout);
        }
    }, [displayedInput, isTypingInput, currentCommand, currentCommandIndex, commands.length]);

    // Cursor blink
    useEffect(() => {
        const interval = setInterval(() => {
            setShowCursor(prev => !prev);
        }, 530);
        return () => clearInterval(interval);
    }, []);

    // Auto scroll to bottom
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [displayedOutput]);

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            {/* Terminal Window */}
            <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl">
                {/* Title Bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#111111] border-b border-white/5">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                    </div>
                    <span className="ml-4 text-xs text-white/40 font-mono">
                        qoda — bash — 80×24
                    </span>
                </div>

                {/* Terminal Content */}
                <div
                    ref={terminalRef}
                    className="p-4 h-80 overflow-y-auto font-mono text-sm"
                    style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #050505 100%)" }}
                >
                    {/* Previous commands (faded) */}
                    {commands.slice(0, currentCommandIndex).map((cmd, i) => (
                        <div key={i} className="mb-4 opacity-40">
                            <div className="flex items-start gap-2">
                                <span className="text-emerald-400">❯</span>
                                <span className="text-white/80">{cmd.input}</span>
                            </div>
                        </div>
                    ))}

                    {/* Current command */}
                    <div className="mb-4">
                        <div className="flex items-start gap-2">
                            <span className="text-emerald-400">❯</span>
                            <span className="text-white">
                                {displayedInput}
                                {isTypingInput && showCursor && (
                                    <span className="inline-block w-2 h-4 bg-emerald-400 ml-0.5 animate-pulse" />
                                )}
                            </span>
                        </div>

                        {/* Output */}
                        {!isTypingInput && displayedOutput && (
                            <div className="mt-3 pl-5">
                                <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                                    <SyntaxHighlightJSON json={displayedOutput} />
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Glow Effect */}
            <div
                className="absolute inset-0 -z-10 blur-3xl opacity-30"
                style={{
                    background: "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.3) 0%, transparent 70%)",
                }}
            />
        </div>
    );
}

function SyntaxHighlightJSON({ json }: { json: string }) {
    // Simple syntax highlighting
    const highlighted = json
        .replace(/"([^"]+)":/g, '<span class="text-purple-400">"$1"</span>:')
        .replace(/: "([^"]+)"/g, ': <span class="text-emerald-400">"$1"</span>')
        .replace(/: (\d+\.?\d*)/g, ': <span class="text-cyan-400">$1</span>')
        .replace(/: (true|false|null)/g, ': <span class="text-amber-400">$1</span>');

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}
