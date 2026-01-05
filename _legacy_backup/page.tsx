"use client";

/**
 * LANDING PAGE (Redesign v2)
 * =============================================================================
 * Premium SaaS aesthetic.
 * "The Operating System for AI Agent Spending"
 * =============================================================================
 */

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  LayoutDashboard,
  Globe,
} from "lucide-react";

// Animation Config
const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...spring, delay: custom * 0.1 }
  })
};

// --- COMPONENTS ---

function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={spring}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="text-lg font-bold tracking-tight">Switchboard</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "Security", "Pricing", "API"].map(link => (
            <a key={link} href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {link}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/auth/signup">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Get Started
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden px-6">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-30 pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">
        {/* Text Content */}
        <motion.div
          className="flex-1 max-w-2xl"
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeInUp} custom={1} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-white/10 text-xs font-mono text-primary mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            v2.0 Now Available
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            custom={2}
            className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-6"
          >
            The Financial OS for <span className="text-primary">AI Agents</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            custom={3}
            className="text-xl text-muted-foreground mb-8 leading-relaxed"
          >
            Issue virtual cards, control spend limits, and automate invoicing for your autonomous agent fleet. Built for the next generation of AAA economies.
          </motion.p>

          <motion.div variants={fadeInUp} custom={4} className="flex flex-wrap gap-4">
            <Link href="/auth/signup">
              <button className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:shadow-[0_0_20px_rgba(190,242,100,0.4)] transition-all flex items-center gap-2">
                Start Issuing
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/auth/login">
              <button className="h-12 px-8 rounded-xl bg-secondary border border-border text-foreground font-medium hover:bg-secondary/80 transition-all flex items-center gap-2">
                Live Demo
                <LayoutDashboard className="w-5 h-5 opacity-50" />
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero Visual */}
        <motion.div
          className="flex-1 w-full max-w-lg lg:max-w-none"
          initial={{ opacity: 0, scale: 0.95, rotateY: 10 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <div className="relative aspect-square lg:aspect-[4/3] rounded-2xl border border-white/10 bg-secondary/30 backdrop-blur-xl shadow-2xl overflow-hidden p-8 flex flex-col items-center justify-center group">
            {/* Abstract Card Stack */}
            <div className="relative w-full max-w-sm aspect-[1.586/1]">
              {/* Card 3 (Back) */}
              <div className="absolute top-0 left-0 w-full h-full bg-zinc-800 rounded-xl border border-white/5 opacity-40 scale-90 -translate-y-8" />
              {/* Card 2 (Middle) */}
              <div className="absolute top-0 left-0 w-full h-full bg-zinc-800 rounded-xl border border-white/5 opacity-70 scale-95 -translate-y-4 shadow-lg" />

              {/* Card 1 (Front - Hero) */}
              <div className="absolute top-0 left-0 w-full h-full rounded-xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 shadow-2xl flex flex-col justify-between p-6 z-10 group-hover:scale-105 transition-transform duration-500">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-7 rounded bg-primary/80" />
                  <span className="font-mono text-xs text-white/50">VIRTUAL</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-mono text-xl tracking-widest text-white">
                    <span>••••</span>
                    <span>••••</span>
                    <span>••••</span>
                    <span className="text-primary">4242</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40">Agent ID</div>
                      <div className="text-sm font-medium text-white">GPT-ORDER-1</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-white/40">Limit</div>
                      <div className="text-sm font-mono text-primary">$5,000</div>
                    </div>
                  </div>
                </div>
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              </div>
            </div>

            {/* Floating Badge */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-8 right-8 bg-black/80 backdrop-blur-md border border-primary/30 py-2 px-4 rounded-lg flex items-center gap-3 shadow-lg"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono text-primary">Transaction Approved</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      title: "Instant Issuance",
      desc: "Create virtual cards via API in <200ms.",
      icon: Zap
    },
    {
      title: "Spend Controls",
      desc: "Set hard limits, merchant categories, and velocity checks.",
      icon: ShieldCheck
    },
    {
      title: "Global Settlements",
      desc: "Issue in USD, settle in local currencies anywhere.",
      icon: Globe
    }
  ];

  return (
    <section className="py-24 bg-secondary/30 relative border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Built for Autonomous Economies</h2>
          <p className="text-muted-foreground">Traditional banking APIs block AI activity. Switchboard is designed to safely empower your agents.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-8 rounded-2xl bg-secondary border border-border hover:border-primary/50 transition-colors group">
              <div className="w-12 h-12 rounded-lg bg-background border border-white/5 flex items-center justify-center mb-6 group-hover:text-primary transition-colors">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- PAGE ---
export default function LandingPage() {
  return (
    <div className="bg-background min-h-screen text-foreground selection:bg-primary/20">
      <Navbar />
      <main>
        <Hero />
        <FeatureGrid />
      </main>
      <footer className="py-12 border-t border-white/5 text-center text-sm text-muted-foreground">
        <p>© 2026 Switchboard Inc. The Financial OS for AI.</p>
      </footer>
    </div>
  );
}
