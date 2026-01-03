'use client';

/**
 * CARDS VIEW COMPONENT
 * =============================================================================
 * Grid view of all virtual cards:
 * - Visual card representation
 * - Status indicators
 * - Quick controls (freeze)
 * - Filtering
 * =============================================================================
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard,
    Search,
    Filter,
    Snowflake,
    MoreHorizontal,
    Wallet,
    Shield,
    Activity,
    Users
} from 'lucide-react';
import Link from 'next/link';

interface CardAgent {
    id: string;
    name: string;
    stripe_card_id: string;
    card_last_four: string;
    card_status: string;
    client: { name: string; id: string } | null;
    daily_limit_cents: number;
    current_day_spend_cents: number;
}

interface CardsViewProps {
    cards: CardAgent[];
    stats: {
        active: number;
        frozen: number;
        utilization: number;
        totalCards: number;
    };
}

export function CardsView({ cards, stats }: CardsViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'frozen'>('all');

    const filteredCards = cards.filter(card => {
        const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.card_last_four.includes(searchTerm);

        const matchesFilter = filter === 'all' ? true :
            filter === 'active' ? card.card_status === 'active' :
                card.card_status === 'inactive';

        return matchesSearch && matchesFilter;
    });



    return (
        <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Cards</h1>
                    <p className="text-muted-foreground mt-1">Manage virtual cards issued to your fleet</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary">
                        <Filter className="w-4 h-4 mr-2" />
                        Sort
                    </button>
                    <Link href="/dashboard/agents" className="btn-primary">
                        <Wallet className="w-4 h-4 mr-2" />
                        Issue New Card
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">{stats.totalCards}</div>
                        <div className="text-xs text-muted-foreground">Total Issued</div>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">{stats.active}</div>
                        <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Snowflake className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">{stats.frozen}</div>
                        <div className="text-xs text-muted-foreground">Frozen</div>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">{stats.utilization}%</div>
                        <div className="text-xs text-muted-foreground">Limit Utilization</div>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search cards by agent, client, or last 4..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-9 w-full"
                    />
                </div>
                <div className="flex bg-secondary rounded-lg p-1 h-10 self-start">
                    {(['all', 'active', 'frozen'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 text-sm font-medium rounded-md transition-all capitalize ${filter === f
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                    {filteredCards.map((card, index) => (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                            className="group relative"
                        >
                            {/* Card Visual */}
                            <div className={`relative aspect-[1.586/1] rounded-xl p-5 flex flex-col justify-between overflow-hidden transition-all duration-300 ${card.card_status === 'active'
                                ? 'bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 hover:border-primary/50 shadow-lg shadow-black/50'
                                : 'bg-[#0f0f0f] border border-white/5 opacity-70 grayscale'
                                }`}>
                                {/* Status Chip */}
                                <div className="flex justify-between items-start z-10">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${card.card_status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-400'}`} />
                                        <span className="text-[10px] uppercase tracking-widest text-white/50">
                                            {card.card_status === 'active' ? 'ACTIVE' : 'FROZEN'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-mono text-white/80">VISA</span>
                                    </div>
                                </div>

                                {/* Number */}
                                <div className="z-10 mt-2">
                                    <div className="font-mono text-lg text-white/90 tracking-widest flex gap-3">
                                        <span className="text-white/20">••••</span>
                                        <span className="text-white/20">••••</span>
                                        <span className="text-white/20">••••</span>
                                        <span>{card.card_last_four}</span>
                                    </div>
                                    <div className="mt-4 flex justify-between items-end">
                                        <div>
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest mb-0.5">Agent</div>
                                            <div className="text-sm font-medium text-white truncate max-w-[140px]">{card.name}</div>
                                            {card.client && (
                                                <div className="text-[10px] text-white/50 truncate max-w-[140px] flex items-center gap-1 mt-0.5">
                                                    <Users className="w-2.5 h-2.5" />
                                                    {card.client.name}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] text-white/40 uppercase tracking-widest mb-0.5">Valid Thru</div>
                                            <div className="text-sm font-mono text-white/80">12/28</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Background Accents */}
                                <div className={`absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-[60px] rounded-full pointer-events-none transition-opacity ${card.card_status === 'active' ? 'opacity-100' : 'opacity-0'}`} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                            </div>

                            {/* Controls Overlay (Slide up on hover) */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 z-20">
                                <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-xl flex items-center justify-between gap-3">
                                    <div className="text-xs">
                                        <div className="text-muted-foreground">Daily Spend</div>
                                        <div className="font-mono text-white">
                                            ${(card.current_day_spend_cents / 100).toFixed(2)} <span className="text-white/30">/ ${(card.daily_limit_cents / 100).toFixed(0)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button className="p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="Settings">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                        <Link href={`/dashboard/agents/${card.id}`} className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded hover:bg-white/90 transition-colors">
                                            Manage
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredCards.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground">No cards found</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Try adjusting your search filters or issue a new card to an agent.
                    </p>
                </div>
            )}
        </div>
    );
}
