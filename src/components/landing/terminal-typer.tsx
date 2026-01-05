"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const commands = [
  { cmd: '$ qoda agents create --name "LeadGenBot"', response: "> Agent created. Card issued ending in 4242." },
  { cmd: "$ qoda limit set --agent LeadGenBot --daily 50", response: "> Daily limit set: $50.00" },
  {
    cmd: "$ qoda transactions --agent LeadGenBot --last 5",
    response:
      "> Fetching transactions...\n  OpenAI API     $0.24    2s ago\n  Anthropic      $0.18    8s ago\n  Replicate      $1.20    1m ago",
  },
  { cmd: "$ qoda balance", response: "> Available: $4,827.50\n> Reserved:  $172.50\n> Total:     $5,000.00" },
];

export function TerminalTyper() {
  const [currentCommand, setCurrentCommand] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const cmd = commands[currentCommand];

    if (!showResponse) {
      // Type the command
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex <= cmd.cmd.length) {
          setDisplayText(cmd.cmd.slice(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typeInterval);
          timeout = setTimeout(() => setShowResponse(true), 300);
        }
      }, 50);
      return () => {
        clearInterval(typeInterval);
        clearTimeout(timeout);
      };
    } else {
      // Show response, then move to next command
      timeout = setTimeout(() => {
        setShowResponse(false);
        setDisplayText("");
        setCurrentCommand((c) => (c + 1) % commands.length);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [currentCommand, showResponse]);

  return (
    <div className="font-mono text-sm">
      <div className="text-primary">
        {displayText}
        <span className={`${cursorVisible ? "opacity-100" : "opacity-0"} transition-opacity`}>▊</span>
      </div>
      {showResponse && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground mt-2 whitespace-pre-line"
        >
          {commands[currentCommand].response}
        </motion.div>
      )}
    </div>
  );
}



