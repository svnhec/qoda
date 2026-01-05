"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const transactions = [
  { agent: "GPT-4-Turbo", merchant: "OpenAI", amount: "$0.24", status: "approved" },
  { agent: "Claude-3", merchant: "Anthropic", amount: "$0.18", status: "approved" },
  { agent: "LeadGenBot", merchant: "Replicate", amount: "$1.20", status: "approved" },
  { agent: "DataMiner", merchant: "OpenAI", amount: "$0.08", status: "approved" },
  { agent: "ContentBot", merchant: "Anthropic", amount: "$0.32", status: "approved" },
];

export function LiveTransactionFeed() {
  const [visibleTxs, setVisibleTxs] = useState(transactions.slice(0, 3));
  const [key, setKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleTxs((prev) => {
        const newTx = transactions[Math.floor(Math.random() * transactions.length)];
        return [newTx, ...prev.slice(0, 2)];
      });
      setKey((k) => k + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-1">
      {visibleTxs.map((tx, i) => (
        <motion.div
          key={`${key}-${i}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04] last:border-0"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary live-indicator" />
            <span className="text-muted-foreground">{tx.agent}</span>
          </div>
          <span className="text-muted-foreground">{tx.merchant}</span>
          <span className="tabular-nums text-primary glow-text-green">{tx.amount}</span>
        </motion.div>
      ))}
    </div>
  );
}



