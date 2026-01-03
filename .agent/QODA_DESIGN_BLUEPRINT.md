# Product Specification: Qoda

## 1. Overview

Qoda is a financial operating system purpose-built for AI Automation Agencies. It enables agencies to issue dedicated virtual cards to each AI agent they deploy, set granular spend policies, track every transaction in real-time, and automatically generate client invoices with markup—eliminating the 10-20+ hours/month spent on manual expense reconciliation.

The core insight: AI agents need to spend money (on APIs like OpenAI, cloud services, SaaS tools) but have no financial identity. Agencies currently share a single corporate card across dozens of agents and clients, creating audit nightmares, security risks, and billing chaos. Qoda solves this by giving each agent its own virtual card with client-specific attribution and automated rebilling.

---

## 2. User Personas

### Persona A: Marcus — The Agency Operator
- **Who:** Founder/CEO of a 15-person AI Automation Agency, $80k-$250k MRR
- **Context:** Manages 40+ AI agents deployed across 25 client accounts. Agents handle lead generation, customer support, content creation, and data processing.
- **Pain Points:**
  - Spends 4-6 hours every Sunday reconciling Stripe charges to client projects
  - Uses shared API keys across clients, making cost attribution nearly impossible
  - Lost a $15k/month client because they disputed charges they couldn't verify
- **Goals:**
  - Eliminate manual reconciliation entirely
  - Provide clients with transparent spend visibility
  - Protect against runaway AI spend with automatic limits
- **Quote:** *"I'm running a tech company but my finance ops feels like a spreadsheet disaster from 2005."*

### Persona B: Priya — The Technical Co-founder
- **Who:** CTO/Technical Lead at a fast-growing AI agency (5-8 people, bootstrapped), $30k-$60k MRR
- **Context:** Built AI automations using n8n, Make.com, LangChain. Scaling from 8 to 30 clients.
- **Pain Points:**
  - Uses Notion + Airtable + manual processes to track agent costs
  - Recently got hit with a $2,400 OpenAI bill because an agent went haywire—no alerts
  - Every new client adds exponential operational complexity
- **Goals:**
  - Automate the boring stuff so she can focus on building AI
  - Look more professional to enterprise clients with proper invoicing
  - Get real-time alerts before small problems become expensive disasters
- **Quote:** *"I want to focus on building amazing AI, not playing accountant."*

### Persona C: David — The Enterprise Buyer (Indirect User)
- **Who:** VP of Operations at a mid-market company ($20M-$100M revenue) that outsources AI automation to an agency
- **Context:** Pays an AI agency $12,000/month for customer success automation
- **Pain Points:**
  - Has zero visibility into what AI agents are actually spending
  - Monthly invoice is a single opaque line item
  - Finance keeps asking for breakdowns; he can't provide them
- **Goals:**
  - Get transparency into where money goes
  - Justify AI spend to CFO with detailed reports
- **Quote:** *"I trust our agency, but I need to show my CFO where this money is going."*

---

## 3. Core Features (MVP Only)

### Feature 1: Virtual Card Issuance
Issue dedicated Stripe-powered virtual cards for each AI agent. Each card has its own identity, controlled limits, and is linked to a specific client for automatic attribution.

### Feature 2: Spend Policy Engine
Set granular spending rules per card: daily/monthly limits, per-transaction caps, allowed merchant categories (MCCs), and automatic pause when limits are reached. Prevents runaway spend.

### Feature 3: Real-Time Transaction Feed
Live dashboard ("Mission Control") showing every transaction as it happens, with agent attribution, client attribution, merchant details, and approval status. WebSocket-powered, <1 second latency.

### Feature 4: Automated Client Rebilling
At month-end, one-click generation of client invoices. System calculates total spend per client, applies configurable markup percentage, and produces professional invoices with transaction-level detail.

### Feature 5: Spend Alerts & Anomaly Detection
Push notifications (email, Slack) for: card declines, unusual spend velocity, approach/breach of limits, and AI-detected anomalies. Prevents silent failures and runaway costs.

---

## 4. User Flows

### Flow 1: Onboarding & Stripe Connect
1. User signs up via Google OAuth or magic link
2. System shows onboarding wizard: "Let's connect your funding source"
3. User clicks "Connect Stripe" → Stripe Connect OAuth flow
4. User grants Qoda access to Stripe Issuing
5. System shows KYB status: "Verification pending" or "Verified"
6. If verified, user sees "Add initial funds" screen
7. User adds minimum $100 via ACH or card
8. System shows success: "You're ready to issue your first card"
9. User lands on dashboard

