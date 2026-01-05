/**
 * SWITCHBOARD AUDIT LOG UTILITIES
 * =============================================================================
 * Required by .cursorrules: All errors must log to audit_log table.
 * 
 * These functions provide a consistent interface for audit logging
 * throughout the application.
 * =============================================================================
 */

import { resilientLogAudit } from "@/lib/audit-queue";
import type { AuditLogInsert } from "./types";

/**
 * Log an audit event with resilient queue fallback.
 * This function never throws - failed logs are queued for retry.
 *
 * @param log - Audit log entry to insert
 */
export async function logAudit(log: AuditLogInsert): Promise<void> {
  await resilientLogAudit(log);
}

/**
 * Standard audit action types for compliance tracking.
 */
export type AuditAction =
  | "CREATE_CARD"
  | "FREEZE_CARD"
  | "UNFREEZE_CARD"
  | "TOP_UP_WALLET"
  | "CREATE_AGENT"
  | "UPDATE_AGENT"
  | "DELETE_AGENT"
  | "CREATE_CLIENT"
  | "UPDATE_CLIENT"
  | "DELETE_CLIENT"
  | "SETUP_BILLING"
  | "CANCEL_BILLING"
  | "PROCESS_AUTHORIZATION"
  | "PROCESS_SETTLEMENT"
  | "AGGREGATE_SPEND"
  | "EXPORT_DATA"
  | "LOGIN"
  | "LOGOUT"
  | "API_ACCESS"
  | string;

/**
 * Audit event structure for compliance logging.
 */
export interface AuditEvent {
  /** Action being performed */
  action: AuditAction;
  /** Type of resource being affected */
  resource_type: string;
  /** ID of the resource (if applicable) */
  resource_id?: string;
  /** ID of the user performing the action */
  user_id?: string;
  /** ID of the organization context */
  organization_id?: string;
  /** Status of the operation */
  status: "success" | "failure" | "pending";
  /** Error message if status is failure */
  error?: string;
  /** Additional metadata for the event */
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event for compliance tracking.
 * 
 * This is the primary function for compliance-focused audit logging.
 * Use this for all significant user actions and system events.
 * 
 * @param event - Audit event details
 * 
 * @example
 * ```typescript
 * await logAuditEvent({
 *   action: "CREATE_CARD",
 *   resource_type: "virtual_card",
 *   resource_id: cardId,
 *   user_id: currentUser.id,
 *   organization_id: org.id,
 *   status: "success",
 *   metadata: {
 *     agent_id: agentId,
 *     card_last4: "4242",
 *   },
 * });
 * ```
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const {
    action,
    resource_type,
    resource_id,
    user_id,
    organization_id,
    status,
    error,
    metadata = {},
  } = event;

  await logAudit({
    action,
    resource_type,
    resource_id: resource_id ?? null,
    user_id: user_id ?? null,
    organization_id: organization_id ?? null,
    description: `${action} - ${status}`,
    error_message: status === "failure" ? (error ?? null) : null,
    metadata: {
      ...metadata,
      status,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log an error to the audit log.
 * Use this for all error handling as required by .cursorrules.
 * 
 * @param params - Error details
 * 
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   await logAuditError({
 *     action: "process_webhook",
 *     resourceType: "stripe_event",
 *     resourceId: event.id,
 *     error: err,
 *     userId: currentUser?.id,
 *     organizationId: org?.id,
 *   });
 *   throw err; // Re-throw after logging
 * }
 * ```
 */
export async function logAuditError(params: {
  action: string;
  resourceType: string;
  resourceId?: string;
  error: unknown;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const {
    action,
    resourceType,
    resourceId,
    error,
    userId,
    organizationId,
    metadata = {},
  } = params;

  // Extract error message and stack
  let errorMessage: string;
  let errorStack: string | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
    errorStack = process.env.NODE_ENV === "development" ? error.stack : undefined;
  } else if (typeof error === "string") {
    errorMessage = error;
  } else {
    errorMessage = "Unknown error";
  }

  await logAudit({
    action,
    resource_type: resourceType,
    resource_id: resourceId ?? null,
    user_id: userId ?? null,
    organization_id: organizationId ?? null,
    error_message: errorMessage,
    description: `Error during ${action}`,
    metadata: {
      ...metadata,
      error_stack: errorStack,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log a financial operation to the audit log.
 * Use this for all financial writes as required by .cursorrules.
 * 
 * @param params - Financial operation details
 * 
 * @example
 * ```typescript
 * await logFinancialOperation({
 *   action: "create_ledger_entry",
 *   resourceType: "journal_entry",
 *   resourceId: transactionGroupId,
 *   userId: currentUser.id,
 *   organizationId: org.id,
 *   stateBefore: { balance: previousBalance },
 *   stateAfter: { balance: newBalance },
 *   reason: "Agency deposit via Stripe",
 * });
 * ```
 */
export async function logFinancialOperation(params: {
  action: string;
  resourceType: string;
  resourceId: string;
  userId?: string;
  organizationId?: string;
  stateBefore?: Record<string, unknown>;
  stateAfter?: Record<string, unknown>;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const {
    action,
    resourceType,
    resourceId,
    userId,
    organizationId,
    stateBefore,
    stateAfter,
    reason,
    metadata = {},
  } = params;

  await logAudit({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    user_id: userId ?? null,
    organization_id: organizationId ?? null,
    description: reason ?? `Financial operation: ${action}`,
    state_before: stateBefore ?? null,
    state_after: stateAfter ?? null,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log an API request to the audit log.
 * 
 * @param params - Request details
 */
export async function logApiRequest(params: {
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const {
    action,
    resourceType,
    resourceId,
    userId,
    organizationId,
    ipAddress,
    userAgent,
    metadata = {},
  } = params;

  await logAudit({
    action,
    resource_type: resourceType,
    resource_id: resourceId ?? null,
    user_id: userId ?? null,
    organization_id: organizationId ?? null,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
    description: `API: ${action}`,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log a webhook event to the audit log.
 * 
 * @param params - Webhook details
 */
export async function logWebhookEvent(params: {
  provider: "stripe" | "supabase" | string;
  eventType: string;
  eventId: string;
  success: boolean;
  error?: unknown;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { provider, eventType, eventId, success, error, metadata = {} } = params;

  let errorMessage: string | null = null;
  if (!success && error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  await logAudit({
    action: `webhook_${provider}_${eventType}`,
    resource_type: "webhook_event",
    resource_id: eventId,
    description: success
      ? `Processed ${provider} webhook: ${eventType}`
      : `Failed to process ${provider} webhook: ${eventType}`,
    error_message: errorMessage,
    metadata: {
      ...metadata,
      provider,
      event_type: eventType,
      success,
      timestamp: new Date().toISOString(),
    },
  });
}






