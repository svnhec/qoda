import {
    LayoutDashboard,
    Users,
    CreditCard,
    Activity,
    Settings,
    LifeBuoy,
    Zap,
    Server,
    FileText,
    Bell,
    Wallet,
    TrendingUp,
    Shield,
    type LucideIcon,
} from "lucide-react"

// ============================================
// NAVIGATION
// ============================================

export interface NavItem {
    title: string
    href: string
    icon: LucideIcon
    badge?: string | number
}

export const NAV_ITEMS: NavItem[] = [
    {
        title: "Mission Control",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Agents",
        href: "/dashboard/agents",
        icon: Users,
    },
    {
        title: "Transactions",
        href: "/dashboard/transactions",
        icon: Activity,
    },
    {
        title: "Cards",
        href: "/dashboard/cards",
        icon: CreditCard,
    },
    {
        title: "Invoices",
        href: "/dashboard/invoices",
        icon: FileText,
    },
    {
        title: "Funding",
        href: "/dashboard/funding",
        icon: Wallet,
    },
    {
        title: "Integrations",
        href: "/dashboard/integrations",
        icon: Server,
    },
] as const

export const BOTTOM_NAV_ITEMS: NavItem[] = [
    {
        title: "Support",
        href: "/support",
        icon: LifeBuoy,
    },
    {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
    },
] as const

// ============================================
// APP CONFIG
// ============================================

export const APP_NAME = "Qoda" as const
export const APP_DESCRIPTION = "AI Agent Spend Management Platform" as const
export const CURRENCY = "USD" as const
export const LOCALE = "en-US" as const
export const TIMEZONE = "America/New_York" as const

export const APP_CONFIG = {
    name: APP_NAME,
    description: APP_DESCRIPTION,
    currency: CURRENCY,
    locale: LOCALE,
    timezone: TIMEZONE,
    supportEmail: "support@qoda.io",
    docsUrl: "https://docs.qoda.io",
} as const

// ============================================
// CURRENCY & FORMATTING
// ============================================

export const CURRENCY_OPTIONS = [
    { label: "US Dollar", value: "USD", symbol: "$" },
    { label: "Euro", value: "EUR", symbol: "€" },
    { label: "British Pound", value: "GBP", symbol: "£" },
    { label: "Canadian Dollar", value: "CAD", symbol: "CA$" },
    { label: "Australian Dollar", value: "AUD", symbol: "A$" },
] as const

export const DATE_FORMATS = {
    /** Jan 1, 2024 */
    SHORT: "MMM d, yyyy",
    /** January 1, 2024 */
    LONG: "MMMM d, yyyy",
    /** 01/01/2024 */
    NUMERIC: "MM/dd/yyyy",
    /** 2024-01-01 */
    ISO: "yyyy-MM-dd",
    /** Jan 1, 2024 at 3:45 PM */
    WITH_TIME: "MMM d, yyyy 'at' h:mm a",
    /** 3:45 PM */
    TIME_ONLY: "h:mm a",
    /** Jan 1 */
    MONTH_DAY: "MMM d",
} as const

export const NUMBER_FORMATS = {
    COMPACT: { notation: "compact" as const, maximumFractionDigits: 1 },
    PERCENT: { style: "percent" as const, maximumFractionDigits: 1 },
    DECIMAL: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
} as const

// ============================================
// AGENT CONSTANTS
// ============================================

export const AGENT_MODELS = [
    { label: "GPT-4 Turbo", value: "gpt-4-turbo", provider: "OpenAI" },
    { label: "GPT-4o", value: "gpt-4o", provider: "OpenAI" },
    { label: "Claude 3.5 Sonnet", value: "claude-3.5-sonnet", provider: "Anthropic" },
    { label: "Claude 3 Opus", value: "claude-3-opus", provider: "Anthropic" },
    { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro", provider: "Google" },
    { label: "Llama 3 70B", value: "llama-3-70b", provider: "Meta" },
    { label: "Mistral Large", value: "mistral-large", provider: "Mistral" },
] as const

export const AGENT_STATUS = {
    ACTIVE: "active",
    PAUSED: "paused",
    FROZEN: "frozen",
    CANCELLED: "cancelled",
    ARCHIVED: "archived",
} as const

export type AgentStatusType = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS]

