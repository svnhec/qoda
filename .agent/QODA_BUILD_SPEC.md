# You are building: Qoda

> The financial operating system for AI agents—issue virtual cards, set spend policies, and auto-rebill clients with markup.

---

## Business Context

### The Problem (Brutally Specific)
AI Automation Agencies (AAAs) that deploy autonomous AI agents cannot give their AI agents the ability to spend money autonomously without creating massive operational overhead, security risks, and billing chaos.

**Specific pain points:**
1. **No Financial Identity for AI Agents:** An AI agent can't have a credit card. Agencies share a single company card across dozens of agents/clients, creating zero attribution and audit nightmares.
2. **Manual Rebilling Hell:** Agency owners spend 5-20+ hours/month reconciling which AI agent spent what, on which API, for which client, then manually creating invoices with markups.
3. **Spend Runways:** AI agents can "hallucinate" spending. An agent making bad API calls can burn through $10,000 in minutes with no circuit breaker.
4. **Trust Gap with Clients:** Clients have zero visibility into what their dedicated AI agent is actually spending.

### Target Users

**Primary User: Marcus — The Agency Operator**
- Founder/CEO of a 15-person AI Automation Agency, $80k-$250k MRR
- Manages 40+ AI agents deployed across 25 client accounts
- Spends 4-6 hours every Sunday reconciling Stripe charges to client projects
- Lost a $15k/month client because they disputed charges they couldn't verify
- *"I'm running a tech company but my finance ops feels like a spreadsheet disaster from 2005."*

**Secondary User: Priya — The Technical Co-founder**
- CTO at a fast-growing AI agency (5-8 people), $30k-$60k MRR
- Built AI automations using n8n, Make.com, LangChain
- Uses Notion + Airtable + manual processes to track agent costs
- Got hit with a $2,400 OpenAI bill because an agent went haywire—no alerts
- *"I want to focus on building amazing AI, not playing accountant."*

### Why Existing Solutions Fail
| Solution | Why It Fails |
|----------|--------------|
| Shared Corporate Cards (Brex, Ramp) | No per-agent attribution. No spend policies per workflow. No automatic rebilling. |
| API Provider Dashboards (OpenAI) | Shows YOUR total spend, not per-agent or per-client. No rebilling. |
| Expense Management (Expensify) | Designed for humans, not AI agents. No API-first architecture. |
| Manual Spreadsheets | Doesn't scale. Error-prone. Steals 10-20+ hours/month. |

**The Gap:** No product provides Virtual Cards + Per-Agent Spend Policies + Automated Cost Attribution + Client Rebilling Engine.

---

## Technical Requirements

### Framework
- **Frontend:** Next.js 15 (App Router) with React 19
- **Styling:** Tailwind CSS 3.4 + custom design tokens
- **Animation:** Framer Motion (spring physics: stiffness 400, damping 30)
- **State:** Zustand for client state, SWR for server state

### Database
- **Primary:** Supabase (PostgreSQL with Row-Level Security)
- **Auth:** Supabase Auth (Google OAuth + Magic Link)
- **Realtime:** Supabase Realtime for live transaction feed

### Key Libraries
```json
{
  "next": "^15.1.4",
  "react": "^19.0.0",
  "framer-motion": "^12.23.26",
  "zustand": "^5.0.9",
  "swr": "^2.3.8",
  "@supabase/supabase-js": "^2.49.4",
  "stripe": "^17.7.0",
  "recharts": "^3.6.0",
  "lucide-react": "^0.468.0",
  "zod": "^3.24.1"
}
```

### External Integrations
- **Stripe Connect:** For agency Stripe account linking
- **Stripe Issuing:** For virtual card creation and management
- **Stripe Billing:** For automated client invoicing

---

## Features to Build (Priority Order)

### Feature 1: Authentication & Onboarding
**User Flow:**
1. User lands on marketing page, clicks "Get Started"
2. User signs up via Google OAuth or magic link email
3. System creates user account and organization
4. User sees onboarding wizard: "Connect your Stripe account"
5. User clicks "Connect Stripe" → Stripe Connect OAuth flow
6. System stores Stripe account ID, shows verification status
7. If verified → User sees "Add funds" screen (minimum $100)
8. User adds funds via ACH or card
9. System shows success → Redirect to dashboard

