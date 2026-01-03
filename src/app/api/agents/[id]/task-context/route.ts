/**
 * API: Agent Task Context
 * =============================================================================
 * POST /api/agents/[id]/task-context
 * 
 * Allows AI agents to set task context for their transactions.
 * This enables cost attribution by workflow/task.
 * 
 * Body:
 * {
 *   "task_id": "task_123",
 *   "task_name": "Q1 Email Campaign",
 *   "task_category": "email_outreach",
 *   "task_context": { ... }
 * }
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface TaskContextBody {
    task_id: string;
    task_name?: string;
    task_category?: string;
    task_context?: Record<string, unknown>;
    clear?: boolean; // If true, clears the task context
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: agentId } = await params;

    try {
        const body = await request.json() as TaskContextBody;

        if (!body.task_id && !body.clear) {
            return NextResponse.json(
                { error: "task_id is required unless clearing context" },
                { status: 400 }
            );
        }

        const supabase = createServiceClient();

        // Verify agent exists
        const { data: agent, error: agentError } = await supabase
            .from("agents")
            .select("id, name, organization_id")
            .eq("id", agentId)
            .single();

        if (agentError || !agent) {
            return NextResponse.json(
                { error: "Agent not found" },
                { status: 404 }
            );
        }

        // Store task context in agent's metadata
        const taskContext = body.clear ? null : {
            task_id: body.task_id,
            task_name: body.task_name || body.task_id,
            task_category: body.task_category || "general",
            task_context: body.task_context || {},
            set_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
            .from("agents")
            .update({
                metadata: {
                    ...((agent as any).metadata || {}),
                    current_task: taskContext,
                },
            })
            .eq("id", agentId);

        if (updateError) {
            console.error("Failed to update agent task context:", updateError);
            return NextResponse.json(
                { error: "Failed to update task context" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            agent_id: agentId,
            task: taskContext,
        });

    } catch (err) {
        console.error("Task context error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET current task context
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: agentId } = await params;

    try {
        const supabase = createServiceClient();

        const { data: agent, error } = await supabase
            .from("agents")
            .select("id, name, metadata")
            .eq("id", agentId)
            .single();

        if (error || !agent) {
            return NextResponse.json(
                { error: "Agent not found" },
                { status: 404 }
            );
        }

        const metadata = (agent as any).metadata || {};

        return NextResponse.json({
            agent_id: agentId,
            agent_name: agent.name,
            current_task: metadata.current_task || null,
        });

    } catch (err) {
        console.error("Get task context error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
