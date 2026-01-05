# Qoda UI/UX Design Prompt for Lovable.dev

Copy and paste this prompt into Lovable.dev to build beautiful UI components for Qoda.

---

## The Prompt

You are building UI components for **Qoda**, a premium B2B SaaS platform that serves as a **Financial Operating System for AI Agents**. Qoda enables AI Automation Agencies (AAAs) to issue virtual cards, manage spend policies, and automate client rebilling.

### Product Context

Qoda solves the "AI Spend Management" problem for agencies running AI agents that need to make API calls, purchase resources, and incur costs on behalf of their clients. Key features include:

- **Cockpit Dashboard**: Real-time monitoring of all AI agent spend with risk gauges and transaction feeds
- **Agent Management**: Create agents, assign spend limits, issue virtual cards, and track per-agent costs
- **Client Rebilling**: Automated markup engine that bills clients based on agent spend + configurable markup
- **Banking/Stripe Connect**: Fund accounts, manage issuing balance, and auto-top-up functionality
- **Alerts System**: Predictive cost alerts, anomaly detection, and real-time spend notifications

### Design System: "Obsidian & Lime"

The design language is dark, premium, and fintech-forward. Think Bloomberg Terminal meets Stripe Dashboard meets a sci-fi command center.

#### Color Palette (HSL Values)

```css
:root {
  /* Core Obsidian Theme */
  --background: 240 10% 3.9%;        /* Zinc 950 #09090b - Main background */
  --foreground: 0 0% 98%;            /* White text */
  
  --card: 240 10% 3.9%;              /* Same as background */
  --card-foreground: 0 0% 98%;
  
  /* Neon Lime Accent */
  --primary: 84 81% 65%;             /* Lime 300 #bef264 */
  --primary-foreground: 240 5.9% 10%; /* Dark text on lime */
  
  /* Secondary/Muted */
  --secondary: 240 3.7% 15.9%;       /* Zinc 800 */
  --secondary-foreground: 0 0% 98%;
  
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%; /* Zinc 400 for subtle text */
  
  --accent: 84 81% 65%;              /* Same as primary */
  --accent-foreground: 240 5.9% 10%;
  
  --destructive: 0 62.8% 30.6%;      /* Red for errors/destructive */
  --destructive-foreground: 0 0% 98%;
  
  --border: 240 3.7% 15.9%;          /* Zinc 800 borders */
  --input: 240 3.7% 15.9%;
  --ring: 84 81% 65%;                /* Lime focus ring */
  
  --radius: 0.5rem;
}
```

#### Custom Colors

```js
obsidian: {
  100: "#27272a", // Zinc 800
  200: "#18181b", // Zinc 900
  300: "#09090b", // Zinc 950 (Main BG)
  400: "#000000",
},
neon: {
  lime: "#bef264", // Primary accent
  cyan: "#22d3ee", // Secondary accent for charts/data
}
```

#### Custom Utility Classes

```css
/* Glassmorphism */
.glass {
  @apply bg-black/40 backdrop-blur-md border border-white/10;
}

.glass-card {
  @apply bg-zinc-900/50 backdrop-blur-sm border border-white/5 hover:border-white/10 transition-all duration-300;
}

/* Lime Glow Effect */
.text-glow {
  text-shadow: 0 0 20px rgba(190, 242, 100, 0.5);
}

/* Button Variants */
.btn-primary {
  @apply inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all active:scale-95;
}

.btn-secondary {
  @apply inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-all active:scale-95;
}

.btn-ghost {
  @apply inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all active:scale-95;
}

/* Cards */
.card-hover {
  @apply card hover:border-primary/50 transition-colors duration-300;
}

/* Metrics/Data Display */
.metric-label {
  @apply text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider;
}

.value-medium {
  @apply text-2xl font-bold tracking-tight text-foreground font-mono;
}
```

### Typography

- **Sans**: Inter (primary font for UI)
- **Mono**: JetBrains Mono (for numbers, metrics, code, terminal-style displays)

### Tech Stack (Reference Only)

The actual project uses:
- Next.js 15 + React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (backend)
- Stripe (payments)
- Framer Motion (animations)
- Recharts / Lightweight Charts (data viz)

For Lovable.dev, we're building **React + Vite + Tailwind + TypeScript** components that follow the same design system.

### Design Principles

1. **Dark Mode Only**: No light mode needed. Everything is obsidian dark.
2. **Glassmorphism**: Use `glass` and `glass-card` utilities for depth.
3. **Neon Accents**: Lime (#bef264) for primary actions, success states, and focus rings.
4. **Data-Dense but Clean**: Like a Bloomberg terminal - lots of info but well organized.
5. **Micro-interactions**: Subtle hover effects, scale transitions, glow effects.
6. **Monospace Numbers**: Use `font-mono` for all financial figures and metrics.
7. **Premium Feel**: No cheap or generic looking components. Everything must feel high-end.

### Component Patterns

#### Metric Cards
```tsx
<div className="glass-card p-6 rounded-xl">
  <p className="metric-label">Total Spend</p>
  <p className="value-medium mt-1">$12,450.00</p>
  <p className="text-xs text-neon-lime mt-2">↑ 12% vs last week</p>
</div>
```

#### Primary Buttons
```tsx
<button className="btn-primary">
  <Plus className="w-4 h-4" />
  Issue Card
</button>
```

#### Glowing Headers
```tsx
<h1 className="text-4xl font-bold text-glow text-white">
  Cockpit
</h1>
```

### What to Build

When I describe a screen or component, please:

1. **Follow the Obsidian & Lime design system exactly**
2. **Use semantic tokens** (never `text-white` directly, use `text-foreground`)
3. **Create reusable components** with proper variants
4. **Add subtle animations** with Framer Motion where appropriate
5. **Ensure responsiveness** for dashboard layouts
6. **Use Lucide React icons** (same icon set as the project)

### Example Request

"Build a Cockpit dashboard with:
- A header with glowing title and a button to add new agent
- 4 metric cards showing: Total Spend, Active Agents, Pending Invoices, Issuing Balance
- A live transaction feed with the last 10 transactions
- A risk gauge showing current spend velocity"

---

## Quick Reference

| Element | Class/Style |
|---------|-------------|
| Background | `bg-background` or `bg-obsidian-300` |
| Text | `text-foreground` (white), `text-muted-foreground` (gray) |
| Primary Button | `btn-primary` or `bg-primary text-primary-foreground` |
| Cards | `glass-card` or `card` |
| Borders | `border-border` (zinc 800) |
| Accent | `text-primary` or `text-neon-lime` |
| Numbers/Metrics | `font-mono` |
| Glow Effect | `text-glow` |

---

Start by setting up the design system in `index.css` and `tailwind.config.ts` using the values above, then build the components I describe!
