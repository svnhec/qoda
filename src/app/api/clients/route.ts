/**
 * Clients API Route
 * =============================================================================
 * Returns a list of clients for the current user's organization.
 * Used by the agent creation form for the client dropdown.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAuditError } from "@/lib/db/audit";

export async function GET() {
    let user: { id: string } | null = null;
    try {
        const supabase = await createClient();

        // Get current user
        const {
            data: { user: userData },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !userData) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        user = userData;

        // Get user's default organization
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        if (!profile?.default_organization_id) {
            return NextResponse.json({ clients: [] });
        }

        // Get active clients
        const { data: clients, error } = await supabase
            .from("clients")
            .select("id, name")
            .eq("organization_id", profile.default_organization_id)
            .eq("is_active", true)
            .order("name");

        if (error) {
            await logAuditError({
                action: "clients_list",
                resourceType: "clients",
                error,
                userId: user.id,
                organizationId: profile.default_organization_id,
            });
            return NextResponse.json({ clients: [] });
        }

        return NextResponse.json({ clients });
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: "clients_list",
            resourceType: "api",
            error,
            userId: user?.id,
        });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
