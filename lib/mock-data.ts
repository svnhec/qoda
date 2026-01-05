// Mock data for Qoda - simulating real data structure

export interface Client {
  id: string;
  name: string;
  billingEmail: string;
  markupPercentage: number;
  billingCycle: "monthly" | "biweekly";
  status: "active" | "archived";
  totalSpend: number;
  agentCount: number;
  createdAt: string;
}

export interface Agent {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  description: string;
  cardLastFour: string;
  dailyLimit: number;
  monthlyLimit: number;
  currentDailySpend: number;
  currentMonthlySpend: number;
  status: "active" | "paused" | "cancelled";
  createdAt: string;
}

export interface Transaction {
  id: string;
  agentId: string;
  agentName: string;
  clientId: string;
  clientName: string;
  amount: number;
  currency: string;
  merchantName: string;
  merchantMcc: string;
  status: "approved" | "declined" | "pending";
  declineReason?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  markupAmount: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue";
  sentAt?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  type: "decline" | "anomaly" | "limit_approaching" | "limit_reached";
  agentId?: string;
  agentName?: string;
  transactionId?: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

// Mock Clients
export const mockClients: Client[] = [
  {
    id: "cl_1",
    name: "TechCorp Industries",
    billingEmail: "billing@techcorp.io",
    markupPercentage: 20,
    billingCycle: "monthly",
    status: "active",
    totalSpend: 12450.8,
    agentCount: 8,
    createdAt: "2025-10-15T10:00:00Z",
  },
  {
    id: "cl_2",
    name: "Nexus Ventures",
    billingEmail: "accounts@nexusvc.com",
    markupPercentage: 25,
    billingCycle: "monthly",
    status: "active",
    totalSpend: 8920.4,
    agentCount: 5,
    createdAt: "2025-11-01T14:30:00Z",
  },
  {
    id: "cl_3",
    name: "Quantum Dynamics",
    billingEmail: "finance@quantum-d.co",
    markupPercentage: 15,
    billingCycle: "biweekly",
    status: "active",
    totalSpend: 15780.25,
    agentCount: 12,
    createdAt: "2025-09-20T09:00:00Z",
  },
  {
    id: "cl_4",
    name: "Stellar Systems",
    billingEmail: "ap@stellar.systems",
    markupPercentage: 20,
    billingCycle: "monthly",
    status: "active",
    totalSpend: 6340.9,
    agentCount: 4,
    createdAt: "2025-12-01T16:00:00Z",
  },
  {
    id: "cl_5",
    name: "Apex Analytics",
    billingEmail: "billing@apexanalytics.ai",
    markupPercentage: 30,
    billingCycle: "monthly",
    status: "archived",
    totalSpend: 3200.0,
    agentCount: 2,
    createdAt: "2025-08-10T11:00:00Z",
  },
];

// Mock Agents
export const mockAgents: Agent[] = [
  {
    id: "ag_1",
    clientId: "cl_1",
    clientName: "TechCorp Industries",
    name: "Lead Gen Bot v2",
    description: "LinkedIn outreach and lead qualification",
    cardLastFour: "4242",
    dailyLimit: 500,
    monthlyLimit: 5000,
    currentDailySpend: 127.5,
    currentMonthlySpend: 2340.8,
    status: "active",
    createdAt: "2025-10-16T08:00:00Z",
  },
  {
    id: "ag_2",
    clientId: "cl_1",
    clientName: "TechCorp Industries",
    name: "Support Agent Alpha",
    description: "Customer support ticket handler",
    cardLastFour: "8371",
    dailyLimit: 200,
    monthlyLimit: 2000,
    currentDailySpend: 45.2,
    currentMonthlySpend: 890.4,
    status: "active",
    createdAt: "2025-10-18T12:00:00Z",
  },
  {
    id: "ag_3",
    clientId: "cl_2",
    clientName: "Nexus Ventures",
    name: "Content Creator Pro",
    description: "Blog post and social media content generation",
    cardLastFour: "9156",
    dailyLimit: 300,
    monthlyLimit: 3000,
    currentDailySpend: 89.9,
    currentMonthlySpend: 1560.25,
    status: "active",
    createdAt: "2025-11-02T10:00:00Z",
  },
  {
    id: "ag_4",
    clientId: "cl_3",
    clientName: "Quantum Dynamics",
    name: "Data Processor X1",
    description: "Large dataset processing and analysis",
    cardLastFour: "2847",
    dailyLimit: 1000,
    monthlyLimit: 10000,
    currentDailySpend: 456.8,
    currentMonthlySpend: 8920.5,
    status: "active",
    createdAt: "2025-09-21T14:00:00Z",
  },
  {
    id: "ag_5",
    clientId: "cl_3",
    clientName: "Quantum Dynamics",
    name: "Email Automation Bot",
    description: "Automated email campaigns and responses",
    cardLastFour: "6493",
    dailyLimit: 150,
    monthlyLimit: 1500,
    currentDailySpend: 0,
    currentMonthlySpend: 1240.8,
    status: "paused",
    createdAt: "2025-09-25T09:00:00Z",
  },
  {
    id: "ag_6",
    clientId: "cl_4",
    clientName: "Stellar Systems",
    name: "Research Assistant",
    description: "Market research and competitive analysis",
    cardLastFour: "1738",
    dailyLimit: 400,
    monthlyLimit: 4000,
    currentDailySpend: 234.6,
    currentMonthlySpend: 2890.4,
    status: "active",
    createdAt: "2025-12-02T08:00:00Z",
  },
];

// Mock Transactions (recent)
export const mockTransactions: Transaction[] = [
  {
    id: "tx_1",
    agentId: "ag_1",
    agentName: "Lead Gen Bot v2",
    clientId: "cl_1",
    clientName: "TechCorp Industries",
    amount: 45.0,
    currency: "USD",
    merchantName: "OpenAI",
    merchantMcc: "7372",
    status: "approved",
    createdAt: "2026-01-04T14:32:15Z",
  },
  {
    id: "tx_2",
    agentId: "ag_4",
    agentName: "Data Processor X1",
    clientId: "cl_3",
    clientName: "Quantum Dynamics",
    amount: 128.5,
    currency: "USD",
    merchantName: "AWS",
    merchantMcc: "7372",
    status: "approved",
    createdAt: "2026-01-04T14:28:42Z",
  },
  {
    id: "tx_3",
    agentId: "ag_3",
    agentName: "Content Creator Pro",
    clientId: "cl_2",
    clientName: "Nexus Ventures",
    amount: 22.4,
    currency: "USD",
    merchantName: "Anthropic",
    merchantMcc: "7372",
    status: "approved",
    createdAt: "2026-01-04T14:25:08Z",
  },
  {
    id: "tx_4",
    agentId: "ag_6",
    agentName: "Research Assistant",
    clientId: "cl_4",
    clientName: "Stellar Systems",
    amount: 750.0,
    currency: "USD",
    merchantName: "Google Cloud",
    merchantMcc: "7372",
    status: "declined",
    declineReason: "Daily limit exceeded",
    createdAt: "2026-01-04T14:18:33Z",
  },
  {
    id: "tx_5",
    agentId: "ag_2",
    agentName: "Support Agent Alpha",
    clientId: "cl_1",
    clientName: "TechCorp Industries",
    amount: 18.9,
    currency: "USD",
    merchantName: "OpenAI",
    merchantMcc: "7372",
    status: "approved",
    createdAt: "2026-01-04T14:12:55Z",
  },
  {
    id: "tx_6",
    agentId: "ag_4",
    agentName: "Data Processor X1",
    clientId: "cl_3",
    clientName: "Quantum Dynamics",
    amount: 89.2,
    currency: "USD",
    merchantName: "Pinecone",
    merchantMcc: "7372",
    status: "approved",
    createdAt: "2026-01-04T14:05:21Z",
  },
  {
    id: "tx_7",
    agentId: "ag_1",
    agentName: "Lead Gen Bot v2",
    clientId: "cl_1",
    clientName: "TechCorp Industries",
    amount: 32.8,
    currency: "USD",
    merchantName: "OpenAI",
    merchantMcc: "7372",
    status: "approved",
    createdAt: "2026-01-04T13:58:47Z",
  },
  {
    id: "tx_8",
    agentId: "ag_3",
    agentName: "Content Creator Pro",
    clientId: "cl_2",
    clientName: "Nexus Ventures",
    amount: 15.6,
    currency: "USD",
    merchantName: "Stability AI",
    merchantMcc: "7372",
    status: "approved",
    createdAt: "2026-01-04T13:45:12Z",
  },
];

// Mock Invoices
export const mockInvoices: Invoice[] = [
  {
    id: "inv_1",
    clientId: "cl_1",
    clientName: "TechCorp Industries",
    periodStart: "2025-12-01T00:00:00Z",
    periodEnd: "2025-12-31T23:59:59Z",
    subtotal: 4580.4,
    markupAmount: 916.08,
    total: 5496.48,
    status: "paid",
    sentAt: "2026-01-01T10:00:00Z",
    paidAt: "2026-01-03T14:30:00Z",
    createdAt: "2026-01-01T09:00:00Z",
  },
  {
    id: "inv_2",
    clientId: "cl_2",
    clientName: "Nexus Ventures",
    periodStart: "2025-12-01T00:00:00Z",
    periodEnd: "2025-12-31T23:59:59Z",
    subtotal: 3240.8,
    markupAmount: 810.2,
    total: 4051.0,
    status: "sent",
    sentAt: "2026-01-01T10:15:00Z",
    createdAt: "2026-01-01T09:15:00Z",
  },
  {
    id: "inv_3",
    clientId: "cl_3",
    clientName: "Quantum Dynamics",
    periodStart: "2025-12-16T00:00:00Z",
    periodEnd: "2025-12-31T23:59:59Z",
    subtotal: 5890.25,
    markupAmount: 883.54,
    total: 6773.79,
    status: "draft",
    createdAt: "2026-01-01T09:30:00Z",
  },
  {
    id: "inv_4",
    clientId: "cl_4",
    clientName: "Stellar Systems",
    periodStart: "2025-12-01T00:00:00Z",
    periodEnd: "2025-12-31T23:59:59Z",
    subtotal: 2890.4,
    markupAmount: 578.08,
    total: 3468.48,
    status: "overdue",
    sentAt: "2026-01-01T10:30:00Z",
    createdAt: "2026-01-01T09:45:00Z",
  },
];

// Mock Alerts
export const mockAlerts: Alert[] = [
  {
    id: "al_1",
    type: "decline",
    agentId: "ag_6",
    agentName: "Research Assistant",
    transactionId: "tx_4",
    message: "Transaction declined: Daily limit exceeded ($750.00)",
    acknowledged: false,
    createdAt: "2026-01-04T14:18:33Z",
  },
  {
    id: "al_2",
    type: "limit_approaching",
    agentId: "ag_4",
    agentName: "Data Processor X1",
    message: "Monthly spend at 89% of limit ($8,920 / $10,000)",
    acknowledged: false,
    createdAt: "2026-01-04T12:00:00Z",
  },
  {
    id: "al_3",
    type: "anomaly",
    agentId: "ag_1",
    agentName: "Lead Gen Bot v2",
    message: "Unusual spend velocity detected: 3x normal rate",
    acknowledged: true,
    createdAt: "2026-01-04T10:30:00Z",
  },
  {
    id: "al_4",
    type: "limit_reached",
    agentId: "ag_5",
    agentName: "Email Automation Bot",
    message: "Daily limit reached - card paused automatically",
    acknowledged: true,
    createdAt: "2026-01-03T18:45:00Z",
  },
];

// Dashboard stats
export const dashboardStats = {
  activeAgents: 5,
  totalAgents: 6,
  dailyBurnRate: 954.0,
  monthlyBurnRate: 17842.95,
  totalSpend: 46692.35,
  riskScore: "Low",
  pendingAlerts: 2,
};

// Spend data for charts (last 7 days)
export const spendHistory = [
  { date: "2025-12-29", amount: 2340 },
  { date: "2025-12-30", amount: 2890 },
  { date: "2025-12-31", amount: 1560 },
  { date: "2026-01-01", amount: 890 },
  { date: "2026-01-02", amount: 3420 },
  { date: "2026-01-03", amount: 2780 },
  { date: "2026-01-04", amount: 954 },
];

// Hourly spend for today
export const hourlySpend = [
  { hour: "00:00", amount: 45 },
  { hour: "01:00", amount: 32 },
  { hour: "02:00", amount: 18 },
  { hour: "03:00", amount: 12 },
  { hour: "04:00", amount: 8 },
  { hour: "05:00", amount: 15 },
  { hour: "06:00", amount: 28 },
  { hour: "07:00", amount: 56 },
  { hour: "08:00", amount: 89 },
  { hour: "09:00", amount: 124 },
  { hour: "10:00", amount: 112 },
  { hour: "11:00", amount: 87 },
  { hour: "12:00", amount: 134 },
  { hour: "13:00", amount: 96 },
  { hour: "14:00", amount: 98 },
];