**Acceptance Criteria:**
- [ ] Signup to funded account in <5 minutes
- [ ] Google OAuth works without errors
- [ ] Magic link arrives within 30 seconds
- [ ] Stripe Connect flow completes without dead ends
- [ ] Clear error messages for any failure

---

### Feature 2: Client & Agent Management
**User Flow — Add Client:**
1. User navigates to Clients → "Add Client"
2. User fills: Client Name, Billing Email, Markup % (default 20%)
3. User clicks "Create Client"
4. System creates client, redirects to client detail page
5. Client appears in sidebar/list

**User Flow — Issue Virtual Card:**
1. User clicks "Issue New Card" on client page
2. User fills: Card Nickname, Daily Limit ($500 default), Monthly Limit ($2000 default)
3. User clicks "Issue Card"
4. System calls Stripe Issuing API, creates card
5. System shows card details: last 4, full number (revealable), CVC, expiry
6. Card appears in client's card list as "Active"

**Acceptance Criteria:**
- [ ] Add client in <30 seconds
- [ ] Issue card in <1 minute
- [ ] Card details are accessible programmatically (API)
- [ ] Limits are enforced by Stripe (validated on card creation)
- [ ] Clear attribution: Card → Agent → Client chain visible

---

### Feature 3: Real-Time Transaction Dashboard (Cockpit)
**User Flow:**
1. User opens dashboard (default view after login)
2. System shows "Mission Control" with:
   - Active Agents count (with online/offline status)
   - 24h Burn Rate (total spend today)
   - Total Spend (this billing period)
   - Risk Score (0-100 anomaly indicator)
3. Below KPIs: Live Transaction Feed (WebSocket-powered)
4. User sees transactions appear in <2 seconds of occurring
5. User can click any transaction for details (agent, client, merchant, amount, status)
6. User can filter by: Client, Agent, Date Range, Status

**Acceptance Criteria:**
- [ ] Dashboard loads in <2 seconds
- [ ] Transactions appear in feed within 2 seconds of webhook receipt
- [ ] All 4 KPIs update in real-time
- [ ] Filtering works instantly (client-side)
- [ ] Mobile responsive (KPIs stack, feed scrolls)

---

### Feature 4: Spend Policies & Alerts
**User Flow — Set Spend Policy:**
1. User views agent/card detail page
2. User sees current limits: Daily, Monthly, Per-Transaction
3. User clicks "Edit Limits"
4. User adjusts values, optional: allowed MCCs
5. User saves → Limits updated for future transactions

**User Flow — Receive Alert:**
1. Transaction occurs that triggers alert condition:
   - Card declined (any reason)
   - Spend >$100 in single transaction
   - Approaching daily/monthly limit (80%)
   - Anomaly detected (unusual velocity)
2. System creates alert record
3. System sends notification (in-app toast + email)
4. User sees alert in dashboard header (badge count)
5. User clicks → Alert detail with action options

**Acceptance Criteria:**
- [ ] Limit changes take effect immediately
- [ ] Declines appear as alerts within 5 seconds
- [ ] Email notifications sent within 1 minute
- [ ] Alert badge updates in real-time
- [ ] No alert fatigue (smart grouping, not spam)

---

### Feature 5: End-of-Month Rebilling
**User Flow:**
1. User navigates to Billing → "Generate Invoices"
2. System shows all clients with:
   - Total Spend this period
   - Markup % applied
   - Invoice Total (spend + markup)
   - Status (Draft)
3. User clicks "Preview" on a client
4. System shows invoice with transaction breakdown
5. User can: Edit individual transactions, Adjust markup, Exclude items
6. User clicks "Approve All" or "Send Invoice"
7. System generates Stripe Invoice (or PDF), sends to client email
8. Status updates to "Sent", shows outstanding balance

