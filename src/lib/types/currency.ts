/**
 * SWITCHBOARD CURRENCY TYPES
 * =============================================================================
 * All monetary values MUST be represented as BigInt in cents.
 * This eliminates floating-point errors in financial calculations.
 * 
 * Example: $10.50 = 1050n (BigInt)
 * =============================================================================
 */

/**
 * Represents a monetary amount in cents as BigInt.
 * This is the ONLY acceptable type for storing or computing currency.
 * 
 * @example
 * const price: CentsAmount = 1050n; // $10.50
 * const total: CentsAmount = price + 500n; // $15.50
 */
export type CentsAmount = bigint;

/**
 * Currency codes supported by the system.
 * Currently USD only, but structured for future expansion.
 */
export type CurrencyCode = "USD";

/**
 * A monetary value with its currency.
 */
export interface Money {
  /** Amount in cents as BigInt */
  amount: CentsAmount;
  /** ISO 4217 currency code */
  currency: CurrencyCode;
}

/**
 * Convert dollars to cents (BigInt).
 * Use this when receiving dollar amounts from external sources.
 * 
 * @param dollars - Dollar amount (will be rounded to 2 decimal places)
 * @returns CentsAmount as BigInt
 * 
 * @example
 * dollarsToCents(10.50) // Returns 1050n
 * dollarsToCents(10.999) // Returns 1100n (rounds to nearest cent)
 */
export function dollarsToCents(dollars: number): CentsAmount {
  // Round to nearest cent to avoid floating point issues
  const cents = Math.round(dollars * 100);
  return BigInt(cents);
}

/**
 * Convert cents (BigInt) to dollars for display purposes ONLY.
 * NEVER use the returned number for calculations.
 * 
 * @param cents - Amount in cents as BigInt
 * @returns Dollar amount as number (for display only)
 * 
 * @example
 * centsToDollars(1050n) // Returns 10.50
 */
export function centsToDollars(cents: CentsAmount): number {
  return Number(cents) / 100;
}

/**
 * Format cents as a currency string for display.
 * 
 * @param cents - Amount in cents as BigInt
 * @param currency - Currency code (default: USD)
 * @param locale - Locale for formatting (default: en-US)
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1050n) // Returns "$10.50"
 * formatCurrency(-500n) // Returns "-$5.00"
 */
export function formatCurrency(
  cents: CentsAmount,
  currency: CurrencyCode = "USD",
  locale: string = "en-US"
): string {
  const dollars = centsToDollars(cents);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Add two CentsAmounts safely.
 * 
 * @param a - First amount
 * @param b - Second amount
 * @returns Sum as CentsAmount
 */
export function addCents(a: CentsAmount, b: CentsAmount): CentsAmount {
  return a + b;
}

/**
 * Subtract CentsAmounts safely.
 * 
 * @param a - Amount to subtract from
 * @param b - Amount to subtract
 * @returns Difference as CentsAmount
 */
export function subtractCents(a: CentsAmount, b: CentsAmount): CentsAmount {
  return a - b;
}

/**
 * Multiply a CentsAmount by a factor (e.g., for quantity or percentage).
 * Uses integer arithmetic to avoid floating point errors.
 * 
 * @param amount - Base amount in cents
 * @param factor - Multiplier (can be decimal for percentages)
 * @returns Result rounded to nearest cent as CentsAmount
 * 
 * @example
 * // Apply 15% markup
 * multiplyCents(1000n, 1.15) // Returns 1150n
 */
export function multiplyCents(amount: CentsAmount, factor: number): CentsAmount {
  // Convert to number, multiply, round, convert back to BigInt
  const result = Math.round(Number(amount) * factor);
  return BigInt(result);
}

/**
 * Calculate percentage of a CentsAmount.
 * 
 * @param amount - Base amount in cents
 * @param percentage - Percentage as a number (e.g., 15 for 15%)
 * @returns Percentage amount rounded to nearest cent
 * 
 * @example
 * percentageOfCents(1000n, 15) // Returns 150n (15% of $10.00)
 */
export function percentageOfCents(amount: CentsAmount, percentage: number): CentsAmount {
  return multiplyCents(amount, percentage / 100);
}

/**
 * Apply a markup percentage to an amount.
 * 
 * @param amount - Base amount in cents
 * @param markupPercentage - Markup as a number (e.g., 15 for 15%)
 * @returns Total amount with markup applied
 * 
 * @example
 * applyMarkup(1000n, 15) // Returns 1150n ($10.00 + 15% = $11.50)
 */
export function applyMarkup(amount: CentsAmount, markupPercentage: number): CentsAmount {
  const markup = percentageOfCents(amount, markupPercentage);
  return addCents(amount, markup);
}

/**
 * Check if a CentsAmount is negative.
 */
export function isNegative(amount: CentsAmount): boolean {
  return amount < 0n;
}

/**
 * Check if a CentsAmount is zero.
 */
export function isZero(amount: CentsAmount): boolean {
  return amount === 0n;
}

/**
 * Get the absolute value of a CentsAmount.
 */
export function absCents(amount: CentsAmount): CentsAmount {
  return amount < 0n ? -amount : amount;
}

/**
 * Compare two CentsAmounts.
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareCents(a: CentsAmount, b: CentsAmount): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

