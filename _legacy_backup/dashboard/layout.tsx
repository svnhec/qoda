/**
 * DASHBOARD LAYOUT
 * =============================================================================
 * Sidebar navigation + main content area
 * Uses new Qoda design system
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
  Activity,
  Building2,
  BarChart3,
  LogOut,
  Bell,
  Receipt,
} from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

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
  const userName = profile?.full_name || user.email?.split("@")[0] || "User";
  const userInitial = userName[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/30 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg text-foreground">Qoda</span>
          </Link>
        </div>

        {/* Organization Selector */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">
              {orgName}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            <NavSection title="Main">
              <NavItem href="/dashboard" icon={LayoutDashboard}>
                Command Center
              </NavItem>
              <NavItem href="/dashboard/agents" icon={CreditCard}>
                Agents & Cards
              </NavItem>
              <NavItem href="/dashboard/clients" icon={Users}>
                Clients
              </NavItem>
            </NavSection>

            <NavSection title="Analytics">
              <NavItem href="/dashboard/analytics" icon={BarChart3}>
                Reports
              </NavItem>
              <NavItem href="/dashboard/billing" icon={Receipt}>
                Rebilling
              </NavItem>
            </NavSection>

            <NavSection title="System">
              <NavItem href="/dashboard/settings" icon={Settings}>
                Settings
              </NavItem>
            </NavSection>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {userInitial}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="p-2 rounded-lg hover:bg-destructive/10 transition-colors group"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-border bg-card/30 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="status-dot-success animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium">
              All systems operational
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <ErrorBoundary level="section">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// Navigation Section
function NavSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-4 first:pt-0">
      <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

// Navigation Item
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
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors group"
      >
        <Icon className="w-4 h-4 group-hover:text-primary transition-colors" />
        <span className="text-sm">{children}</span>
      </Link>
    </li>
  );
}
