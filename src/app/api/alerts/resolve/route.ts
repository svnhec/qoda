/**
 * POST /api/alerts/resolve
 * Resolve alerts
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { alert_ids } = await request.json();

        if (!Array.isArray(alert_ids) || alert_ids.length === 0) {
            return NextResponse.json({ error: "alert_ids required" }, { status: 400 });
        }

        // Get org
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        if (!profile?.default_organization_id) {
            return NextResponse.json({ error: "No organization" }, { status: 400 });
        }

        // Resolve alerts (only those belonging to this org)
        const { error } = await supabase
            .from("alerts")
            .update({
                is_resolved: true,
                is_read: true,
                resolved_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq("organization_id", profile.default_organization_id)
            .in("id", alert_ids);

        if (error) {
            console.error("Resolve error:", error);
            return NextResponse.json({ error: "Failed to resolve" }, { status: 500 });
        }

        return NextResponse.json({ success: true, resolved: alert_ids.length });
    } catch (error) {
        console.error("Resolve API error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
