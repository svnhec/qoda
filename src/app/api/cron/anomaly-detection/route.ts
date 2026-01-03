/**
 * GET /api/cron/anomaly-detection
 * =============================================================================
 * Cron job to detect anomalous agent spending patterns.
 * 
 * Runs every 5 minutes to:
 * 1. Calculate velocity spikes (sudden spend increases)
 * 2. Detect looping patterns (repetitive transactions)
 * 3. Auto-throttle agents that exceed thresholds
 * 4. Send alerts via user webhooks
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { triggerAgentStatusChanged, triggerBudgetExceeded } from "@/lib/webhooks";

// Authenticate with CRON_SECRET
const CRON_SECRET = process.env.CRON_SECRET;

// Thresholds for anomaly detection
const AUTO_THROTTLE_VELOCITY = 100000; // $1000/min = auto-throttle
const CRITICAL_ANOMALY_SCORE = 80; // Score above this triggers throttle

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    const results = {
        agents_checked: 0,
        anomalies_detected: 0,
        agents_throttled: 0,
        alerts_sent: 0,
    };

    try {
        const supabase = createServiceClient();

        // Get all active agents with recent activity
        const { data: agents, error: agentsError } = await supabase
            .from("agents")
            .select(`
                id,
                organization_id,
                name,
                status,
                current_velocity_cents_per_minute,
                soft_limit_cents_per_minute,
                hard_limit_cents_per_minute,
                monthly_budget_cents,
                current_spend_cents
            `)
            .eq("is_active", true);

        if (agentsError || !agents) {
            console.error("Failed to fetch agents:", agentsError);
            return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
        }

        results.agents_checked = agents.length;

        for (const agent of agents) {
            try {
                const anomalyScore = await calculateAnomalyScore(supabase, agent);

                // Check for velocity spike
                const velocity = BigInt(agent.current_velocity_cents_per_minute || '0');

                let shouldThrottle = false;
                let shouldAlert = false;

                // Auto-throttle if velocity exceeds threshold
                if (velocity > BigInt(AUTO_THROTTLE_VELOCITY)) {
                    shouldThrottle = true;
                    results.anomalies_detected++;
                }

                // Auto-throttle if anomaly score is critical
                if (anomalyScore > CRITICAL_ANOMALY_SCORE) {
                    shouldThrottle = true;
                    results.anomalies_detected++;
                }

                // Alert if approaching budget
                const budgetCents = BigInt(agent.monthly_budget_cents);
                const spendCents = BigInt(agent.current_spend_cents);
                if (budgetCents > 0n && spendCents * 100n / budgetCents >= 90n) {
                    shouldAlert = true;
                }

                // Update agent status if needed
                if (shouldThrottle && agent.status !== 'red') {
                    await supabase
                        .from("agents")
                        .update({ status: 'yellow', status_changed_at: new Date().toISOString() })
                        .eq("id", agent.id);

                    results.agents_throttled++;

                    // Trigger webhook
                    await triggerAgentStatusChanged(agent.organization_id, {
                        id: agent.id,
                        name: agent.name,
                        status: 'yellow',
                        previous_status: agent.status,
                    });

                    results.alerts_sent++;
                }

                // Send budget warning
                if (shouldAlert) {
                    await triggerBudgetExceeded(agent.organization_id, {
                        id: agent.id,
                        name: agent.name,
                        budget_cents: agent.monthly_budget_cents,
                        spend_cents: agent.current_spend_cents,
                    });

                    results.alerts_sent++;
                }
            } catch (err) {
                console.error(`Failed to process agent ${agent.id}:`, err);
            }
        }

        const processingTimeMs = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            ...results,
            processing_time_ms: processingTimeMs,
        });
    } catch (err) {
        console.error("Anomaly detection cron error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Calculate anomaly score (0-100) for an agent based on recent transactions.
 */
async function calculateAnomalyScore(
    supabase: ReturnType<typeof createServiceClient>,
    agent: { id: string }
): Promise<number> {
    // Get recent transactions (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: recentTx, error } = await supabase
        .from("transaction_settlements")
        .select("amount_cents, merchant_name, created_at")
        .eq("agent_id", agent.id)
        .gte("created_at", fiveMinutesAgo)
        .order("created_at", { ascending: false });

    if (error || !recentTx || recentTx.length === 0) {
        return 0;
    }

    let score = 0;

    // Factor 1: Transaction count (more than 10 in 5 min = suspicious)
    if (recentTx.length > 10) {
        score += Math.min(30, recentTx.length * 2);
    }

    // Factor 2: Repeated identical amounts (loop detection)
    const amountCounts = new Map<string, number>();
    for (const tx of recentTx) {
        const count = (amountCounts.get(tx.amount_cents) || 0) + 1;
        amountCounts.set(tx.amount_cents, count);
    }

    const maxRepeats = Math.max(...amountCounts.values());
    if (maxRepeats >= 5) {
        score += Math.min(40, maxRepeats * 5);
    }

    // Factor 3: Same merchant repeated
    const merchantCounts = new Map<string, number>();
    for (const tx of recentTx) {
        if (tx.merchant_name) {
            const count = (merchantCounts.get(tx.merchant_name) || 0) + 1;
            merchantCounts.set(tx.merchant_name, count);
        }
    }

    const maxMerchantRepeats = Math.max(...merchantCounts.values());
    if (maxMerchantRepeats >= 5) {
        score += Math.min(30, maxMerchantRepeats * 3);
    }

    return Math.min(100, score);
}
