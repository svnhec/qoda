# Qoda - Financial Operating System for AI Agents

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/your-org/qoda/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Stripe](https://img.shields.io/badge/Stripe-Connected-635bff)](https://stripe.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Connected-3ecf8e)](https://supabase.com/)

> **Financial Observability for AI Agents** - Issue virtual cards, manage spend policies, and automate rebilling for AI Automation Agencies.

## 🚀 Overview

Qoda transforms traditional accounting into real-time financial observability. Built for AI agency owners who need to monitor and control AI agent spending with the precision of a trading desk.

### Key Features

- **🔍 Real-Time Observability**: Live spend monitoring with anomaly detection
- **🎛️ Fleet Command**: Bulk control of hundreds of AI agents
- **💳 Virtual Cards**: Automated card issuance with velocity controls
- **📊 Financial Analytics**: Cost vs. revenue visualization with markup tracking
- **🔒 Enterprise Security**: SOC2 compliant with end-to-end encryption
- **⚡ High Performance**: Built for millisecond-scale financial operations

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Payments**: Stripe Connect + Issuing
- **Database**: PostgreSQL with Row-Level Security
- **Deployment**: Vercel/Netlify + Supabase Cloud

### System Design

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Dashboard │    │   API Routes    │    │   Stripe API    │
│                 │◄──►│                 │◄──►│                 │
│ • Fleet Command │    │ • Webhook Hand. │    │ • Issuing       │
│ • Real-time     │    │ • CRUD Ops      │    │ • Connect       │
│ • Analytics     │    │ • Cron Jobs     │    │ • Webhooks      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │   Supabase      │
                    │   PostgreSQL    │
                    │                 │
                    │ • RLS Security  │
                    │ • Audit Logs    │
                    │ • Ledger        │
                    │ • Organizations │
                    └─────────────────┘
```

## 📋 Prerequisites

- **Node.js 18+**
- **PostgreSQL 15+** (via Supabase)
- **Stripe Account** with Issuing enabled
- **Git**

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/qoda.git
cd qoda
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the environment template and configure your variables:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ISSUING_TXN_WEBHOOK_SECRET=whsec_...

# Application
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
CRON_SECRET=your_cron_secret

# Feature Flags
ENABLE_STRIPE_ISSUING=true
ENABLE_BILLING=true
```

### 4. Database Setup

Initialize Supabase and run migrations:

```bash
# Push schema to Supabase
npm run db:migrate

# Generate TypeScript types
npm run db:types
```

### 5. Stripe Configuration

1. **Enable Issuing** in your Stripe dashboard
2. **Create webhook endpoints** for:
   - `issuing_authorization.request`
   - `issuing_transaction.created`
   - `account.updated`
3. **Set webhook secrets** in environment variables

### 6. Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Quick Start

1. **Sign up** for a new organization
2. **Connect Stripe** account for card issuing
3. **Create your first agent** with velocity controls
4. **Issue virtual cards** and monitor spend in real-time

### API Documentation

#### Core Endpoints

```typescript
// Create Agent
POST /api/v1/agents
{
  "name": "Email Outreach Bot",
  "monthly_budget_cents": 50000,
  "soft_limit_cents_per_minute": 5000,
  "hard_limit_cents_per_minute": 10000
}

// Issue Card
POST /api/v1/agents/issue-card
{
  "agent_id": "agent_123"
}

// Get Agent Logs
GET /api/agents/logs?agent_id=agent_123
```

#### Webhook Events

Qoda processes the following Stripe webhook events:

- `issuing_authorization.request` - Real-time authorization requests
- `issuing_transaction.created` - Transaction settlements
- `account.updated` - Account verification status changes

### CLI Usage

```bash
# Deploy new agent
qoda agent create --name "Research Bot" --budget 1000

# Monitor agent spend
qoda agent monitor --id agent_123

# View fleet status
qoda fleet status
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npm run test:e2e
```

### Test Coverage

```bash
npm run test:coverage
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository** to Vercel
2. **Set Environment Variables** in Vercel dashboard
3. **Configure Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Supabase Deployment

```bash
# Deploy database functions
supabase functions deploy

# Deploy migrations
npm run db:migrate
```

## 🔒 Security

### Authentication & Authorization

- **Supabase Auth** with Row-Level Security (RLS)
- **JWT-based** session management
- **Organization-scoped** data isolation
- **Role-based access control** (Owner, Admin, Editor, Viewer)

### Financial Security

- **Stripe webhook signature** verification
- **BigInt currency handling** (prevents floating-point errors)
- **Double-entry bookkeeping** with database constraints
- **Idempotency keys** for operation deduplication

### Data Protection

- **End-to-end encryption** for sensitive data
- **GDPR compliance** with data export/deletion
- **SOC2 Type II** compliance automation
- **Audit logging** for all financial operations

## 📊 Monitoring & Analytics

### Real-Time Metrics

- **Spend velocity** (dollars per minute/hour)
- **Budget utilization** with predictive alerts
- **Agent performance** correlation analysis
- **Revenue attribution** by client and agent

### Alerting

- **Budget threshold** notifications
- **Velocity limit** warnings
- **Card declined** alerts
- **System health** monitoring

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes with tests
4. **Run** the test suite: `npm test`
5. **Commit** your changes: `git commit -m 'Add amazing feature'`
6. **Push** to the branch: `git push origin feature/amazing-feature`
7. **Open** a Pull Request

### Code Standards

- **TypeScript strict mode** required
- **ESLint** rules must pass
- **Tests** required for new features
- **Documentation** updates required
- **Security review** for financial operations

### Commit Conventions

```bash
feat: add new payment method
fix: resolve webhook signature verification
docs: update API documentation
test: add unit tests for currency conversion
refactor: optimize database queries
```

## 📚 API Reference

### REST API

#### Authentication

All API requests require authentication via Bearer token:

```bash
Authorization: Bearer your_supabase_jwt_token
```

#### Rate Limits

- **Authenticated requests**: 1000/hour
- **Webhook endpoints**: Unlimited (Stripe verified)
- **Public endpoints**: 100/minute

### WebSocket API

Real-time dashboard updates via WebSocket:

```javascript
const ws = new WebSocket('wss://api.qoda.io/stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle real-time updates
};
```

## 🐛 Troubleshooting

### Common Issues

#### Build Fails
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

#### Database Connection Issues
```bash
# Check Supabase connection
npm run db:types

# Reset local database
npm run db:reset
```

#### Stripe Webhook Failures
```bash
# Test webhook endpoint
curl -X POST https://yourdomain.com/api/webhooks/stripe/issuing-transactions \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: ..." \
  -d '{"test": "data"}'
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Stripe** for powering the financial infrastructure
- **Supabase** for the developer-friendly backend
- **Next.js** for the exceptional React framework
- **Tailwind CSS** for the utility-first styling approach

## 📞 Support

- **Documentation**: [docs.qoda.io](https://docs.qoda.io)
- **Community**: [Discord](https://discord.gg/qoda)
- **Enterprise**: [enterprise@qoda.io](mailto:enterprise@qoda.io)
- **Security**: [security@qoda.io](mailto:security@qoda.io)

---

**Built with ❤️ for the AI automation economy**


