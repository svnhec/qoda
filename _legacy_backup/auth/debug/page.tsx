/**
 * Auth Debug Page (Development Only)
 * =============================================================================
 * Quick diagnostic page to view current authentication state and org membership.
 * This page is only accessible in development mode.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle, User, Building, Shield, ArrowLeft, RefreshCw } from "lucide-react";

export default async function AuthDebugPage() {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
        redirect("/dashboard");
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Get session info
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Get user profile if authenticated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profile: Record<string, any> | null = null;
    let memberships: Array<{
        role: string;
        organization: {
            id: string;
            name: string;
            slug: string;
        } | null;
    }> = [];

    if (user) {
        // Fetch user profile
        const { data: profileData } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single();
        profile = profileData;

        // Fetch org memberships
        const { data: membershipData } = await supabase
            .from("org_members")
            .select(`
        role,
        organization:organizations(id, name, slug)
      `)
            .eq("user_id", user.id);

        // Handle the Supabase join response - organization could be array or object
        if (membershipData) {
            memberships = membershipData.map((m) => ({
                role: m.role as string,
                organization: Array.isArray(m.organization)
                    ? m.organization[0] as { id: string; name: string; slug: string } | null
                    : m.organization as { id: string; name: string; slug: string } | null,
            }));
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        <span className="text-sm font-medium text-warning">Development Only</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Auth Debug</h1>
                </div>
                <Link
                    href="/auth/debug"
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </Link>
            </div>

            {/* Auth Status Card */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                    {user ? (
                        <CheckCircle className="w-6 h-6 text-success" />
                    ) : (
                        <AlertTriangle className="w-6 h-6 text-warning" />
                    )}
                    <h2 className="text-lg font-semibold">
                        {user ? "Authenticated" : "Not Authenticated"}
                    </h2>
                </div>

                {userError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        User Error: {userError.message}
                    </div>
                )}
                {sessionError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        Session Error: {sessionError.message}
                    </div>
                )}
            </div>

            {/* User Details */}
            {user && (
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">User Details</h2>
                    </div>

                    <div className="space-y-3">
                        <InfoRow label="User ID" value={user.id} mono />
                        <InfoRow label="Email" value={user.email || "N/A"} />
                        <InfoRow
                            label="Email Confirmed"
                            value={user.email_confirmed_at ? `Yes (${new Date(user.email_confirmed_at).toLocaleString()})` : "No"}
                        />
                        <InfoRow label="Created At" value={new Date(user.created_at).toLocaleString()} />
                        <InfoRow
                            label="Last Sign In"
                            value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"}
                        />
                        <InfoRow label="Auth Provider" value={user.app_metadata?.provider || "email"} />
                    </div>
                </div>
            )}

            {/* User Metadata */}
            {user?.user_metadata && Object.keys(user.user_metadata).length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                    <h2 className="text-lg font-semibold">User Metadata</h2>
                    <pre className="p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto">
                        {JSON.stringify(user.user_metadata, null, 2)}
                    </pre>
                </div>
            )}

            {/* Profile */}
            {profile && (
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">User Profile (user_profiles)</h2>
                    </div>
                    <pre className="p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto">
                        {JSON.stringify(profile, null, 2)}
                    </pre>
                </div>
            )}

            {/* Organizations */}
            {memberships.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <Building className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Organization Memberships</h2>
                    </div>

                    <div className="space-y-3">
                        {memberships.map((m, i) => (
                            <div key={i} className="p-4 rounded-lg bg-muted space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{m.organization?.name || "Unknown Org"}</span>
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                                        {m.role}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>Slug: <code className="px-1 py-0.5 rounded bg-background">{m.organization?.slug}</code></p>
                                    <p className="font-mono text-xs opacity-70">ID: {m.organization?.id}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Session Info */}
            {session && (
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                    <h2 className="text-lg font-semibold">Session Details</h2>
                    <div className="space-y-3">
                        <InfoRow
                            label="Access Token"
                            value={`${session.access_token.substring(0, 20)}...`}
                            mono
                        />
                        <InfoRow
                            label="Expires At"
                            value={session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : "N/A"}
                        />
                        <InfoRow label="Token Type" value={session.token_type} />
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-3">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Go to Dashboard
                </Link>
                <Link
                    href="/auth/login"
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Login Page
                </Link>
                {user && (
                    <Link
                        href="/auth/signout"
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        Sign Out
                    </Link>
                )}
            </div>
        </div>
    );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-muted-foreground shrink-0">{label}</span>
            <span className={`text-sm text-right break-all ${mono ? "font-mono text-xs" : ""}`}>
                {value}
            </span>
        </div>
    );
}
