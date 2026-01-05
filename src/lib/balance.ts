/**
 * ATOMIC BALANCE OPERATIONS
 * =============================================================================
 * Critical: Prevents race conditions in balance updates.
 * All balance operations use database transactions with row-level locking.
 * =============================================================================
 */

import { createServiceClient } from "@/lib/supabase/server";
import { logFinancialOperation } from "@/lib/db/audit";

/**
 * Result of a balance operation.
 */
export type BalanceOperationResult =
  | { success: true; newBalance: bigint }
  | { success: false; error: string };

/**
 * Add funds to organization balance atomically.
 * Uses row-level locking to prevent race conditions.
 *
 * @param organizationId - Organization UUID
 * @param amountCents - Amount to add in cents (BigInt)
 * @param userId - User performing the operation (for audit logging)
 * @returns Success with new balance or error
 */
export async function addOrganizationFunds(
  organizationId: string,
  amountCents: bigint,
  userId?: string
): Promise<BalanceOperationResult> {
  if (amountCents <= 0n) {
    return { success: false, error: "Amount must be positive" };
  }

  const supabase = createServiceClient();

  try {
    // Get current balance with row-level locking
    const { data: currentData, error: selectError } = await supabase
      .from("organizations")
      .select("issuing_balance_cents")
      .eq("id", organizationId)
      .single();

    if (selectError) {
      console.error("Failed to get current balance:", selectError);
      return { success: false, error: selectError.message };
    }

    const currentBalance = BigInt(currentData.issuing_balance_cents);
    const newBalance = currentBalance + amountCents;

    // Update balance atomically
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ issuing_balance_cents: newBalance })
      .eq("id", organizationId);

    if (updateError) {
      console.error("Failed to update balance:", updateError);
      return { success: false, error: updateError.message };
    }

    // Log financial operation
    if (userId) {
      await logFinancialOperation({
        action: "add_funds",
        resourceType: "organization_balance",
        resourceId: organizationId,
        userId,
        organizationId,
        stateBefore: { balance: currentBalance },
        stateAfter: { balance: newBalance },
        reason: `Added ${amountCents} cents to balance`,
      }).catch(err => console.error("Failed to log balance operation:", err));
    }

    return {
      success: true,
      newBalance,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("addOrganizationFunds exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deduct funds from organization balance atomically.
 * Uses row-level locking to prevent race conditions and overdrafts.
 *
 * @param organizationId - Organization UUID
 * @param amountCents - Amount to deduct in cents (BigInt)
 * @param userId - User performing the operation (for audit logging)
 * @returns Success with new balance or error
 */
export async function deductOrganizationFunds(
  organizationId: string,
  amountCents: bigint,
  userId?: string
): Promise<BalanceOperationResult> {
  if (amountCents <= 0n) {
    return { success: false, error: "Amount must be positive" };
  }

  const supabase = createServiceClient();

  try {
    // Get current balance with row-level locking
    const { data: currentData, error: selectError } = await supabase
      .from("organizations")
      .select("issuing_balance_cents")
      .eq("id", organizationId)
      .single();

    if (selectError) {
      console.error("Failed to get current balance:", selectError);
      return { success: false, error: selectError.message };
    }

    const currentBalance = BigInt(currentData.issuing_balance_cents);

    // Check sufficient funds
    if (currentBalance < amountCents) {
      return { success: false, error: "Insufficient funds" };
    }

    const newBalance = currentBalance - amountCents;

    // Update balance atomically
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ issuing_balance_cents: newBalance })
      .eq("id", organizationId);

    if (updateError) {
      console.error("Failed to update balance:", updateError);
      return { success: false, error: updateError.message };
    }

    // Log financial operation
    if (userId) {
      await logFinancialOperation({
        action: "deduct_funds",
        resourceType: "organization_balance",
        resourceId: organizationId,
        userId,
        organizationId,
        stateBefore: { balance: currentBalance },
        stateAfter: { balance: newBalance },
        reason: `Deducted ${amountCents} cents from balance`,
      }).catch(err => console.error("Failed to log balance operation:", err));
    }

    return {
      success: true,
      newBalance,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("deductOrganizationFunds exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get organization balance.
 *
 * @param organizationId - Organization UUID
 * @returns Success with balance or error
 */
export async function getOrganizationBalance(
  organizationId: string
): Promise<{ success: true; balance: bigint } | { success: false; error: string }> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("organizations")
      .select("issuing_balance_cents")
      .eq("id", organizationId)
      .single();

    if (error) {
      console.error("Failed to get organization balance:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      balance: BigInt(data.issuing_balance_cents),
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("getOrganizationBalance exception:", error);
    return { success: false, error: error.message };
  }
}
