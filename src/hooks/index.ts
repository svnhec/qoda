/**
 * Hooks barrel file - re-exports all hooks for convenient imports
 *
 * Usage:
 * import { useClients, useIsMobile, useToast } from "@/hooks"
 */

// API Hooks (SWR-based data fetching)
export {
    useCurrentUser,
    useClients,
    useClient,
    useAgents,
    useAgent,
    useAgentCard,
    useTransactions,
    useTransaction,
    useInvoices,
    useInvoice,
    useFundingBalance,
    useFundingHistory,
    useAlerts,
    useAlertSettings,
    useSettings,
    useStripeStatus,
} from "./use-api"

// Mobile & Responsive Hooks
export {
    useIsMobile,
    useWindowSize,
    useTouchDevice,
    useBreakpoint,
} from "./use-mobile"

// Toast Notifications
export { useToast, toast } from "./use-toast"
export type { Toast, ToastVariant } from "./use-toast"