### Flow 2: Add a Client
1. User navigates to Clients → "Add Client"
2. System shows form: Client Name (required), Billing Email (required), Markup % (default: 20%), Billing Cycle (Monthly/Bi-weekly)
3. User fills fields, clicks "Create Client"
4. System shows client detail page with "No agents yet"
5. User can now issue cards linked to this client

### Flow 3: Issue a Virtual Card for an Agent
1. User navigates to client detail → "Issue New Card"
2. System shows form: Card Nickname (e.g., "Lead Gen Bot"), Daily Limit (default: $500), Monthly Limit (default: $2,000), Allowed MCCs (default: All)
3. User adjusts limits if needed, clicks "Issue Card"
4. System calls Stripe Issuing API, creates virtual card
5. System shows card details: last 4 digits, virtual card number (revealable), CVC, expiry
6. System provides API endpoint for agent to retrieve card programmatically
7. Card appears in client's card list, status: "Active"

### Flow 4: Agent Makes a Transaction
1. AI agent uses card to make purchase (e.g., OpenAI API)
2. Stripe sends real-time webhook to Qoda
3. Qoda validates authorization against spend policies
4. If within limits → Approve (return to Stripe)
5. If exceeds limits → Decline (return to Stripe)
6. Transaction appears in real-time feed within <1 second
7. System attributes transaction to Agent → Client automatically
8. If notable event (decline, large amount, anomaly) → Send alert

### Flow 5: Daily Monitoring (Cockpit View)
1. User opens Qoda dashboard
2. System shows "Mission Control" with:
   - Active Agents count (with status indicators)
   - 24h Burn Rate (total spend today)
   - Total Spend (all-time or this month)
   - Risk Score (anomaly indicator)
3. Below KPIs: Spend Velocity chart (real-time) + Live Transaction Feed
4. User can filter by client, agent, or date range
5. User can click any transaction for full detail view

### Flow 6: End-of-Month Rebilling
1. User navigates to Billing → "Generate Invoices"
2. System shows list of clients with:
   - Total Spend this period
   - Markup applied
   - Invoice Total
   - Status (Draft/Sent/Paid)
3. User clicks "Preview" on any client
4. System shows invoice preview with transaction breakdown
5. User can edit markup or exclude transactions if needed
6. User clicks "Send Invoice" → Email sent to client billing contact
7. Invoice synced to Stripe Billing (or PDF attached)
8. Dashboard updates: "Awaiting Payment" status

---

## 5. Data Model (Simple)

### User (Agency Operator)
- id, email, name, avatar_url
- stripe_account_id (Stripe Connect)
- onboarding_completed (boolean)
- created_at

### Organization
- id, name, owner_id (user)
- stripe_customer_id
- issuing_balance (current funds)
- settings (JSON: default markup, currency, etc.)
- created_at

### Client (End Customer of Agency)
- id, organization_id
- name, billing_email
- markup_percentage (default: 20)
- billing_cycle (monthly | biweekly)
- stripe_customer_id (for invoicing)
- status (active | archived)
- created_at

### Agent (AI Agent with Card)
- id, client_id
- name (e.g., "Lead Gen Bot v2")
- description
- stripe_card_id
- card_last_four
- daily_limit, monthly_limit
- current_daily_spend, current_monthly_spend
- allowed_mccs (JSON array)
- status (active | paused | cancelled)
- created_at

### Transaction
- id, agent_id, client_id (denormalized for query speed)
- stripe_transaction_id
- amount, currency
- merchant_name, merchant_mcc
- status (approved | declined | pending)
- decline_reason (if declined)
- created_at

### Invoice
- id, client_id
- period_start, period_end
- subtotal (raw spend), markup_amount, total
- status (draft | sent | paid | overdue)
- stripe_invoice_id
- sent_at, paid_at
- created_at

### Alert
- id, organization_id
- type (decline | anomaly | limit_approaching | limit_reached)
- agent_id, transaction_id (nullable)
- message
- acknowledged (boolean)
- created_at

---

## 6. Error Cases (Critical)

### Authentication & Onboarding
| Error | User Message | Recovery Path |
|-------|-------------|---------------|
| OAuth fails | "Couldn't connect. Please try again." | Retry button, link to manual email signup |
| Email verification expires | "Link expired. We've sent a new one." | Auto-resend new magic link |
| Stripe Connect rejected | "Verification unsuccessful. Please check your business details." | Link to Stripe dashboard to fix, support contact |
| Insufficient initial funding | "Minimum $100 required to start." | Show balance, link to add funds |

