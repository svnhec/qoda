/**
 * SWITCHBOARD AUDIT LOG UTILITIES
 * =============================================================================
 * Required by .cursorrules: All errors must log to audit_log table.
 * 
 * These functions provide a consistent interface for audit logging
 * throughout the application.
 * =============================================================================
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { AuditLogInsert } from "./types";

/**
 * Log an audit event.
 * This function never throws - it logs to console if database insert fails.
 * 
 * @param log - Audit log entry to insert
 */
export async function logAudit(log: AuditLogInsert): Promise<void> {
  try {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from("audit_log")
      .insert(log);
    
    if (error) {
      // Log to console as fallback - never throw from audit logging
      console.error("Failed to write audit log:", error.message, log);
    }
  } catch (err) {
    // Never throw from audit logging
    console.error("Audit log exception:", err, log);
  }
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

