/**
 * Alerts API Route
 * =============================================================================
 * GET: Returns a list of alerts for the current user's organization.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security";
import { logAuditError } from "@/lib/db/audit";

/**
 * GET /api/alerts - List all alerts for the organization
 */
export async function GET(request: NextRequest) {
    const auth = await requireAuth();
    if (!auth.success) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get("unread") === "true";
        const severity = searchParams.get("severity");
        const limit = parseInt(searchParams.get("limit") || "50", 10);

        const supabase = await createClient();

        let query = supabase
            .from("alerts")
            .select(`
                id,
                alert_type,
                severity,
                title,
                message,
                metadata,
                is_read,
                resolved_at,
                created_at
            `)
            .eq("organization_id", auth.organizationId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (unreadOnly) {
            query = query.eq("is_read", false);
        }

        if (severity) {
            query = query.eq("severity", severity);
        }

        const { data: alerts, error } = await query;

        if (error) {
            await logAuditError({
                action: "alerts_list",
                resourceType: "alerts",
                error,
                userId: auth.user.id,
                organizationId: auth.organizationId,
            });
            return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
        }

        // Get unread count
        const { count: unreadCount } = await supabase
            .from("alerts")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", auth.organizationId)
            .eq("is_read", false);

        return NextResponse.json({
            alerts: alerts || [],
            unreadCount: unreadCount || 0,
        });
    } catch (err) {
        await logAuditError({
            action: "alerts_list",
            resourceType: "alerts",
            error: err,
            userId: auth.user.id,
            organizationId: auth.organizationId,
        });
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

