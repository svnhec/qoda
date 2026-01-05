/**
 * Agents API Route
 * =============================================================================
 * GET: Returns a list of agents for the current user's organization.
 * POST: Creates a new agent.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth, isAdminOrOwner } from "@/lib/security";
import { logAuditError, logAuditEvent } from "@/lib/db/audit";
import { z } from "zod";

// Validation schema for creating an agent
const CreateAgentSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    client_id: z.string().uuid().optional(),
    monthly_budget_cents: z.number().int().positive().default(50000), // $500 default
    is_active: z.boolean().default(true),
});

/**
 * GET /api/agents - List all agents for the organization
 */
export async function GET() {
    const auth = await requireAuth();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const supabase = await createClient();

        const { data: agents, error } = await supabase
            .from("agents")
            .select(`
                id,
                name,
                description,
                is_active,
                status,
                monthly_budget_cents,
                current_spend_cents,
                client_id,
                created_at,
                updated_at,
                clients(id, name)
            `)
            .eq("organization_id", auth.organizationId)
            .order("created_at", { ascending: false });

        if (error) {
            await logAuditError({
                action: "agents_list",
                resourceType: "agents",
                error,
                userId: auth.user.id,
                organizationId: auth.organizationId,
            });
            return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
        }

        return NextResponse.json({ agents: agents || [] });
    } catch (err) {
        await logAuditError({
            action: "agents_list",
            resourceType: "agents",
            error: err,
            userId: auth.user.id,
            organizationId: auth.organizationId,
        });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

/**
 * POST /api/agents - Create a new agent
 */
export async function POST(request: NextRequest) {
    const auth = await requireAuth();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Only admin/owner can create agents
    if (!isAdminOrOwner(auth.role)) {
        return NextResponse.json(
            { error: "Admin or owner role required to create agents" },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const parsed = CreateAgentSchema.parse(body);

        const supabase = createServiceClient();

        // If client_id provided, verify it belongs to the org
        if (parsed.client_id) {
            const { data: client } = await supabase
                .from("clients")
                .select("id")
                .eq("id", parsed.client_id)
                .eq("organization_id", auth.organizationId)
                .single();

            if (!client) {
                return NextResponse.json(
                    { error: "Client not found" },
                    { status: 400 }
                );
            }
        }

        const { data: agent, error } = await supabase
            .from("agents")
            .insert({
                organization_id: auth.organizationId,
                name: parsed.name,
                description: parsed.description || null,
                client_id: parsed.client_id || null,
                monthly_budget_cents: parsed.monthly_budget_cents.toString(),
                current_spend_cents: "0",
                is_active: parsed.is_active,
                status: "green",
            })
            .select()
            .single();

        if (error) {
            await logAuditError({
                action: "create_agent",
                resourceType: "agent",
                error,
                userId: auth.user.id,
                organizationId: auth.organizationId,
            });
            return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
        }

        await logAuditEvent({
            action: "create_agent",
            resource_type: "agent",
            resource_id: agent.id,
            user_id: auth.user.id,
            organization_id: auth.organizationId,
            status: "success",
            metadata: { name: parsed.name },
        });

        return NextResponse.json({ agent }, { status: 201 });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid request body", details: err.errors },
                { status: 400 }
            );
        }

        await logAuditError({
            action: "create_agent",
            resourceType: "agent",
            error: err,
            userId: auth.user.id,
            organizationId: auth.organizationId,
        });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

