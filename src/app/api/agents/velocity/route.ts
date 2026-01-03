/**
 * GET/POST /api/agents/velocity
 * =============================================================================
 * Real-time velocity stats for agents (for dashboard streaming).
 * 
 * GET: Returns velocity stats for an agent
 * POST: Updates velocity limits for an agent
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

// Update velocity limits schema
const UpdateVelocitySchema = z.object({
    agent_id: z.string().uuid(),
    soft_limit_cents_per_minute: z.number().int().positive().nullable().optional(),
    hard_limit_cents_per_minute: z.number().int().positive().nullable().optional(),
    soft_limit_cents_per_day: z.number().int().positive().nullable().optional(),
    hard_limit_cents_per_day: z.number().int().positive().nullable().optional(),
});

// GET: Get velocity stats for an agent
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent_id");

    if (!agentId) {
        return NextResponse.json(
            { error: "agent_id is required" },
            { status: 400 }
        );
    }

    const supabase = createServiceClient();

    // Get velocity stats using RPC function
    const { data, error } = await supabase
        .rpc("get_agent_velocity_stats", { p_agent_id: agentId });

    if (error) {
        console.error("Failed to get velocity stats:", error);
        return NextResponse.json(
            { error: "Failed to get velocity stats" },
            { status: 500 }
        );
    }

    // Also get recent transactions for sparkline
    const { data: recentTx } = await supabase
        .from("transaction_settlements")
        .select("amount_cents, created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(60); // Last 60 transactions for sparkline

    return NextResponse.json({
        velocity: data?.[0] ?? null,
        recent_transactions: recentTx?.map(tx => ({
            amount_cents: tx.amount_cents,
            created_at: tx.created_at,
        })) ?? [],
    });
}

// POST: Update velocity limits
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = UpdateVelocitySchema.parse(body);

        const supabase = createServiceClient();

        // Build update object with only provided fields
        const updates: Record<string, unknown> = {};
        if (parsed.soft_limit_cents_per_minute !== undefined) {
            updates.soft_limit_cents_per_minute = parsed.soft_limit_cents_per_minute?.toString() ?? null;
        }
        if (parsed.hard_limit_cents_per_minute !== undefined) {
            updates.hard_limit_cents_per_minute = parsed.hard_limit_cents_per_minute?.toString() ?? null;
        }
        if (parsed.soft_limit_cents_per_day !== undefined) {
            updates.soft_limit_cents_per_day = parsed.soft_limit_cents_per_day?.toString() ?? null;
        }
        if (parsed.hard_limit_cents_per_day !== undefined) {
            updates.hard_limit_cents_per_day = parsed.hard_limit_cents_per_day?.toString() ?? null;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "No velocity limits provided" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("agents")
            .update(updates)
            .eq("id", parsed.agent_id);

        if (error) {
            console.error("Failed to update velocity limits:", error);
            return NextResponse.json(
                { error: "Failed to update velocity limits" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid request body", details: err.errors },
                { status: 400 }
            );
        }

        console.error("Velocity update error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
