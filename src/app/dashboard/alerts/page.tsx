/**
 * ALERTS DASHBOARD
 * =============================================================================
 * Central hub for all system alerts:
 * - Card declines
 * - Spend anomalies
 * - Limit warnings
 * - System notifications
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertsView } from "@/components/dashboard/alerts/alerts-view";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Alerts | Qoda",
    description: "System notifications and anomaly detection.",
};

export default async function AlertsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login?redirect=/dashboard/alerts");

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) redirect("/dashboard?error=no_organization");

    // Fetch alerts
    const { data: alerts } = await supabase
        .from("alerts")
        .select(`
            id,
            type,
            severity,
            title,
            message,
            is_read,
            is_resolved,
            agent_id,
            transaction_id,
            metadata,
            created_at,
            agents:agent_id (name)
        `)
        .eq("organization_id", profile.default_organization_id)
        .order("created_at", { ascending: false })
        .limit(100);

    // Calculate stats
    const allAlerts = alerts || [];
    const unreadCount = allAlerts.filter(a => !a.is_read).length;
    const criticalCount = allAlerts.filter(a => a.severity === 'critical' && !a.is_resolved).length;
    const todayAlerts = allAlerts.filter(a => {
        const alertDate = new Date(a.created_at);
        const today = new Date();
        return alertDate.toDateString() === today.toDateString();
    }).length;

    return (
        <AlertsView
            alerts={allAlerts as any}
            stats={{
                total: allAlerts.length,
                unread: unreadCount,
                critical: criticalCount,
                today: todayAlerts,
            }}
        />
    );
}
