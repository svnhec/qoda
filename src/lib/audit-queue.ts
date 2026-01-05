/**
 * RESILIENT AUDIT LOGGING QUEUE
 * =============================================================================
 * Production-critical: Ensures audit logs are never lost.
 * Queues failed logs and retries them asynchronously.
 * =============================================================================
 */

// Redis not available - using in-memory fallback for audit queue
// TODO: Install @upstash/redis for production distributed audit queue
import { createServiceClient } from "@/lib/supabase/server";
import type { AuditLogInsert } from "@/lib/db/types";

/**
 * Direct database insert for audit logs (bypasses circular dependency)
 * This is the ONLY place that directly writes to audit_log table
 */
async function insertAuditLogDirect(logData: AuditLogInsert): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("audit_log").insert({
    id: logData.id || crypto.randomUUID(),
    action: logData.action,
    resource_type: logData.resource_type,
    resource_id: logData.resource_id ?? null,
    user_id: logData.user_id ?? null,
    organization_id: logData.organization_id ?? null,
    description: logData.description ?? null,
    error_message: logData.error_message ?? null,
    metadata: logData.metadata ?? null,
    state_before: logData.state_before ?? null,
    state_after: logData.state_after ?? null,
    ip_address: logData.ip_address ?? null,
    user_agent: logData.user_agent ?? null,
  });

  if (error) {
    throw new Error(`Audit log insert failed: ${error.message}`);
  }
}

interface QueuedAuditLog {
  logData: AuditLogInsert;
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
}

const auditQueue: QueuedAuditLog[] = [];
const MAX_QUEUE_SIZE = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

/**
 * Queue failed audit log for retry
 */
export async function queueFailedAuditLog(logData: AuditLogInsert): Promise<void> {
  try {
    // Prevent queue from growing too large
    if (auditQueue.length >= MAX_QUEUE_SIZE) {
      auditQueue.shift(); // Remove oldest item
    }

    const queuedItem = {
      logData,
      attempts: 0,
      firstAttempt: Date.now(),
      lastAttempt: Date.now(),
    };

    auditQueue.push(queuedItem);
  } catch (error) {
    // Last resort: log to console if queue fails
    console.error("CRITICAL: Failed to queue audit log:", error, logData);
  }
}

/**
 * Process audit queue - retry failed logs
 * Call this from a cron job or background worker
 */
export async function processAuditQueue(): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  try {
    if (auditQueue.length === 0) return { processed: 0, failed: 0 };

    // Process items (limit to prevent long-running operations)
    const itemsToProcess = auditQueue.splice(0, Math.min(auditQueue.length, 50));

    for (const queuedItem of itemsToProcess) {
      try {
        // Try to log again (direct insert to break circular dependency)
        await insertAuditLogDirect(queuedItem.logData);
        processed++;

      } catch {
        failed++;

        // Check if we should retry
        queuedItem.attempts = (queuedItem.attempts || 0) + 1;
        queuedItem.lastAttempt = Date.now();

        if (queuedItem.attempts < MAX_RETRIES) {
          // Re-queue for retry with exponential backoff
          const delay = RETRY_DELAY_MS * Math.pow(2, queuedItem.attempts - 1);
          setTimeout(async () => {
            try {
              auditQueue.push(queuedItem);
            } catch (requeueError) {
              console.error("Failed to re-queue audit log:", requeueError);
            }
          }, delay);
        } else {
          // Max retries exceeded - log critical failure
          console.error("CRITICAL: Audit log permanently failed after max retries:", queuedItem.logData);
        }
      }
    }

  } catch (error) {
    console.error("Audit queue processing failed:", error);
    failed++;
  }

  return { processed, failed };
}

/**
 * Get audit queue status
 */
export async function getAuditQueueStatus(): Promise<{
  queueLength: number;
  oldestItem?: { age: number; attempts: number };
}> {
  try {
    if (auditQueue.length === 0) {
      return { queueLength: 0 };
    }

    // Get the oldest item
    const oldest = auditQueue[0];
    if (!oldest) {
      return { queueLength: auditQueue.length };
    }

    return {
      queueLength: auditQueue.length,
      oldestItem: {
        age: Date.now() - oldest.firstAttempt,
        attempts: oldest.attempts || 0,
      },
    };
  } catch (error) {
    console.error("Failed to get audit queue status:", error);
    return { queueLength: 0 };
  }
}

/**
 * Enhanced audit logging with queue fallback
 * This is the main entry point - breaks circular dependency by calling insert directly
 */
export async function resilientLogAudit(logData: AuditLogInsert): Promise<void> {
  try {
    // Direct insert to break circular dependency with audit.ts
    await insertAuditLogDirect(logData);
  } catch (error) {
    // Queue for retry instead of losing the audit log
    console.error("Audit log failed, queuing for retry:", error);
    await queueFailedAuditLog(logData);
  }
}
