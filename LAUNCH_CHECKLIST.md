# 🚀 QODA Launch Checklist

## Pre-Launch Verification

### ✅ Backend Integrity
- [x] **Audit Logging** - All errors logged to `audit_log` table
- [x] **Currency Integrity** - All monetary values use BigInt cents (no floating point)
- [x] **Database Migrations** - All tables created with RLS policies
  - [x] `alerts` table
  - [x] `funding_transactions` table
  - [x] `invoices` table
  - [x] `issuing_balance_cents` is BIGINT
- [x] **Atomic Balance Operations** - Race conditions prevented
- [x] **Double-Entry Bookkeeping** - Ledger entries always balanced

### ✅ API Security
- [x] **Authentication** - `requireAuth()` on all protected endpoints
- [x] **Authorization** - Role checks for admin operations
- [x] **Webhook Verification** - All Stripe webhooks verify signatures
- [x] **Rate Limiting** - Applied to all API routes
- [x] **Input Validation** - Zod schemas validate all inputs
- [x] **Idempotency** - Webhook handlers check for duplicate processing

### ✅ Frontend
- [x] **Auth Callback** - `/auth/callback` handles email confirmation + password reset
- [x] **Dashboard** - Wired to real APIs with loading/error states
- [x] **Data Hooks** - `useDashboardData`, `useAgents`, `useClients`
- [x] **Empty States** - Clean UX when no data
- [x] **Design System** - Consistent tokens/components

### ✅ Tests
- [x] **Unit Tests** - 69 tests passing
  - [x] Currency conversion tests
  - [x] Ledger type tests
  - [x] Webhook signature tests
- [x] **Type Check** - `npm run type-check` passes
- [x] **Build** - `npm run build` succeeds

---

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Server-side only!

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_ISSUING_AUTH_WEBHOOK_SECRET=  # Optional, falls back to STRIPE_WEBHOOK_SECRET
STRIPE_ISSUING_TXN_WEBHOOK_SECRET=   # Optional, falls back to STRIPE_WEBHOOK_SECRET
STRIPE_CONNECT_WEBHOOK_SECRET=       # Optional, falls back to STRIPE_WEBHOOK_SECRET

# App
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Feature Flags
ENABLE_STRIPE_ISSUING=false  # Set to "true" when Issuing is configured
```

---

## Stripe Webhook Endpoints to Configure

| Endpoint | Events | Secret |
|----------|--------|--------|
| `/api/webhooks/stripe/issuing-authorizations` | `issuing_authorization.request` | `STRIPE_ISSUING_AUTH_WEBHOOK_SECRET` |
| `/api/webhooks/stripe/issuing-transactions` | `issuing_transaction.created` | `STRIPE_ISSUING_TXN_WEBHOOK_SECRET` |
| `/api/webhooks/stripe/account-updated` | `account.updated` | `STRIPE_CONNECT_WEBHOOK_SECRET` |
| `/api/webhooks/user` | Custom user events | N/A |

---

## Database Migrations

Run these in order via Supabase dashboard or CLI:

```bash
supabase db push
```

Or manually in order:
1. `001_ledger_schema.sql` - Core ledger tables
2. `002_organizations.sql` - Org structure + RLS
3. `003_core_domain.sql` - Clients, agents, cards, transactions
4. ... (004-019)
5. `020_missing_tables_and_balance_fix.sql` - Launch-critical fixes

---

## Post-Migration Verification

```sql
-- Verify all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('alerts', 'funding_transactions', 'invoices', 'organizations', 'agents');

-- Verify balance column is BIGINT
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'organizations' AND column_name = 'issuing_balance_cents';

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

---

## Go-Live Steps

1. **Database**
   - [ ] Run all migrations
   - [ ] Verify RLS policies active
   - [ ] Test with anon key (should be restricted)

2. **Stripe**
   - [ ] Configure webhook endpoints
   - [ ] Test webhook signatures work
   - [ ] Set `ENABLE_STRIPE_ISSUING=true` when ready

3. **Deploy**
   - [ ] Push to production (Vercel/similar)
   - [ ] Verify environment variables set
   - [ ] Run smoke tests

4. **Monitor**
   - [ ] Check `audit_log` for errors
   - [ ] Watch Stripe webhook dashboard
   - [ ] Monitor Supabase usage

---

## Known Limitations (For Later)

1. **Stripe Card Issuance** - Not yet configured (feature-flagged off)
2. **Mock Data** - Some pages still use mock data for demo purposes
3. **Email Service** - Invoice emails are logged but not sent (mock)
4. **Redis** - Rate limiting uses in-memory store (fine for single-instance)

---

## Support Contacts

- **Technical Issues**: Check `audit_log` table first
- **Stripe Issues**: Verify webhook secrets match
- **Auth Issues**: Check Supabase auth logs

---

**Last Updated**: January 5, 2026
**Build Status**: ✅ Passing
**Test Status**: ✅ 69/69 Tests Passing

