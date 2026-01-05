/**
 * Qoda - Consolidated Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used across the application.
 * Types are grouped by entity for easy navigation and maintenance.
 */

// ============================================
// USER & AUTH
// ============================================

export interface User {
  id: string
  email: string
  agencyName: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface MessageResponse {
  message: string
}

// ============================================
// CLIENTS
// ============================================

export interface Client {
  id: string
  name: string
  billingEmail: string
  markupPercentage: number
  billingCycle: "monthly" | "biweekly"
  status: ClientStatus
  totalSpend: number
  agentCount: number
  createdAt: string
}

export type ClientStatus = "active" | "paused" | "archived"

export interface CreateClientData {
  name: string
  billingEmail: string
  markupPercentage: number
  billingCycle: "monthly" | "biweekly"
}

export type UpdateClientData = Partial<CreateClientData>

// ============================================
// AGENTS
// ============================================

export interface Agent {
  id: string
  clientId: string
  clientName: string
  name: string
  description: string
  cardLastFour: string
  dailyLimit: number
  monthlyLimit: number
  currentDailySpend: number
  currentMonthlySpend: number
  status: AgentStatus
  createdAt: string
}

export type AgentStatus = "active" | "paused" | "cancelled"

export interface CreateAgentData {
  clientId: string
  name: string
  description: string
  dailyLimit: number
  monthlyLimit: number
}

export type UpdateAgentData = Partial<CreateAgentData>

export interface CardDetails {
  number: string
  expiry: string
  cvc: string
}

// ============================================
// TRANSACTIONS
// ============================================

export interface Transaction {
  id: string
  agentId: string
  agentName: string
  clientId: string
  clientName: string
  amount: number
  currency: string
  /** Merchant display name */
  merchant: string
  /** Alternative merchant name field */
  merchantName?: string
  /** Merchant Category Code */
  merchantCategory: string
  /** Alternative MCC field */
  merchantMcc?: string
  status: TransactionStatus
  declineReason?: string
  createdAt: string
  stripeResponse?: Record<string, unknown>
}

export type TransactionStatus = "approved" | "declined" | "pending"

export interface TransactionFilters {
  clientId?: string
  agentId?: string
  status?: TransactionStatus
  limit?: number
}

// ============================================
// INVOICES
// ============================================

export interface Invoice {
  id: string
  clientId: string
  clientName: string
  periodStart: string
  periodEnd: string
  subtotal: number
  markupAmount: number
  total: number
  status: InvoiceStatus
  sentAt?: string
  paidAt?: string
  createdAt: string
  lineItems?: InvoiceLineItem[]
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue"

export interface InvoiceLineItem {
  agentId: string
  agentName: string
  description: string
  amount: number
}

export interface CreateInvoiceData {
  clientId: string
  periodStart: string
  periodEnd: string
}

export interface SpendCalculation {
  rawSpend: number
  markupPercentage: number
  markupAmount: number
  total: number
  agentBreakdown: AgentSpendBreakdown[]
}

export interface AgentSpendBreakdown {
  agentId: string
  agentName: string
  spend: number
}

// ============================================
// FUNDING
// ============================================

export interface FundingBalance {
  balance: number
  pending: number
}

export interface FundingTransaction {
  id: string
  amount: number
  status: FundingTransactionStatus
  type: FundingTransactionType
  createdAt: string
}

export type FundingTransactionStatus = "pending" | "completed" | "failed"
export type FundingTransactionType = "deposit" | "auto_reload"

export interface AddFundsData {
  amount: number
  paymentMethodId: string
}

export interface AddFundsResponse {
  success: boolean
  transactionId: string
}

export interface AutoReloadSettings {
  enabled: boolean
  threshold: number
  amount: number
}

// ============================================
// ALERTS
// ============================================

export interface Alert {
  id: string
  type: AlertType
  severity?: AlertSeverity
  title?: string
  message: string
  agentId?: string
  agentName?: string
  clientId?: string
  transactionId?: string
  createdAt: string
  /** Whether alert has been dismissed (api.ts naming) */
  dismissed?: boolean
  /** Whether alert has been acknowledged (mock-data.ts naming) */
  acknowledged?: boolean
}

export type AlertType =
  | "velocity_breach"
  | "decline_spike"
  | "low_balance"
  | "unusual_activity"
  | "decline"
  | "anomaly"
  | "limit_approaching"
  | "limit_reached"

export type AlertSeverity = "low" | "medium" | "high" | "critical"

export interface AlertSettings {
  velocityThreshold: number
  declineSpikeThreshold: number
  lowBalanceThreshold: number
  emailNotifications: boolean
  slackWebhook?: string
}

// ============================================
// SETTINGS
// ============================================

export interface Settings {
  agencyName: string
  billingEmail: string
  defaultMarkup: number
  timezone: string
}

export interface StripeStatus {
  connected: boolean
  accountId?: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
}

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

export interface DashboardStats {
  activeAgents: number
  totalAgents: number
  dailyBurnRate: number
  monthlyBurnRate: number
  totalSpend: number
  riskScore: RiskScore
  pendingAlerts: number
}

export type RiskScore = "Low" | "Medium" | "High" | "Critical"

export interface SpendDataPoint {
  date: string
  amount: number
}

export interface HourlySpendDataPoint {
  hour: string
  amount: number
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiSuccessResponse {
  success: boolean
}

export interface ApiErrorResponse {
  message: string
  code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============================================
// UTILITY TYPES
// ============================================

/** Make specific keys optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** Make specific keys required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/** Extract the ID type from an entity */
export type EntityId<T extends { id: string }> = T["id"]

/** Common date range filter */
export interface DateRange {
  startDate: string
  endDate: string
}