export const AGENT_STATUS_COLORS: Record<AgentStatusType, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    paused: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    frozen: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    archived: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
}

// ============================================
// TRANSACTION CONSTANTS
// ============================================

export const TRANSACTION_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    DECLINED: "declined",
    VOIDED: "voided",
    REFUNDED: "refunded",
} as const

export type TransactionStatusType = (typeof TRANSACTION_STATUS)[keyof typeof TRANSACTION_STATUS]

export const TRANSACTION_STATUS_COLORS: Record<TransactionStatusType, string> = {
    pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    declined: "bg-red-500/20 text-red-400 border-red-500/30",
    voided: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    refunded: "bg-blue-500/20 text-blue-400 border-blue-500/30",
}

// ============================================
// INVOICE CONSTANTS
// ============================================

export const INVOICE_STATUS = {
    DRAFT: "draft",
    SENT: "sent",
    PAID: "paid",
    OVERDUE: "overdue",
    CANCELLED: "cancelled",
} as const

export type InvoiceStatusType = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS]

export const INVOICE_STATUS_COLORS: Record<InvoiceStatusType, string> = {
    draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    paid: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    overdue: "bg-red-500/20 text-red-400 border-red-500/30",
    cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
}

// ============================================
// BILLING & CLIENT CONSTANTS
// ============================================

export const BILLING_CYCLES = [
    { label: "Monthly", value: "monthly", days: 30 },
    { label: "Bi-Weekly", value: "biweekly", days: 14 },
    { label: "Weekly", value: "weekly", days: 7 },
] as const

export const CLIENT_STATUS = {
    ACTIVE: "active",
    PAUSED: "paused",
    ARCHIVED: "archived",
} as const

export type ClientStatusType = (typeof CLIENT_STATUS)[keyof typeof CLIENT_STATUS]

export const DEFAULT_MARKUP_PERCENTAGES = [10, 15, 20, 25, 30, 35, 40, 50] as const

// ============================================
// ALERT CONSTANTS
// ============================================

export const ALERT_TYPES = {
    VELOCITY_BREACH: "velocity_breach",
    DECLINE_SPIKE: "decline_spike",
    LOW_BALANCE: "low_balance",
    UNUSUAL_ACTIVITY: "unusual_activity",
    LIMIT_APPROACHING: "limit_approaching",
    LIMIT_REACHED: "limit_reached",
} as const

export const ALERT_SEVERITY = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical",
} as const

export type AlertSeverityType = (typeof ALERT_SEVERITY)[keyof typeof ALERT_SEVERITY]

export const ALERT_SEVERITY_COLORS: Record<AlertSeverityType, string> = {
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
}

// ============================================
// CARD CONSTANTS
// ============================================

export const CARD_STATUS = {
    ACTIVE: "active",
    FROZEN: "frozen",
    CANCELLED: "cancelled",
} as const

export const CARD_TYPES = {
    VIRTUAL: "virtual",
    PHYSICAL: "physical",
} as const

// ============================================
// MERCHANT CATEGORY CODES (Common AI/Tech)
// ============================================

export const MERCHANT_CATEGORIES = [
    { code: "7372", label: "Computer Programming, Software", icon: "💻" },
    { code: "7375", label: "Information Retrieval Services", icon: "🔍" },
    { code: "5734", label: "Computer Software Stores", icon: "🖥️" },
    { code: "5045", label: "Computers & Peripherals", icon: "⚙️" },
    { code: "4816", label: "Computer Network/Info Services", icon: "🌐" },
    { code: "5817", label: "Digital Goods: Applications", icon: "📱" },
    { code: "5818", label: "Digital Goods: Large Digital Goods", icon: "📦" },
] as const