**Acceptance Criteria:**
- [ ] Generate all invoices in <2 minutes (for 20 clients)
- [ ] Preview shows accurate calculations
- [ ] Invoice totals match transaction sum + markup
- [ ] PDF has transaction-level detail for disputes
- [ ] Sent invoices tracked with payment status

---

## Important Constraints

### Performance
- No page load should take >3 seconds
- Transaction feed updates in <2 seconds
- Card authorization webhooks respond in <500ms (Stripe requirement)

### User Experience
- No signup should take >5 minutes end-to-end
- All form errors must be handled gracefully with inline messages
- All destructive actions require confirmation
- Mobile responsive required (all features work on phone)
- Dark mode is the default (and only) theme

### Data & Security
- Never store full card numbers (Stripe handles PCI)
- Row-Level Security enforced on all database tables
- Session expiry: 7 days with refresh
- Audit log for all card issuance and limit changes

### MVP Constraints
- Mock Stripe integration is acceptable for frontend demo
- Real Stripe Issuing requires production approval (can start in test mode)
- No multi-user/team access in v1 (single operator per org)
- USD only in v1 (no multi-currency)

---

## Success Looks Like

### Onboarding Success
- [ ] New user can signup and issue their first card in **<5 minutes**
- [ ] User can connect Stripe and fund account without support intervention
- [ ] User understands what to do next at every step (no dead ends)

### Daily Operations Success
- [ ] Agency operator gets health check of all agents in **<10 seconds**
- [ ] Transactions visible in feed within **<2 seconds** of occurring
- [ ] System catches and alerts on anomalies before they exceed **$500**

### Rebilling Success
- [ ] Agency generates all client invoices for the month in **<2 minutes**
- [ ] Invoices are accurate to the cent (no manual corrections)
- [ ] Client dispute can be resolved with transaction evidence in **<5 minutes**

### Reliability
- [ ] Zero unhandled errors in production (all errors have user-facing messages)
- [ ] 99.9% uptime for webhook processing (no missed transactions)
- [ ] Card authorization response time <500ms

### Visual Quality
- [ ] "Mission Control" aesthetic: Dark, technical, precise, premium
- [ ] Animations feel smooth and intentional (Framer Motion springs)
- [ ] Does NOT look "AI-generated" — looks hand-crafted and opinionated
- [ ] Passes the "wow" test on first impression

---

## Design System Reference

### Colors (HSL)
```css
--background: 224 71% 4%;        /* #101522 - Deep navy */
--card: 228 17% 11%;             /* #181b21 - Card surfaces */
--primary: 225 85% 50%;          /* #1349ec - Electric blue */
--accent-emerald: 145 90% 45%;   /* #0bda62 - Profit green */
--accent-orange: 25 95% 53%;     /* #f97316 - Warning */
--accent-red: 0 84% 60%;         /* #ef4444 - Danger */
--muted: 222 30% 68%;            /* #92a0c9 - Secondary text */
--border: 226 17% 21%;           /* #2d3340 - Subtle borders */
```

### Typography
- **Display:** Inter, font-weight 800-900, uppercase tracking
- **Body:** Inter, font-weight 400-500
- **Data/Mono:** JetBrains Mono, for numbers, codes, transactions

### Motion
```javascript
const spring = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};
```

### UI Patterns
- Corner brackets on focused cards (avionics aesthetic)
- Gradient overlays on hover states
- Pulsing indicators for live/online status
- Traffic light system: Green (healthy), Yellow (attention), Red (critical)

---

## Now Build This

Starting point: The codebase at `/Users/suvinsardar/Desktop/switchboard` already has:
- Next.js 15 scaffold
- Supabase integration
- Stripe integration (partial)
- Basic auth flow
- Design system tokens

**Immediate priorities:**
1. Fix/complete the Cockpit dashboard (Feature 3)
2. Build the Client & Agent management screens (Feature 2)
3. Wire up real-time transaction feed
4. Implement rebilling UI (Feature 5)

**The goal:** A working prototype that can demo the full agency workflow with mock data, ready to connect to Stripe Issuing when business verification completes.

---

*Build Spec v1.0 | 2026-01-03*
