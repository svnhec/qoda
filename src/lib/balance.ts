/**
 * ATOMIC BALANCE OPERATIONS
 * =============================================================================
 * Critical: Prevents race conditions in balance updates.
 * All balance operations must use these functions instead of direct updates.
 * =============================================================================
 */

import { createServiceClient } from "@/lib/supabase/server";

/**
 * Result of a balance operation.
 */
export type BalanceOperationResult =
  | { success: true; newBalance: bigint }
  | { success: false; error: string };

/**
 * Add funds to organization balance atomically.
 * Prevents race conditions by using database-level atomic operations.
 *
 * @param organizationId - Organization UUID
 * @param amountCents - Amount to add in cents (BigInt)
 * @returns Success with new balance or error
 */
export async function addOrganizationFunds(
  organizationId: string,
  amountCents: bigint
): Promise<BalanceOperationResult> {
  if (amountCents <= 0n) {
    return { success: false, error: "Amount must be positive" };
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("add_organization_funds", {
      p_organization_id: organizationId,
      p_amount_cents: amountCents.toString(),
    });

    if (error) {
      console.error("Failed to add organization funds:", error);
      return { success: false, error: error.message };
    }

    // Parse the result
    const results = data as Array<{
      success: boolean;
      new_balance: string | null;
      error_message: string | null;
    }>;

    if (!results || results.length === 0) {
      return { success: false, error: "No result returned from database" };
    }

    const result = results[0];

    if (!result) {
      return { success: false, error: "Invalid database response" };
    }

    if (!result.success) {
      return { success: false, error: result.error_message || "Unknown error" };
    }

    return {
      success: true,
      newBalance: BigInt(result.new_balance!),
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("addOrganizationFunds exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Deduct funds from organization balance atomically.
 * Prevents race conditions and overdrafts.
 *
 * @param organizationId - Organization UUID
 * @param amountCents - Amount to deduct in cents (BigInt)
 * @returns Success with new balance or error
 */
export async function deductOrganizationFunds(
  organizationId: string,
  amountCents: bigint
): Promise<BalanceOperationResult> {
  if (amountCents <= 0n) {
    return { success: false, error: "Amount must be positive" };
  }

  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("deduct_organization_funds", {
      p_organization_id: organizationId,
      p_amount_cents: amountCents.toString(),
    });

    if (error) {
      console.error("Failed to deduct organization funds:", error);
      return { success: false, error: error.message };
    }

    // Parse the result
    const results = data as Array<{
      success: boolean;
      new_balance: string | null;
      error_message: string | null;
    }>;

    if (!results || results.length === 0) {
      return { success: false, error: "No result returned from database" };
    }

    const result = results[0];

    if (!result) {
      return { success: false, error: "Invalid database response" };
    }

    if (!result.success) {
      return { success: false, error: result.error_message || "Unknown error" };
    }

    return {
      success: true,
      newBalance: BigInt(result.new_balance!),
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("deductOrganizationFunds exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get organization balance atomically.
 *
 * @param organizationId - Organization UUID
 * @returns Success with balance or error
 */
export async function getOrganizationBalance(
  organizationId: string
): Promise<{ success: true; balance: bigint } | { success: false; error: string }> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase.rpc("get_organization_balance", {
      p_organization_id: organizationId,
    });

    if (error) {
      console.error("Failed to get organization balance:", error);
      return { success: false, error: error.message };
    }

    // Parse the result
    const results = data as Array<{
      success: boolean;
      balance: string | null;
      error_message: string | null;
    }>;

    if (!results || results.length === 0) {
      return { success: false, error: "No result returned from database" };
    }

    const result = results[0];

    if (!result) {
      return { success: false, error: "Invalid database response" };
    }

    if (!result.success) {
      return { success: false, error: result.error_message || "Unknown error" };
    }

    return {
      success: true,
      balance: BigInt(result.balance!),
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error");
    console.error("getOrganizationBalance exception:", error);
    return { success: false, error: error.message };
  }
}
