# Card Issuance Readiness (Prompts 7-9)

This document confirms all required data structures are in place for the card issuance phase.

## ✅ Database Schema Ready

### 1. Organizations - Stripe Verification Gate

**Table:** `organizations`  
**Migration:** `supabase/migrations/002_organizations.sql`

```sql
stripe_account_verified_at TIMESTAMPTZ
```

- **Purpose:** Gates card issuance until Stripe Connect account is verified
- **Usage:** Check `stripe_account_verified_at IS NOT NULL` before issuing cards
- **Already used in:** Agent detail page (Issue Card button disabled state)

### 2. Agents - Budget & Attribution

**Table:** `agents`  
**Migration:** `supabase/migrations/003_core_domain.sql`

```sql
organization_id UUID NOT NULL REFERENCES organizations(id)
client_id UUID REFERENCES clients(id)  -- nullable for internal agents
monthly_budget_cents BIGINT NOT NULL DEFAULT 0
current_spend_cents BIGINT NOT NULL DEFAULT 0
reset_date DATE NOT NULL DEFAULT CURRENT_DATE
```

- **Organization attribution:** Every agent belongs to an organization
- **Client attribution:** Optional client for billing purposes
- **Budget tracking:** Monthly budget and current spend in cents (BigInt)
- **Reset date:** For monthly budget reset tracking

### 3. Virtual Cards - Card Metadata Storage

**Table:** `virtual_cards`  
**Migration:** `supabase/migrations/003_core_domain.sql`

```sql
id TEXT PRIMARY KEY,                           -- Stripe card ID
agent_id UUID NOT NULL REFERENCES agents(id),
organization_id UUID NOT NULL REFERENCES organizations(id),
stripe_cardholder_id TEXT NOT NULL,
last4 TEXT NOT NULL,
brand TEXT NOT NULL,
exp_month INTEGER NOT NULL,
exp_year INTEGER NOT NULL,
spending_limit_cents BIGINT NOT NULL,
current_spend_cents BIGINT NOT NULL DEFAULT 0,
is_active BOOLEAN NOT NULL DEFAULT true,
metadata JSONB DEFAULT '{}'::jsonb
```

- **References:** Links to agent and organization
- **Stripe data:** Cardholder ID, last4, brand, expiration
- **Spending controls:** Limit and current spend in cents (BigInt)
- **Status tracking:** Active flag for card status

## ✅ TypeScript Types Ready

All types defined in `src/lib/db/types.ts`:

| Type | Purpose |
|------|---------|
| `Organization` | Includes `stripe_account_verified_at` |
| `Agent` | Includes `monthly_budget_cents`, `current_spend_cents`, org/client refs |
| `VirtualCard` | Full card metadata with BigInt spending fields |
| `AgentRow` / `AgentInsert` / `AgentUpdate` | Row types with string cents for DB |
| `VirtualCardRow` / `VirtualCardInsert` | Row types with string cents for DB |

### BigInt Conversion Helpers

```typescript
// Parse DB row (string) → Domain type (BigInt)
parseAgent(row: AgentRow): Agent
parseVirtualCard(row: VirtualCardRow): VirtualCard

// Serialize Domain type (BigInt) → DB row (string)
serializeAgentInsert(agent: AgentInsert): {...}
serializeVirtualCardInsert(card: VirtualCardInsert): {...}
```

## ✅ Validation Schemas Ready

Defined in `src/lib/validation/agent.ts`:

- `dollarsToCentsSchema` - Converts dollar input to BigInt cents
- `createAgentSchema` - Validates agent creation with budget
- `updateAgentSchema` - Validates agent updates
- `spendingLimitSchema` - For card spending limits

## ✅ UI Gating Already Implemented

The Agent detail page (`src/app/dashboard/agents/[id]/page.tsx`) already implements:

```typescript
// Check if Stripe is connected for card issuance
const { data: org } = await supabase
  .from("organizations")
  .select("stripe_account_verified_at")
  .eq("id", organizationId)
  .single();

const canIssueCards = !!org?.stripe_account_verified_at;

// Issue Card button is disabled until verified
<Button disabled={!canIssueCards}>
  Issue Card
</Button>
```

## 📋 Ready for Prompt 7-9 Implementation

| Feature | Status |
|---------|--------|
| `organizations.stripe_account_verified_at` gate | ✅ Ready |
| `agents.monthly_budget_cents` | ✅ Ready |
| `agents.organization_id` attribution | ✅ Ready |
| `agents.client_id` attribution | ✅ Ready |
| `virtual_cards` table | ✅ Ready |
| BigInt conversion utilities | ✅ Ready |
| Validation schemas | ✅ Ready |
| UI gating for card issuance | ✅ Ready |

## Next Steps (Prompts 7-9)

1. **Create Stripe Cardholder** when agent is ready for card
2. **Issue Virtual Card** via Stripe Issuing API
3. **Store card metadata** in `virtual_cards` table
4. **Handle Stripe webhooks** for card events (transactions/authorizations)
5. **Implement spending controls** (per-transaction and monthly limits)
