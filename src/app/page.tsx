import { CreditCard, Zap, PieChart, Shield } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Check if user is logged in to show appropriate nav link
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Switchboard</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden pt-20">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-24 sm:py-32">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Now building the Agentic Economy
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-center tracking-tight">
            <span className="text-foreground">Financial OS for</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">
              AI Agents
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
            Issue virtual cards to every agent. Set spend policies. Automate rebilling with markup.
            Built for AI Automation Agencies.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25">
              Get Early Access
            </button>
            <button className="px-8 py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors border border-border">
              View Documentation
            </button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Everything agencies need
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              From card issuance to automated invoicing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Agent Cards
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Issue unique virtual cards per agent or project. Full attribution, zero reconciliation headaches.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Policy Engine
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Budget caps, merchant locks, velocity limits. Stop rogue agents before they drain budgets.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Auto Rebilling
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Capture spend, apply markup, push invoice items to your Stripe. Zero manual work.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <PieChart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Real-time Analytics
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Spend by client, vendor, agent. Know your margins instantly. Export anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary tabular-nums">$8.4B</div>
              <div className="mt-1 text-sm text-muted-foreground">LLM API Spend (2025)</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground tabular-nums">43%</div>
              <div className="mt-1 text-sm text-muted-foreground">Annual Market Growth</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground tabular-nums">79%</div>
              <div className="mt-1 text-sm text-muted-foreground">Orgs Adopting Agents</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary tabular-nums">15%</div>
              <div className="mt-1 text-sm text-muted-foreground">Avg. Agency Markup</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Switchboard</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Switchboard. Building the financial rails for autonomous AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

