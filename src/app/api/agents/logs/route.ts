/**
 * POST /api/agents/logs
 * =============================================================================
 * Ingests operational logs from AI agents for correlation with transactions.
 * 
 * Used by agent SDKs to report their activities for the "Agent Retina" dashboard.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

// Request body schema
const AgentLogSchema = z.object({
    agent_id: z.string().uuid(),
    level: z.enum(["debug", "info", "warn", "error"]).default("info"),
    message: z.string().min(1).max(5000),
    transaction_id: z.string().optional(),
    trace_id: z.string().optional(),
    http_status: z.number().int().optional(),
    latency_ms: z.number().int().optional(),
    tokens_used: z.number().int().optional(),
    cost_cents: z.number().int().optional(),
    prompt_preview: z.string().max(500).optional(),
    response_preview: z.string().max(500).optional(),
    metadata: z.record(z.unknown()).optional(),
});

const BatchLogSchema = z.object({
    logs: z.array(AgentLogSchema).min(1).max(100),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Support both single log and batch
        let logs: z.infer<typeof AgentLogSchema>[];
        if (Array.isArray(body.logs)) {
            const parsed = BatchLogSchema.parse(body);
            logs = parsed.logs;
        } else {
            logs = [AgentLogSchema.parse(body)];
        }

        const supabase = createServiceClient();

        // Verify agent exists and get organization_id
        const agentIds = [...new Set(logs.map(l => l.agent_id))];
        const { data: agents, error: agentsError } = await supabase
            .from("agents")
            .select("id, organization_id")
            .in("id", agentIds);

        if (agentsError) {
            return NextResponse.json(
                { error: "Failed to verify agents" },
                { status: 500 }
            );
        }

        const agentOrgMap = new Map(agents?.map(a => [a.id, a.organization_id]) ?? []);

        // Prepare log entries with organization_id
        const logEntries = logs
            .filter(log => agentOrgMap.has(log.agent_id))
            .map(log => ({
                agent_id: log.agent_id,
                organization_id: agentOrgMap.get(log.agent_id)!,
                level: log.level,
                message: log.message,
                transaction_id: log.transaction_id ?? null,
                trace_id: log.trace_id ?? null,
                http_status: log.http_status ?? null,
                latency_ms: log.latency_ms ?? null,
                tokens_used: log.tokens_used ?? null,
                cost_cents: log.cost_cents ? BigInt(log.cost_cents).toString() : null,
                prompt_preview: log.prompt_preview ?? null,
                response_preview: log.response_preview ?? null,
                metadata: log.metadata ?? {},
            }));

        if (logEntries.length === 0) {
            return NextResponse.json(
                { error: "No valid agent IDs found" },
                { status: 400 }
            );
        }

        // Insert logs
        const { error: insertError } = await supabase
            .from("agent_logs")
            .insert(logEntries);

        if (insertError) {
            console.error("Failed to insert agent logs:", insertError);
            return NextResponse.json(
                { error: "Failed to store logs" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            count: logEntries.length,
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid request body", details: err.errors },
                { status: 400 }
            );
        }

        console.error("Agent logs error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
