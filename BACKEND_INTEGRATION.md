# Qoda Backend Integration Guide

This guide explains how to connect your Qoda frontend to your backend built in Cursor.

## Quick Start

### 1. Set Environment Variable

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

For production:
```env
NEXT_PUBLIC_BACKEND_URL=https://api.your-domain.com
```

### 2. Expected Backend API Endpoints

Your backend should expose these REST API endpoints:

#### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-email` - Verify email with token
- `GET /api/auth/me` - Get current user

#### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

#### Agents
- `GET /api/agents` - List all agents (optional: ?clientId=xxx)
- `GET /api/agents/:id` - Get agent by ID
- `POST /api/agents` - Create new agent (issues virtual card)
- `PATCH /api/agents/:id` - Update agent limits
- `POST /api/agents/:id/freeze` - Freeze agent's card
- `POST /api/agents/:id/unfreeze` - Unfreeze agent's card
- `GET /api/agents/:id/card` - Get full card details (number, expiry, cvc)

#### Transactions
- `GET /api/transactions` - List transactions (optional filters)
- `GET /api/transactions/:id` - Get transaction by ID

#### Invoices
- `GET /api/invoices` - List all invoices (optional: ?status=xxx)
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create new invoice
- `POST /api/invoices/:id/send` - Send invoice to client
- `POST /api/invoices/:id/mark-paid` - Mark invoice as paid
- `POST /api/invoices/calculate` - Calculate spend for invoice generation

#### Funding
- `GET /api/funding/balance` - Get current balance
- `POST /api/funding/add` - Add funds
- `GET /api/funding/history` - Get funding history
- `POST /api/funding/auto-reload` - Configure auto-reload

#### Alerts
- `GET /api/alerts` - List all alerts
- `POST /api/alerts/:id/dismiss` - Dismiss an alert
- `GET /api/alerts/settings` - Get alert settings
- `PATCH /api/alerts/settings` - Update alert settings

#### Settings
- `GET /api/settings` - Get agency settings
- `PATCH /api/settings` - Update agency settings
- `GET /api/settings/stripe` - Get Stripe connection status

### 3. Authentication Flow

The frontend uses JWT tokens for authentication:

1. User logs in via `/api/auth/login`
2. Backend returns `{ token: "jwt...", user: {...} }`
3. Token is stored in localStorage
4. All subsequent requests include `Authorization: Bearer <token>` header

### 4. Replacing Mock Data

Currently, pages use mock data from `lib/mock-data.ts`. To use real data:

```tsx
// Before (mock data)
import { mockClients } from '@/lib/mock-data'
const clients = mockClients

// After (real API)
import { useClients } from '@/hooks/use-api'
const { data: clients, error, isLoading } = useClients()
```

### 5. Example: Converting Clients Page

```tsx
// app/(dashboard)/clients/page.tsx
"use client"

import { useClients } from '@/hooks/use-api'
import { clientsApi } from '@/lib/api'

export default function ClientsPage() {
  const { data: clients, error, isLoading, mutate } = useClients()

  const handleCreateClient = async (data: CreateClientData) => {
    await clientsApi.create(data)
    mutate() // Refresh the list
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    // ... rest of your component using `clients`
  )
}
```

### 6. WebSocket for Real-time Data (Optional)

For real-time transaction feed, you can add WebSocket support:

```tsx
// lib/websocket.ts
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

export function connectTransactionFeed(onTransaction: (tx: Transaction) => void) {
  const ws = new WebSocket(WS_URL)
  
  ws.onmessage = (event) => {
    const tx = JSON.parse(event.data)
    onTransaction(tx)
  }
  
  return () => ws.close()
}
```

### 7. Stripe Integration

For Stripe onboarding, your backend should:

1. Create Stripe Connect account: `POST /api/stripe/create-account`
2. Generate onboarding link: `GET /api/stripe/onboarding-link`
3. Handle webhook: `POST /api/stripe/webhook`
4. Issue virtual cards via Stripe Issuing

### 8. CORS Configuration

Ensure your backend allows requests from your frontend:

```python
# FastAPI example
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## File Structure

```
lib/
  api.ts          # API client with all endpoints
  mock-data.ts    # Mock data (remove after integration)
  
hooks/
  use-api.ts      # SWR hooks for data fetching
```

## Need Help?

- Check the API types in `lib/api.ts` for expected request/response shapes
- Use browser DevTools Network tab to debug API calls
- Ensure your backend returns proper error messages for better UX
