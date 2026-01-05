"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Zap, Rocket, Crown, ExternalLink, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const tiers = [
  {
    name: "Ignition",
    price: "$0",
    period: "/mo",
    description: "Standard transaction fees. Perfect for testing.",
    features: [
      "Standard Transaction Fees (2.9% + 30¢)",
      "Up to 5 Agents",
      "Basic Velocity Controls",
      "Email Support",
      "7-Day Transaction History",
    ],
    cta: "Initialize",
    variant: "outline" as const,
    popular: false,
    icon: Zap,
  },
  {
    name: "Velocity",
    price: "$199",
    period: "/mo",
    description: "Reduced fees. Unlimited scale.",
    features: [
      "Reduced Transaction Fees (1.5%)",
      "Unlimited Agents",
      "Advanced Velocity Controls",
      "API Access",
      "Priority Whitelisting",
      "90-Day Transaction History",
      "Slack Integration",
    ],
    cta: "Deploy",
    variant: "default" as const,
    popular: true,
    icon: Rocket,
  },
  {
    name: "Sovereign",
    price: "Custom",
    period: "",
    description: "Enterprise-grade infrastructure.",
    features: [
      "Interchange-plus Pricing",
      "Dedicated Instance",
      "99.99% SLA Guarantee",
      "Custom Rate Limits",
      "Dedicated Account Manager",
      "Unlimited Data Retention",
      "SOC 2 Compliance Reports",
      "Custom Integrations",
    ],
    cta: "Contact Ops",
    variant: "outline" as const,
    popular: false,
    icon: Crown,
  },
]

const specSheet = [
  { feature: "API Rate Limits", ignition: "100 req/min", velocity: "10,000 req/min", sovereign: "Unlimited" },
  { feature: "Webhook Latency", ignition: "< 500ms", velocity: "< 100ms", sovereign: "< 50ms" },
  { feature: "Data Retention", ignition: "7 days", velocity: "90 days", sovereign: "Unlimited" },
  { feature: "Audit Log Granularity", ignition: "Daily", velocity: "Hourly", sovereign: "Real-time" },
  { feature: "Concurrent Agents", ignition: "5", velocity: "Unlimited", sovereign: "Unlimited" },
  { feature: "Card Issuance", ignition: "10/month", velocity: "Unlimited", sovereign: "Unlimited" },
  { feature: "Custom Spend Rules", ignition: "Basic", velocity: "Advanced", sovereign: "Enterprise" },
  { feature: "Support Response", ignition: "48h", velocity: "4h", sovereign: "< 1h" },
]

const faqs = [
  {
    q: "How are transaction fees calculated?",
    a: "Transaction fees are calculated in real-time via Stripe Connect. The fee is applied to each transaction processed through your agents' cards. Ignition tier uses standard Stripe pricing, while Velocity and Sovereign tiers have negotiated reduced rates.",
  },
  {
    q: "Can I upgrade or downgrade at any time?",
    a: "Yes, you can change your tier at any time. Upgrades are effective immediately with prorated billing. Downgrades take effect at the start of your next billing cycle.",
  },
  {
    q: "What happens if I exceed my API rate limits?",
    a: "Requests exceeding your rate limit will receive a 429 status code. We recommend implementing exponential backoff. Velocity and Sovereign tiers have significantly higher limits to prevent throttling.",
  },
  {
    q: "Is there a minimum commitment for Sovereign tier?",
    a: "Sovereign tier requires an annual commitment. Contact our ops team for custom pricing based on your expected transaction volume and specific requirements.",
  },
]

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Scanline effect */}
      <div className="scanline" />

      {/* Retro grid */}
      <div className="fixed inset-0 retro-grid opacity-30" />

      {/* Radial gradient lighting */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <motion.nav
        className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center glow-green">
            <span className="text-primary font-bold text-xl">Q</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Qoda</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="/#features" className="hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="text-primary">
            Pricing
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">
            Legal
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-sm">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 text-sm">
              Get Started
            </Button>
          </Link>
        </div>
      </motion.nav>

      {/* Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4">Resource Allocation</p>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Capital Allocation</h1>
          <p className="text-xl text-muted-foreground">Choose your velocity.</p>
        </motion.div>

        {/* Pricing Tiers */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              className={`glass-card p-8 relative ${tier.popular ? "glow-green border-primary/30" : ""}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${tier.popular ? "bg-primary/20 border border-primary/40" : "bg-muted border border-border"}`}
                >
                  <tier.icon className={`w-6 h-6 ${tier.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{tier.name}</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{tier.description}</p>
                </div>
              </div>

              <div className="mb-8">
                <span
                  className={`text-5xl font-bold tabular-nums ${tier.popular ? "glow-text-green text-primary" : ""}`}
                >
                  {tier.price}
                </span>
                <span className="text-muted-foreground">{tier.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.popular ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={tier.name === "Sovereign" ? "/contact" : "/signup"}>
                <Button
                  className={`w-full ${tier.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted hover:bg-muted/80"}`}
                >
                  {tier.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Spec Sheet */}
        <motion.div
          className="mb-24"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">Technical Specifications</p>
            <h2 className="text-3xl font-bold">Spec Sheet</h2>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-muted-foreground">Parameter</th>
                  <th className="text-center p-4 text-xs uppercase tracking-wider text-muted-foreground">Ignition</th>
                  <th className="text-center p-4 text-xs uppercase tracking-wider text-primary">Velocity</th>
                  <th className="text-center p-4 text-xs uppercase tracking-wider text-muted-foreground">Sovereign</th>
                </tr>
              </thead>
              <tbody>
                {specSheet.map((row, i) => (
                  <tr key={row.feature} className={`border-b border-border/30 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                    <td className="p-4 text-sm font-medium">{row.feature}</td>
                    <td className="p-4 text-center text-sm tabular-nums text-muted-foreground">{row.ignition}</td>
                    <td className="p-4 text-center text-sm tabular-nums text-primary">{row.velocity}</td>
                    <td className="p-4 text-center text-sm tabular-nums text-muted-foreground">{row.sovereign}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          className="max-w-3xl mx-auto mb-24"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">System Diagnostics</p>
            <h2 className="text-3xl font-bold">Frequently Asked</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <button
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/20 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-sm">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center pb-24"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <div className="glass-card-intense p-12 glow-green max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Ready to deploy?</h3>
            <p className="text-muted-foreground mb-6">Initialize your financial control center in under 5 minutes.</p>
            <Link href="/signup">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">
                Get Started <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}