### Card Issuance
| Error | User Message | Recovery Path |
|-------|-------------|---------------|
| Stripe Issuing not enabled | "Card issuance requires Stripe Issuing activation." | Link to Stripe Issuing application |
| Card creation fails (Stripe error) | "Couldn't create card. Please try again." | Retry button, log error for support |
| Funding balance too low for limit | "Card limit exceeds available balance." | Show balance, suggest lower limit or add funds |

### Transactions
| Error | User Message | Recovery Path |
|-------|-------------|---------------|
| Card declined - insufficient balance | "Declined: Insufficient funds. [Add funds →]" | Link to top-up, alert sent |
| Card declined - over limit | "Declined: Daily limit reached ($500)." | Show limit, option to increase temporarily |
| Card declined - blocked MCC | "Declined: Merchant category not allowed." | Show which MCC, link to edit card settings |
| Transaction attribution fails | "Transaction recorded, attribution pending." | Background job retries, manual correction UI |

### Rebilling
| Error | User Message | Recovery Path |
|-------|-------------|---------------|
| Invoice generation fails | "Couldn't generate invoice. Some transactions may be missing." | Retry button, show which transactions failed |
| Invoice email fails | "Invoice created but email failed. [Resend]" | Resend button, download PDF option |
| Client disputes charge | N/A (client-side) | Provide transaction-level PDF export with timestamps |

### System
| Error | User Message | Recovery Path |
|-------|-------------|---------------|
| Webhook processing fails | Silent (internal retry) | 3x automatic retry, dead-letter queue, alert ops team |
| Real-time feed disconnects | "Connection lost. Reconnecting..." | Auto-reconnect with exponential backoff |
| Dashboard fails to load | "Something went wrong. [Refresh]" | Refresh button, fallback to cached data |

---

## 7. Success Criteria

### Onboarding Success
- [ ] Can a new user signup and issue their first card in **<5 minutes**?
- [ ] Can a user connect Stripe and fund their account without support intervention?
- [ ] Does the user understand what to do next at every step (no dead ends)?

### Daily Operations Success
- [ ] Can an agency operator get a health check of all agents in **<10 seconds**?
- [ ] Are transactions visible in the feed within **<2 seconds** of occurring?
- [ ] Does the system catch and alert on anomalies before they become expensive (>$500 runaway)?

### Rebilling Success
- [ ] Can an agency generate all client invoices for the month in **<2 minutes**?
- [ ] Are invoices accurate to the cent (no manual corrections needed)?
- [ ] Can a client dispute be resolved with transaction-level evidence in **<5 minutes**?

### Reliability
- [ ] Zero unhandled errors in production (all errors have user-facing messages)
- [ ] 99.9% uptime for webhook processing (no missed transactions)
- [ ] Card authorization response time <500ms (Stripe requirement)

### Business Metrics (Post-Launch)
- [ ] 50% of trial users complete onboarding (funded account)
- [ ] 30% of trial users issue at least one card
- [ ] 10% week-1 activation → paid conversion
- [ ] <5% monthly churn for paying customers

---

## 8. Out of Scope (v1 — Not MVP)

- Multi-user team access / RBAC
- Client-facing portal (clients see their own spend)
- Multi-currency support
- Physical card issuance
- Direct integrations (Slack, QuickBooks, Xero)
- Custom branding / white-label
- Advanced analytics / forecasting
- Mobile app

---

## 9. Technical Constraints

- **Stripe Issuing:** Authorization webhooks must respond in <2 seconds or Stripe auto-declines
- **Real-time:** WebSocket or Server-Sent Events for live transaction feed
- **Security:** PCI compliance handled by Stripe; we never store full card numbers
- **Auth:** Supabase Auth with Google OAuth + magic link
- **Database:** PostgreSQL via Supabase with Row-Level Security
- **Hosting:** Vercel (Next.js) + Supabase (DB, Auth, Realtime)

---

## 10. Design Principles

1. **"Mission Control" Aesthetic:** Technical, precise, confident. Dark mode. Monospace for data. Think NASA, not Notion.
2. **Speed is a Feature:** Every action should feel instant. Loading states should be rare.
3. **Trust Through Transparency:** Show every transaction, every calculation, every decision. No black boxes.
4. **Defaults Over Configuration:** Smart defaults that work for 80% of users. Power users can customize.
5. **Errors as First-Class Citizens:** Every error is an opportunity to guide the user, not abandon them.

---

*Last Updated: 2026-01-03*
*Version: 1.0 MVP*
