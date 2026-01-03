import { useEffect, useRef } from 'react';
import { useDashboardStore, Transaction } from '@/store/dashboard-store';

const MERCHANTS = ['OpenAI API', 'Anthropic API', 'AWS Service', 'Google Cloud', 'Midjourney', 'Vercel Pro', 'Github Copilot'];
const AGENTS = ['Research Bot Alpha', 'Content Gen V2', 'Support Auto', 'DevOps Scalar', 'Market Analyst', 'Email Outreach'];
const CATEGORIES = ['API usage', 'Infrastructure', 'Software', 'Services'];

export const useSocket = (isActive: boolean = true) => {
    const addTransaction = useDashboardStore(state => state.addTransaction);
    const bufferRef = useRef<Transaction[]>([]);

    // Simulation Loop
    useEffect(() => {
        if (!isActive) return;

        const generateTransaction = () => {
            const isDecline = Math.random() > 0.95; // 5% decline rate
            const amount = Math.random() * 50 + 0.50;

            return {
                id: Math.random().toString(36).substr(2, 9),
                agentName: AGENTS[Math.floor(Math.random() * AGENTS.length)],
                amount: parseFloat(amount.toFixed(2)),
                merchant: MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)],
                status: isDecline ? 'declined' : 'approved',
                timestamp: new Date().toISOString(),
                category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
            } as Transaction;
        };

        const interval = setInterval(() => {
            // Simulate burstiness
            const burst = Math.random() > 0.8 ? 3 : 1;

            for (let i = 0; i < burst; i++) {
                const tx = generateTransaction();
                bufferRef.current.push(tx);
            }
        }, 2000); // New data every 2s on average

        return () => clearInterval(interval);
    }, [isActive]);

    // Flush Buffer Loop (High-Frequency Throttling via rAF)
    useEffect(() => {
        if (!isActive) return;

        let animationFrameId: number;
        let lastFlushTime = 0;
        const FLUSH_RATE_MS = 100; // Cap at ~10fps for UI stability

        const flush = (timestamp: number) => {
            if (timestamp - lastFlushTime >= FLUSH_RATE_MS) {
                if (bufferRef.current.length > 0) {
                    // Batch process buffer
                    // process.env.NODE_ENV === 'development' && console.log(`[Firehose] Flushing ${bufferRef.current.length} items`);

                    // In a real Redux/Zustand app, you might want a specific 'addBatch' action 
                    // to avoid N re-renders, but Zustand is pretty good at batching if usage is optimal.
                    // For now, iterating is acceptable given React 18 automatic batching.
                    bufferRef.current.forEach(tx => {
                        addTransaction(tx);
                    });
                    bufferRef.current = [];
                    lastFlushTime = timestamp;
                }
            }
            animationFrameId = requestAnimationFrame(flush);
        };

        animationFrameId = requestAnimationFrame(flush);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isActive, addTransaction]);
};
