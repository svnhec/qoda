/**
 * Webhook Trigger Service
 * =============================================================================
 * Triggers user-defined webhooks when events occur.
 * =============================================================================
 */

import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

export type WebhookEventType =
    | "transaction.created"
    | "transaction.settled"
    | "agent.status_changed"
    | "agent.budget_exceeded"
    | "card.issued"
    | "card.declined";

interface WebhookPayload {
    event: WebhookEventType;
    timestamp: string;
    data: Record<string, unknown>;
}

/**
 * Trigger all matching user webhooks for an organization.
 * This is fire-and-forget - errors are logged but don't throw.
 */
export async function triggerUserWebhooks(
    organizationId: string,
    event: WebhookEventType,
    data: Record<string, unknown>
): Promise<void> {
    try {
        const supabase = createServiceClient();

        // Get all active webhooks for this org that listen to this event
        const { data: webhooks, error } = await supabase
            .from("user_webhooks")
            .select("id, url, secret, events")
            .eq("organization_id", organizationId)
            .eq("is_active", true);

        if (error || !webhooks || webhooks.length === 0) {
            return;
        }

        // Filter to webhooks that listen to this event
        const matchingWebhooks = webhooks.filter(w =>
            w.events && w.events.includes(event)
        );

        if (matchingWebhooks.length === 0) {
            return;
        }

        const payload: WebhookPayload = {
            event,
            timestamp: new Date().toISOString(),
            data,
        };

        // Send to all matching webhooks in parallel
        const results = await Promise.allSettled(
            matchingWebhooks.map(webhook => sendWebhook(webhook, payload, supabase))
        );

        // Log any failures
        results.forEach((result, index) => {
            if (result.status === "rejected") {
                const webhook = matchingWebhooks[index];
                if (webhook) {
                    console.error(
                        `Webhook ${webhook.id} failed:`,
                        result.reason
                    );
                }
            }
        });
    } catch (err) {
        console.error("Failed to trigger user webhooks:", err);
        // Never throw - this is fire-and-forget
    }
}

/**
 * Send a single webhook with signature.
 */
async function sendWebhook(
    webhook: { id: string; url: string; secret: string },
    payload: WebhookPayload,
    supabase: ReturnType<typeof createServiceClient>
): Promise<void> {
    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Create signature: HMAC-SHA256 of "timestamp.body"
    const signaturePayload = `${timestamp}.${body}`;
    const signature = crypto
        .createHmac("sha256", webhook.secret)
        .update(signaturePayload)
        .digest("hex");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Webhook-Signature": `t=${timestamp},v1=${signature}`,
                "X-Webhook-Event": payload.event,
            },
            body,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Update webhook stats
        const updateData: Record<string, unknown> = {
            last_triggered_at: new Date().toISOString(),
            last_status_code: response.status,
        };

        if (!response.ok) {
            // Increment failure count
            await supabase.rpc("increment_webhook_failures", { webhook_id: webhook.id });
        } else {
            // Reset failure count on success
            updateData.failure_count = 0;
        }

        await supabase
            .from("user_webhooks")
            .update(updateData)
            .eq("id", webhook.id);
    } catch (err) {
        clearTimeout(timeoutId);

        // Log failure
        await supabase
            .from("user_webhooks")
            .update({
                last_triggered_at: new Date().toISOString(),
                last_status_code: 0, // 0 indicates connection failure
            })
            .eq("id", webhook.id);

        // Increment failure count (ignore errors)
        try {
            await supabase.rpc("increment_webhook_failures", { webhook_id: webhook.id });
        } catch { /* ignore */ }

        throw err;
    }
}

/**
 * Convenience functions for common events.
 */
export async function triggerTransactionCreated(
    organizationId: string,
    transaction: Record<string, unknown>
): Promise<void> {
    await triggerUserWebhooks(organizationId, "transaction.created", {
        transaction,
    });
}

export async function triggerAgentStatusChanged(
    organizationId: string,
    agent: { id: string; name: string; status: string; previous_status?: string }
): Promise<void> {
    await triggerUserWebhooks(organizationId, "agent.status_changed", {
        agent,
    });
}

export async function triggerBudgetExceeded(
    organizationId: string,
    agent: { id: string; name: string; budget_cents: string; spend_cents: string }
): Promise<void> {
    await triggerUserWebhooks(organizationId, "agent.budget_exceeded", {
        agent,
    });
}

export async function triggerCardIssued(
    organizationId: string,
    card: { id: string; last4: string; agent_id: string; agent_name: string }
): Promise<void> {
    await triggerUserWebhooks(organizationId, "card.issued", {
        card,
    });
}

export async function triggerCardDeclined(
    organizationId: string,
    authorization: { id: string; amount_cents: string; merchant_name: string; decline_code: string; agent_id: string }
): Promise<void> {
    await triggerUserWebhooks(organizationId, "card.declined", {
        authorization,
    });
}
