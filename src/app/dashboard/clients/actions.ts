"use server";

/**
 * Client Server Actions
 * =============================================================================
 * Server actions for client CRUD operations.
 * Uses Supabase with RLS for data access and audit logging for all errors.
 * =============================================================================
 */

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAuditError } from "@/lib/db/audit";
import {
    validateCreateClient,
    validateUpdateClient,
} from "@/lib/validation/client";
import type { Client, ClientInsert, ClientUpdate } from "@/lib/db/types";

export type ClientActionResult =
    | { success: true; data?: Client; message?: string }
    | { success: false; error: string };

/**
 * Get the current user's default organization ID.
 * Returns null if not authenticated or no organization.
 */
async function getOrganizationId(): Promise<{
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
 * Create a new client.
 */
export async function createClientAction(
    input: unknown
): Promise<ClientActionResult> {
    try {
        // Validate input
        const validated = validateCreateClient(input);

        // Get organization context
        const { organizationId, userId, error: contextError } = await getOrganizationId();

        if (!organizationId) {
            return { success: false, error: contextError || "No organization" };
        }

        const supabase = await createSupabaseClient();

        // Prepare insert data
        const insertData: ClientInsert = {
            organization_id: organizationId,
            name: validated.name,
            contact_email: validated.contact_email,
            contact_phone: validated.contact_phone,
            metadata: validated.metadata,
        };

        // Insert client
        const { data, error } = await supabase
            .from("clients")
            .insert(insertData)
            .select()
            .single();

        if (error) {
            await logAuditError({
                action: "create_client",
                resourceType: "client",
                error,
                userId: userId || undefined,
                organizationId,
                metadata: { input: validated },
            });
            return { success: false, error: error.message };
        }

        // Revalidate the clients list
        revalidatePath("/dashboard/clients");

        return {
            success: true,
            data: data as Client,
            message: "Client created successfully"
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: "create_client",
            resourceType: "client",
            error,
            metadata: { input },
        });

        // Return Zod validation errors nicely
        if (error.name === "ZodError") {
            return { success: false, error: "Invalid input. Please check all fields." };
        }

        return { success: false, error: "Failed to create client" };
    }
}

/**
 * Update an existing client.
 */
export async function updateClient(
    clientId: string,
    input: unknown
): Promise<ClientActionResult> {
    try {
        // Validate input
        const validated = validateUpdateClient(input);

        // Get organization context
        const { organizationId, userId, error: contextError } = await getOrganizationId();

        if (!organizationId) {
            return { success: false, error: contextError || "No organization" };
        }

        const supabase = await createSupabaseClient();

        // Prepare update data (only include defined fields)
        const updateData: ClientUpdate = {};
        if (validated.name !== undefined) updateData.name = validated.name;
        if (validated.contact_email !== undefined) updateData.contact_email = validated.contact_email;
        if (validated.contact_phone !== undefined) updateData.contact_phone = validated.contact_phone;
        if (validated.is_active !== undefined) updateData.is_active = validated.is_active;
        if (validated.metadata !== undefined) updateData.metadata = validated.metadata;

        // Update client (RLS ensures org access)
        const { data, error } = await supabase
            .from("clients")
            .update(updateData)
            .eq("id", clientId)
            .eq("organization_id", organizationId) // Extra safety
            .select()
            .single();

        if (error) {
            await logAuditError({
                action: "update_client",
                resourceType: "client",
                resourceId: clientId,
                error,
                userId: userId || undefined,
                organizationId,
                metadata: { input: validated },
            });
            return { success: false, error: error.message };
        }

        // Revalidate paths
        revalidatePath("/dashboard/clients");
        revalidatePath(`/dashboard/clients/${clientId}`);

        return {
            success: true,
            data: data as Client,
            message: "Client updated successfully"
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: "update_client",
            resourceType: "client",
            resourceId: clientId,
            error,
            metadata: { input },
        });

        if (error.name === "ZodError") {
            return { success: false, error: "Invalid input. Please check all fields." };
        }

        return { success: false, error: "Failed to update client" };
    }
}

/**
 * Toggle client active status (deactivate/reactivate).
 */
export async function toggleClientActive(
    clientId: string,
    isActive: boolean
): Promise<ClientActionResult> {
    try {
        // Get organization context
        const { organizationId, userId, error: contextError } = await getOrganizationId();

        if (!organizationId) {
            return { success: false, error: contextError || "No organization" };
        }

        const supabase = await createSupabaseClient();

        // Update active status
        const { data, error } = await supabase
            .from("clients")
            .update({ is_active: isActive })
            .eq("id", clientId)
            .eq("organization_id", organizationId)
            .select()
            .single();

        if (error) {
            await logAuditError({
                action: isActive ? "reactivate_client" : "deactivate_client",
                resourceType: "client",
                resourceId: clientId,
                error,
                userId: userId || undefined,
                organizationId,
            });
            return { success: false, error: error.message };
        }

        // Revalidate paths
        revalidatePath("/dashboard/clients");
        revalidatePath(`/dashboard/clients/${clientId}`);

        return {
            success: true,
            data: data as Client,
            message: isActive ? "Client reactivated" : "Client deactivated"
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: isActive ? "reactivate_client" : "deactivate_client",
            resourceType: "client",
            resourceId: clientId,
            error,
        });
        return { success: false, error: "Failed to update client status" };
    }
}

/**
 * Delete a client (permanently).
 * In most cases, prefer toggleClientActive instead.
 */
export async function deleteClient(
    clientId: string
): Promise<ClientActionResult> {
    try {
        // Get organization context
        const { organizationId, userId, error: contextError } = await getOrganizationId();

        if (!organizationId) {
            return { success: false, error: contextError || "No organization" };
        }

        const supabase = await createSupabaseClient();

        // Delete client (RLS enforces access)
        const { error } = await supabase
            .from("clients")
            .delete()
            .eq("id", clientId)
            .eq("organization_id", organizationId);

        if (error) {
            await logAuditError({
                action: "delete_client",
                resourceType: "client",
                resourceId: clientId,
                error,
                userId: userId || undefined,
                organizationId,
            });
            return { success: false, error: error.message };
        }

        // Revalidate paths
        revalidatePath("/dashboard/clients");

        return {
            success: true,
            message: "Client deleted successfully"
        };
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: "delete_client",
            resourceType: "client",
            resourceId: clientId,
            error,
        });
        return { success: false, error: "Failed to delete client" };
    }
}
