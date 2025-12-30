/**
 * Dashboard Layout
 * =============================================================================
 * Layout wrapper for all dashboard pages.
 * Includes navigation sidebar and header.
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  Settings, 
  Zap,
  Building2,
  BarChart3,
  LogOut
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // Get user profile with org info
  const { data: profile } = await supabase
    .from("user_profiles")
    .select(`
      full_name,
      default_organization_id,
      organizations:default_organization_id (
        name,
        slug
      )
    `)
    .eq("id", user.id)
    .single();

  const orgs = profile?.organizations as { name: string; slug: string } | { name: string; slug: string }[] | null;
  const orgName = Array.isArray(orgs) ? orgs[0]?.name : orgs?.name || "Your Agency";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Switchboard</span>
          </Link>
        </div>

        {/* Organization */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate">
              {orgName}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <NavItem href="/dashboard" icon={LayoutDashboard}>
              Overview
            </NavItem>
            <NavItem href="/dashboard/agents" icon={CreditCard}>
              Agents & Cards
            </NavItem>
            <NavItem href="/dashboard/clients" icon={Users}>
              Clients
            </NavItem>
            <NavItem href="/dashboard/analytics" icon={BarChart3}>
              Analytics
            </NavItem>
            <NavItem href="/dashboard/settings" icon={Settings}>
              Settings
            </NavItem>
          </ul>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-muted-foreground">
                  {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm">{children}</span>
      </Link>
    </li>
  );
}

