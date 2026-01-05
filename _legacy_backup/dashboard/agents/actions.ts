"use server";

/**
 * Agent Server Actions
 * =============================================================================
 * Server actions for agent CRUD operations.
 * Uses Supabase with RLS for data access and audit logging for all errors.
 * Money fields: input as dollars string → store as cents BigInt
 * =============================================================================
 */

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAuditError } from "@/lib/db/audit";
import {
    validateCreateAgent,
    validateUpdateAgent,
    toAgentInsert,
    toAgentUpdate,
} from "@/lib/validation/agent";
import { serializeAgentInsert, serializeAgentUpdate, type Agent, type AgentRow, parseAgent } from "@/lib/db/types";

export type AgentActionResult =
    | { success: true; data?: Agent; message?: string }
    | { success: false; error: string };

/**
 * Get the current user's default organization ID.
 */
async function getOrganizationContext(): Promise<{
    organizationId: string | null;
    userId: string | null;
    error?: string;
}> {
    const supabase = await createSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { organizationId: null, userId: null, error: "Not authenticated" };
    }

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) {
        return { organizationId: null, userId: user.id, error: "No organization found" };
    }

    return { organizationId: profile.default_organization_id, userId: user.id };
}

/**
 * Create a new agent.
 * Input: { name, description?, client_id?, monthly_budget_dollars }
 * Converts dollars to cents internally.
 */
export async function createAgentAction(
    input: unknown
): Promise<AgentActionResult> {
    try {
        // Validate and transform input (dollars → cents)
        const validated = validateCreateAgent(input);
        const insertData = toAgentInsert(validated);

        // Get organization context
        const { organizationId, userId, error: contextError } = await getOrganizationContext();

        if (!organizationId) {
            return { success: false, error: contextError || "No organization" };
        }

        const supabase = await createSupabaseClient();

        // Serialize BigInt cents to string for database
        const dbInsert = serializeAgentInsert({
            ...insertData,
            organization_id: organizationId,
        });

        // Insert agent
        const { data, error } = await supabase
            .from("agents")
            .insert(dbInsert)
            .select()
            .single();

        if (error) {
            await logAuditError({
                action: "create_agent",
                resourceType: "agent",
                error,
                userId: userId || undefined,
                organizationId,
                metadata: { input: validated },
            });
            return { success: false, error: error.message };
        }

        // Parse the response (string → BigInt)
        const agent = parseAgent(data as AgentRow);

        // Revalidate the agents list
        revalidatePath("/dashboard/agents");

        return {
            success: true,
            data: agent,
            message: "Agent created successfully"
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: "create_agent",
            resourceType: "agent",
            error,
            metadata: { input },
        });

        if (error.name === "ZodError") {
            return { success: false, error: "Invalid input. Please check all fields." };
        }

        return { success: false, error: "Failed to create agent" };
    }
}

/**
 * Update an existing agent.
 */
export async function updateAgentAction(
    agentId: string,
    input: unknown
): Promise<AgentActionResult> {
    try {
        // Validate and transform input
        const validated = validateUpdateAgent(input);
        const updateData = toAgentUpdate(validated);

        // Get organization context
        const { organizationId, userId, error: contextError } = await getOrganizationContext();

        if (!organizationId) {
            return { success: false, error: contextError || "No organization" };
        }

        const supabase = await createSupabaseClient();

        // Serialize BigInt to string for database
        const dbUpdate = serializeAgentUpdate(updateData as Parameters<typeof serializeAgentUpdate>[0]);

        // Update agent (RLS ensures org access)
        const { data, error } = await supabase
            .from("agents")
            .update(dbUpdate)
            .eq("id", agentId)
            .eq("organization_id", organizationId)
            .select()
            .single();

        if (error) {
            await logAuditError({
                action: "update_agent",
                resourceType: "agent",
                resourceId: agentId,
                error,
                userId: userId || undefined,
                organizationId,
                metadata: { input: validated },
            });
            return { success: false, error: error.message };
        }

        const agent = parseAgent(data as AgentRow);

        // Revalidate paths
        revalidatePath("/dashboard/agents");
        revalidatePath(`/dashboard/agents/${agentId}`);

        return {
            success: true,
            data: agent,
            message: "Agent updated successfully"
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: "update_agent",
            resourceType: "agent",
            resourceId: agentId,
            error,
            metadata: { input },
        });

        if (error.name === "ZodError") {
            return { success: false, error: "Invalid input. Please check all fields." };
        }

        return { success: false, error: "Failed to update agent" };
    }
}

/**
 * Toggle agent active status.
 */
export async function toggleAgentActive(
    agentId: string,
    isActive: boolean
): Promise<AgentActionResult> {
    try {
        const { organizationId, userId, error: contextError } = await getOrganizationContext();

        if (!organizationId) {
            return { success: false, error: contextError || "No organization" };
        }

        const supabase = await createSupabaseClient();

        const { data, error } = await supabase
            .from("agents")
            .update({ is_active: isActive })
            .eq("id", agentId)
            .eq("organization_id", organizationId)
            .select()
            .single();

        if (error) {
            await logAuditError({
                action: isActive ? "reactivate_agent" : "deactivate_agent",
                resourceType: "agent",
                resourceId: agentId,
                error,
                userId: userId || undefined,
                organizationId,
            });
            return { success: false, error: error.message };
        }

        const agent = parseAgent(data as AgentRow);

        revalidatePath("/dashboard/agents");
        revalidatePath(`/dashboard/agents/${agentId}`);

        return {
            success: true,
            data: agent,
            message: isActive ? "Agent activated" : "Agent deactivated"
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: isActive ? "reactivate_agent" : "deactivate_agent",
            resourceType: "agent",
            resourceId: agentId,
            error,
        });
        return { success: false, error: "Failed to update agent status" };
    }
}

/**
 * Delete an agent.
 */
export async function deleteAgentAction(
    agentId: string
): Promise<AgentActionResult> {
    try {
        const { organizationId, userId, error: contextError } = await getOrganizationContext();

        if (!organizationId) {
            return { success: false, error: contextError || "No organization" };
        }

        const supabase = await createSupabaseClient();

        const { error } = await supabase
            .from("agents")
            .delete()
            .eq("id", agentId)
            .eq("organization_id", organizationId);

        if (error) {
            await logAuditError({
                action: "delete_agent",
                resourceType: "agent",
                resourceId: agentId,
                error,
                userId: userId || undefined,
                organizationId,
            });
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard/agents");

        return {
            success: true,
            message: "Agent deleted successfully"
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: "delete_agent",
            resourceType: "agent",
            resourceId: agentId,
            error,
        });
        return { success: false, error: "Failed to delete agent" };
    }
}
