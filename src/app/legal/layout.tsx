"use client"

import type React from "react"

import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileText, Shield, AlertTriangle, Download } from "lucide-react"

const legalPages = [
  { href: "/legal/terms", label: "Terms of Service", icon: FileText },
  { href: "/legal/privacy", label: "Privacy Protocol", icon: Shield },
  { href: "/legal/acceptable-use", label: "Acceptable Use Policy", icon: AlertTriangle },
]

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Scanline effect */}
      <div className="scanline" />

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
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/legal/terms" className="text-primary">
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

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <motion.aside
            className="lg:sticky lg:top-8 lg:h-fit"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="glass-card p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-primary mb-4">Navigation Log</p>

              <nav className="space-y-2">
                {legalPages.map((page) => {
                  const isActive = pathname === page.href
                  return (
                    <Link
                      key={page.href}
                      href={page.href}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isActive ? "bg-primary/10 border border-primary/30 glow-green" : "hover:bg-muted"
                      }`}
                    >
                      <div className="relative">
                        {isActive && (
                          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary live-indicator" />
                        )}
                        <page.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {page.label}
                      </span>
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-6 pt-6 border-t border-border">
                <Button variant="outline" className="w-full text-xs bg-transparent" size="sm">
                  <Download className="w-3 h-3 mr-2" />
                  <span className="font-mono">$ export --pdf</span>
                </Button>
              </div>
            </div>
          </motion.aside>

          {/* Main Content */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  )
}