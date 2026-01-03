/**
 * INTERACTIVE TERMINAL COMPONENT
 * =============================================================================
 * The "inciting incident" of the user journey - API-first signal
 *
 * Features:
 * - Types out commands character-by-character
 * - Changes commands based on scroll position (scrollytelling)
 * - Mac-style window controls
 * - Dark terminal aesthetic
 * =============================================================================
 */

"use client";

import { useState, useEffect } from "react";
import { TypeAnimation } from "react-type-animation";

interface InteractiveTerminalProps {
  section: string;
}

const COMMANDS = {
  hero: {
    command: "qoda agent issue --limit $500",
    description: "Issue a virtual card to your AI agent"
  },
  features: {
    command: "qoda invoice generate",
    description: "Generate client invoices with markup"
  },
  velocity: {
    command: "qoda agent monitor --velocity",
    description: "Monitor real-time spend velocity"
  }
};

export function InteractiveTerminal({ section }: InteractiveTerminalProps) {
  const [currentCommand, setCurrentCommand] = useState(COMMANDS.hero.command);
  const [currentDescription, setCurrentDescription] = useState(COMMANDS.hero.description);
  const [key, setKey] = useState(0); // Force re-render of TypeAnimation

  // Update command based on scroll section
  useEffect(() => {
    const commandData = COMMANDS[section as keyof typeof COMMANDS] || COMMANDS.hero;
    setCurrentCommand(commandData.command);
    setCurrentDescription(commandData.description);
    setKey(prev => prev + 1); // Trigger re-animation
  }, [section]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Mac-style window controls */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
      </div>

      {/* Terminal window */}
      <div className="bg-black/90 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
        {/* Terminal header */}
        <div className="bg-[#1a1a1a] px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs text-white/60 font-mono">qoda-cli</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400">connected</span>
          </div>
        </div>

        {/* Terminal content */}
        <div className="p-6 font-mono text-sm">
          <div className="flex items-start gap-2 mb-4">
            <span className="text-green-400">$</span>
            <div className="flex-1">
              <TypeAnimation
                key={key}
                sequence={[
                  currentCommand,
                  1000, // Pause after typing
                ]}
                wrapper="span"
                cursor={true}
                repeat={0}
                className="text-white"
                speed={50}
              />
            </div>
          </div>

          {/* Description */}
          <div className="text-white/60 text-xs mb-4">
            {currentDescription}
          </div>

          {/* Simulated response */}
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-white/5">
            <pre className="text-emerald-400 text-xs overflow-x-auto">
{`{
  "card_id": "card_1234567890",
  "last4": "4242",
  "status": "active",
  "spend_limit_cents": 50000,
  "current_spend_cents": 0
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
