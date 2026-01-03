/**
 * GET/POST /api/agents/[id]/status
 * =============================================================================
 * Circuit breaker controls for agent status (green/yellow/red).
 * 
 * SECURITY: Requires authentication and verifies agent belongs to user's org.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth, isAdminOrOwner } from "@/lib/security";
import { z } from "zod";
import { triggerAgentStatusChanged } from "@/lib/webhooks";
import { logAuditError } from "@/lib/db/audit";

const StatusSchema = z.object({
    status: z.enum(["green", "yellow", "red"]),
    reason: z.string().optional(),
});

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET: Get current agent status
export async function GET(
    _request: NextRequest,
    context: RouteContext
) {
    // Authenticate user
    const auth = await requireAuth();
    if (!auth.success) {
        return NextResponse.json(
            { error: auth.error },
            { status: auth.status }
        );
    }

    const { id: agentId } = await context.params;
    const supabase = await createClient();

    // Query agent with RLS (user can only see their org's agents)
    const { data, error } = await supabase
        .from("agents")
        .select("id, name, status, status_changed_at, is_active, organization_id")
        .eq("id", agentId)
        .single();

    if (error || !data) {
        return NextResponse.json(
            { error: "Agent not found" },
            { status: 404 }
        );
    }

    // Verify agent belongs to user's organization
    if (data.organization_id !== auth.organizationId) {
        return NextResponse.json(
            { error: "Agent not found" },
            { status: 404 }
        );
    }

    // Return without organization_id for API response
    const agentData = {
        id: data.id,
        name: data.name,
        status: data.status,
        status_changed_at: data.status_changed_at,
        is_active: data.is_active
    };
    return NextResponse.json(agentData);
}

// POST: Update agent status (circuit breaker)
export async function POST(
    request: NextRequest,
    context: RouteContext
) {
    // Authenticate user
    const auth = await requireAuth();
    if (!auth.success) {
        return NextResponse.json(
            { error: auth.error },
            { status: auth.status }
        );
    }

    // Only admin/owner can change agent status
    if (!isAdminOrOwner(auth.role)) {
        return NextResponse.json(
            { error: "Admin or owner role required to change agent status" },
            { status: 403 }
        );
    }

    const { id: agentId } = await context.params;

    try {
        const body = await request.json();
        const parsed = StatusSchema.parse(body);

        const supabase = await createClient();

        // First verify agent belongs to user's organization
        const { data: existingAgent, error: fetchError } = await supabase
            .from("agents")
            .select("id, organization_id, status")
            .eq("id", agentId)
            .single();

        if (fetchError || !existingAgent) {
            return NextResponse.json(
                { error: "Agent not found" },
                { status: 404 }
            );
        }

        if (existingAgent.organization_id !== auth.organizationId) {
            return NextResponse.json(
                { error: "Agent not found" },
                { status: 404 }
            );
        }

        const previousStatus = existingAgent.status;

        // Use service client for update to ensure it goes through
        const serviceClient = createServiceClient();
        const { data, error } = await serviceClient
            .from("agents")
            .update({
                status: parsed.status,
                status_changed_at: new Date().toISOString(),
            })
            .eq("id", agentId)
            .eq("organization_id", auth.organizationId) // Double-check org ownership
            .select("id, name, status, status_changed_at")
            .single();

        if (error) {
            console.error("Failed to update agent status:", error);
            await logAuditError({
                action: "update_agent_status",
                resourceType: "agent",
                resourceId: agentId,
                error,
                userId: auth.user.id,
                organizationId: auth.organizationId,
            });
            return NextResponse.json(
                { error: "Failed to update status" },
                { status: 500 }
            );
        }

        // Trigger user webhooks for status change (fire-and-forget)
        if (data) {
            triggerAgentStatusChanged(auth.organizationId, {
                id: data.id,
                name: data.name,
                status: data.status,
                previous_status: previousStatus,
            }).catch(console.error);
        }

        return NextResponse.json({
            success: true,
            agent: data,
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid request body", details: err.errors },
                { status: 400 }
            );
        }

        console.error("Status update error:", err);
        await logAuditError({
            action: "update_agent_status",
            resourceType: "agent",
            resourceId: agentId,
            error: err,
            userId: auth.user.id,
            organizationId: auth.organizationId,
        });
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
