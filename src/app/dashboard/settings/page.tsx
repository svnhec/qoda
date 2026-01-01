/**
 * Settings Overview Page
 * =============================================================================
 * Main settings page showing all available settings sections.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    CreditCard,
    Building2,
    Users,
    Bell,
    Shield,
    Palette,
    ChevronRight,
    CheckCircle,
    AlertCircle
} from "lucide-react";

export default async function SettingsPage() {
    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/auth/login?redirect=/dashboard/settings");
    }

    // Get user's default organization
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) {
        redirect("/dashboard?error=no_organization");
    }

    const organizationId = profile.default_organization_id;

    // Get organization details including Stripe status
    const { data: org } = await supabase
        .from("organizations")
        .select(`
      id,
      name,
      slug,
      stripe_account_id,
      stripe_account_verified_at,
      markup_basis_points,
      billing_email
    `)
        .eq("id", organizationId)
        .single();

    // Determine Stripe Connect status
    const stripeStatus = org?.stripe_account_verified_at
        ? "connected"
        : org?.stripe_account_id
            ? "pending"
            : "not_started";

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                <p className="mt-2 text-muted-foreground">
                    Manage your organization preferences and integrations.
                </p>
            </div>

            {/* Settings Sections */}
            <div className="space-y-4">
                {/* Stripe Connect */}
                <SettingsCard
                    href="/dashboard/settings/connect"
                    icon={CreditCard}
                    title="Stripe Connect"
                    description="Connect your Stripe account to issue virtual cards and receive payouts."
                    status={
                        stripeStatus === "connected" ? (
                            <span className="flex items-center gap-1.5 text-sm text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                Connected
                            </span>
                        ) : stripeStatus === "pending" ? (
                            <span className="flex items-center gap-1.5 text-sm text-yellow-600">
                                <AlertCircle className="w-4 h-4" />
                                Pending
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <AlertCircle className="w-4 h-4" />
                                Not Connected
                            </span>
                        )
                    }
                />

                {/* Organization (Coming Soon) */}
                <SettingsCard
                    href="/dashboard/settings/organization"
                    icon={Building2}
                    title="Organization"
                    description="Update your agency name, logo, and billing information."
                    badge="Coming Soon"
                    disabled
                />

                {/* Team (Coming Soon) */}
                <SettingsCard
                    href="/dashboard/settings/team"
                    icon={Users}
                    title="Team Members"
                    description="Invite team members and manage their roles and permissions."
                    badge="Coming Soon"
                    disabled
                />

                {/* Billing (Coming Soon) */}
                <SettingsCard
                    href="/dashboard/settings/billing"
                    icon={CreditCard}
                    title="Billing & Plans"
                    description="Manage your subscription, view invoices, and update payment methods."
                    badge="Coming Soon"
                    disabled
                />

                {/* Notifications (Coming Soon) */}
                <SettingsCard
                    href="/dashboard/settings/notifications"
                    icon={Bell}
                    title="Notifications"
                    description="Configure email alerts for transactions, approvals, and reports."
                    badge="Coming Soon"
                    disabled
                />

                {/* Security (Coming Soon) */}
                <SettingsCard
                    href="/dashboard/settings/security"
                    icon={Shield}
                    title="Security"
                    description="Manage two-factor authentication and security preferences."
                    badge="Coming Soon"
                    disabled
                />

                {/* Appearance (Coming Soon) */}
                <SettingsCard
                    href="/dashboard/settings/appearance"
                    icon={Palette}
                    title="Appearance"
                    description="Customize themes and branding for your dashboard."
                    badge="Coming Soon"
                    disabled
                />
            </div>

            {/* Organization Info Footer */}
            {org && (
                <div className="mt-12 p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{org.name}</span>
                        {" · "}
                        <span>Markup: {(Number(org.markup_basis_points || 1500n) / 100).toFixed(1)}%</span>
                        {org.billing_email && (
                            <>
                                {" · "}
                                <span>Billing: {org.billing_email}</span>
                            </>
                        )}
                    </p>
                </div>
            )}
        </div>
    );
}

interface SettingsCardProps {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    status?: React.ReactNode;
    badge?: string;
    disabled?: boolean;
}

function SettingsCard({
    href,
    icon: Icon,
    title,
    description,
    status,
    badge,
    disabled = false,
}: SettingsCardProps) {
    const content = (
        <div
            className={`
        p-4 rounded-xl border border-border bg-card
        transition-all duration-200
        ${disabled
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-primary/50 hover:shadow-md cursor-pointer"
                }
      `}
        >
            <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{title}</h3>
                        {badge && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                        {description}
                    </p>
                </div>

                {/* Status or Chevron */}
                <div className="flex-shrink-0">
                    {status || (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>
            </div>
        </div>
    );

    if (disabled) {
        return content;
    }

    return <Link href={href}>{content}</Link>;
}
