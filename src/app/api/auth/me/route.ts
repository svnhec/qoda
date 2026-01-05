/**
 * Auth Me API Route
 * =============================================================================
 * GET: Returns the current authenticated user's info and organization.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { logAuditError } from "@/lib/db/audit";

/**
 * GET /api/auth/me - Get current user info
 */
export async function GET() {
    const auth = await requireAuth();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const supabase = await createClient();

        // Get user profile
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("full_name, avatar_url, default_organization_id")
            .eq("id", auth.user.id)
            .single();

        // Get organization details
        const { data: org } = await supabase
            .from("organizations")
            .select(`
                id,
                name,
                slug,
                stripe_account_id,
                stripe_account_verified_at,
                markup_basis_points,
                issuing_balance_cents
            `)
            .eq("id", auth.organizationId)
            .single();

        return NextResponse.json({
            user: {
                id: auth.user.id,
                email: auth.user.email,
                full_name: profile?.full_name || null,
                avatar_url: profile?.avatar_url || null,
            },
            organization: org ? {
                id: org.id,
                name: org.name,
                slug: org.slug,
                stripe_connected: !!org.stripe_account_id,
                stripe_verified: !!org.stripe_account_verified_at,
                markup_basis_points: org.markup_basis_points || 0,
                balance_cents: org.issuing_balance_cents?.toString() || "0",
            } : null,
            role: auth.role,
        });
    } catch (err) {
        await logAuditError({
            action: "auth_me",
            resourceType: "user",
            error: err,
            userId: auth.user.id,
            organizationId: auth.organizationId,
        });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