// ============================================
// TIME RANGE FILTERS
// ============================================

export const TIME_RANGES = [
    { label: "Today", value: "today", days: 1 },
    { label: "Last 7 Days", value: "7d", days: 7 },
    { label: "Last 30 Days", value: "30d", days: 30 },
    { label: "Last 90 Days", value: "90d", days: 90 },
    { label: "This Month", value: "this_month", days: 0 },
    { label: "Last Month", value: "last_month", days: 0 },
    { label: "This Year", value: "this_year", days: 0 },
    { label: "Custom", value: "custom", days: 0 },
] as const

export type TimeRangeValue = (typeof TIME_RANGES)[number]["value"]

// ============================================
// PAGINATION & LIMITS
// ============================================

export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 25,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
    MAX_PAGE_SIZE: 100,
} as const

export const LIMITS = {
    /** Minimum daily limit for an agent ($) */
    MIN_DAILY_LIMIT: 10,
    /** Maximum daily limit for an agent ($) */
    MAX_DAILY_LIMIT: 10000,
    /** Minimum monthly limit for an agent ($) */
    MIN_MONTHLY_LIMIT: 100,
    /** Maximum monthly limit for an agent ($) */
    MAX_MONTHLY_LIMIT: 100000,
    /** Minimum markup percentage */
    MIN_MARKUP: 0,
    /** Maximum markup percentage */
    MAX_MARKUP: 100,
    /** Minimum auto-reload threshold ($) */
    MIN_AUTO_RELOAD_THRESHOLD: 100,
    /** Minimum auto-reload amount ($) */
    MIN_AUTO_RELOAD_AMOUNT: 100,
} as const

// ============================================
// RISK & THRESHOLDS
// ============================================

export const RISK_LEVELS = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
} as const

export const RISK_LEVEL_COLORS: Record<string, string> = {
    Low: "text-emerald-400",
    Medium: "text-amber-400",
    High: "text-orange-400",
    Critical: "text-red-400",
}

export const VELOCITY_THRESHOLDS = {
    /** Warn when spending is 2x normal rate */
    WARNING: 2,
    /** Alert when spending is 3x normal rate */
    ALERT: 3,
    /** Critical when spending is 5x normal rate */
    CRITICAL: 5,
} as const

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

export const KEYBOARD_SHORTCUTS = {
    SEARCH: { key: "k", modifier: "meta" },
    NEW_AGENT: { key: "n", modifier: "meta" },
    DASHBOARD: { key: "d", modifier: "meta+shift" },
    SETTINGS: { key: ",", modifier: "meta" },
    ESCAPE: { key: "Escape", modifier: null },
} as const

// ============================================
// EXTERNAL INTEGRATIONS
// ============================================

export const INTEGRATIONS = [
    { id: "openai", name: "OpenAI", icon: "🤖", connected: false },
    { id: "anthropic", name: "Anthropic", icon: "🧠", connected: false },
    { id: "stripe", name: "Stripe", icon: "💳", connected: false },
    { id: "slack", name: "Slack", icon: "💬", connected: false },
    { id: "zapier", name: "Zapier", icon: "⚡", connected: false },
] as const

// ============================================
// EMPTY STATES
// ============================================

export const EMPTY_STATES = {
    agents: {
        title: "No agents yet",
        description: "Create your first AI agent to get started",
        action: "Create Agent",
    },
    transactions: {
        title: "No transactions",
        description: "Transactions will appear here once your agents start spending",
        action: null,
    },
    invoices: {
        title: "No invoices",
        description: "Generate your first invoice to start billing clients",
        action: "Create Invoice",
    },
    clients: {
        title: "No clients",
        description: "Add your first client to manage their AI agents",
        action: "Add Client",
    },
    alerts: {
        title: "All clear!",
        description: "No alerts at this time",
        action: null,
    },
} as const
