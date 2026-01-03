import { createClient } from "@/lib/supabase/server";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface Transaction {
    id: string;
    agent: string;
    amount: string;
    merchant: string;
    time: string;
    status: "approved" | "declined" | "pending";
}

async function getRecentTransactions(organizationId: string): Promise<Transaction[]> {
    const supabase = await createClient();

    const { data: transactions } = await supabase
        .from("transaction_settlements")
        .select(`
            id,
            amount_cents,
            merchant_name,
            created_at,
            agents (
                name
            )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(10);

    if (!transactions) return [];

    // Type for the Supabase query result with nested agent data
    interface TransactionQueryResult {
        id: string;
        amount_cents: string;
        merchant_name: string | null;
        created_at: string;
        agents: { name: string }[] | { name: string } | null;
    }

    return (transactions as unknown as TransactionQueryResult[]).map((tx) => {
        // Handle both array and object forms for agents relation
        const agentName = Array.isArray(tx.agents)
            ? tx.agents[0]?.name
            : tx.agents?.name;
        return {
            id: tx.id,
            agent: agentName || "Unknown Agent",
            amount: `$${(parseInt(tx.amount_cents) / 100).toFixed(2)}`,
            merchant: tx.merchant_name || "Unknown Merchant",
            time: formatTimeAgo(new Date(tx.created_at)),
            status: "approved" as const, // All settled transactions are approved
        };
    });
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
}

export async function LiveFeed() {
    // Get user's organization
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user?.id)
        .single();

    const organizationId = profile?.default_organization_id;
    const transactions = organizationId ? await getRecentTransactions(organizationId) : [];

    return (
        <div className="h-full min-h-[400px] flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/20">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Live Transactions</h3>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                    REAL-TIME
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full">
                {transactions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
                            <span className="text-2xl opacity-50">📡</span>
                        </div>
                        <div className="text-sm font-medium">No transactions yet</div>
                        <div className="text-xs opacity-60 mt-1 max-w-[200px]">
                            Transactions will appear here once your agents start spending
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {transactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="p-3 sm:p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors animate-in slide-in-from-top-2 duration-300"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${tx.status === "declined" ? "bg-destructive/10 text-destructive" : "bg-primary/5 text-primary"
                                        }`}>
                                        {tx.agent[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm text-foreground font-medium truncate max-w-[120px] sm:max-w-xs">{tx.merchant}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-xs">{tx.agent}</div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`text-sm font-mono font-medium ${tx.status === "declined" ? "text-destructive line-through" : "text-foreground"
                                        }`}>
                                        {tx.amount}
                                    </div>
                                    <div className="text-xs text-muted-foreground">{tx.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Client-side component for Recharts
export function AnomalyMonitor() {
    const systems = [
        { name: "Velocity Limits", status: "ok" },
        { name: "Geo-Fencing", status: "ok" },
        { name: "Merchant Locking", status: "warning" },
        { name: "Budget Caps", status: "ok" }
    ];

    const data = [
        { name: 'Health', value: 98, fill: '#10b981' }
    ];

    return (
        <div className="h-full min-h-[300px] flex flex-col rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-secondary/20">
                <h3 className="text-sm font-semibold text-foreground">Anomaly Detection</h3>
            </div>

            <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                {/* Recharts Radial Bar */}
                <div className="w-full h-[180px] -mt-4 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            cx="50%"
                            cy="80%"
                            innerRadius="70%"
                            outerRadius="100%"
                            barSize={20}
                            data={data}
                            startAngle={180}
                            endAngle={0}
                        >
                            <PolarAngleAxis
                                type="number"
                                domain={[0, 100]}
                                angleAxisId={0}
                                tick={false}
                            />
                            <RadialBar
                                background={{ fill: 'rgba(255,255,255,0.05)' }}
                                dataKey="value"
                                cornerRadius={30} // Circular ends
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>

                    {/* Center Text */}
                    <div className="absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                        <div className="text-4xl font-bold text-emerald-500 tracking-tighter">98%</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-1">Health Score</div>
                    </div>
                </div>

                <div className="w-full space-y-3 mt-2">
                    {systems.map((sys) => (
                        <div key={sys.name} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{sys.name}</span>
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${sys.status === "ok" ? "bg-emerald-500" : "bg-amber-500"
                                    }`} />
                                <span className={`text-xs font-medium uppercase font-mono ${sys.status === "ok" ? "text-emerald-500" : "text-amber-500"
                                    }`}>
                                    {sys.status === "ok" ? "Active" : "Check"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
