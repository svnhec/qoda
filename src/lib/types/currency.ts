/**
 * SWITCHBOARD CURRENCY TYPES
 * =============================================================================
 * All monetary values MUST be represented as BigInt in cents.
 * This eliminates floating-point errors in financial calculations.
 * 
 * RULES (from .cursorrules):
 * - All currency MUST be BigInt (cents), never number or float
 * - Use decimal.js ONLY for display formatting, never for storage or computation
 * - Example: $10.50 = 1050n (BigInt), not 10.5 (number)
 * =============================================================================
 */

import Decimal from "decimal.js";

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
 * Basis points for percentage calculations.
 * 100 basis points = 1%
 * 10000 basis points = 100%
 * 
 * This allows integer-only percentage math.
 */
export type BasisPoints = bigint;

/**
 * Convert a percentage to basis points.
 * @param percent - Percentage as integer (e.g., 15 for 15%)
 * @returns Basis points (1500n for 15%)
 * 
 * @example
 * percentToBasisPoints(15) // Returns 1500n
 */
export function percentToBasisPoints(percent: number): BasisPoints {
  // Validate input is a reasonable percentage
  if (!Number.isFinite(percent)) {
    throw new Error("Percentage must be a finite number");
  }
  // Convert to basis points (multiply by 100)
  // Handle decimal percentages like 15.5% = 1550 basis points
  return BigInt(Math.round(percent * 100));
}

/**
 * Convert basis points to a percentage number (for display only).
 * @param basisPoints - Basis points as BigInt
 * @returns Percentage as number (for display only)
 */
export function basisPointsToPercent(basisPoints: BasisPoints): number {
  return Number(basisPoints) / 100;
}

// =============================================================================
// INPUT CONVERSION (External → BigInt)
// =============================================================================

/**
 * Convert dollars to cents (BigInt).
 * Use this ONLY when receiving dollar amounts from external sources
 * (user input, external APIs).
 * 
 * @param dollars - Dollar amount as string or number
 * @returns CentsAmount as BigInt
 * 
 * @example
 * dollarsToCents("10.50") // Returns 1050n
 * dollarsToCents(10.50)   // Returns 1050n
 * dollarsToCents("10.999") // Returns 1100n (rounds to nearest cent)
 */
export function dollarsToCents(dollars: string | number): CentsAmount {
  // Use Decimal for accurate conversion from external input
  const decimal = new Decimal(dollars);
  // Multiply by 100 and round to nearest integer (cent)
  const cents = decimal.times(100).round();
  return BigInt(cents.toString());
}

/**
 * Parse a string amount in cents to BigInt.
 * Use for database values that come as strings.
 * 
 * @param centsString - Cents amount as string
 * @returns CentsAmount as BigInt
 */
export function parseCents(centsString: string): CentsAmount {
  return BigInt(centsString);
}

// =============================================================================
// DISPLAY FORMATTING (BigInt → String)
// Uses decimal.js for formatting only - NEVER for calculations
// =============================================================================

/**
 * Format cents as a currency string for display.
 * Uses decimal.js for accurate formatting.
 * 
 * @param cents - Amount in cents as BigInt
 * @param currency - Currency code (default: USD)
 * @param locale - Locale for formatting (default: en-US)
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1050n) // Returns "$10.50"
 * formatCurrency(-500n) // Returns "-$5.00"
 * formatCurrency(100000000n) // Returns "$1,000,000.00"
 */
export function formatCurrency(
  cents: CentsAmount,
  currency: CurrencyCode = "USD",
  locale: string = "en-US"
): string {
  // Use Decimal for accurate formatting
  const decimal = new Decimal(cents.toString()).dividedBy(100);
  
  // Get currency symbol and format based on locale
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  // Format the decimal value
  return formatter.format(decimal.toNumber());
}

/**
 * Format cents as a plain decimal string (without currency symbol).
 * For CSV exports, API responses, etc.
 * 
 * @param cents - Amount in cents as BigInt
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Decimal string (e.g., "10.50")
 */
export function formatCentsAsDecimal(
  cents: CentsAmount,
  decimalPlaces: number = 2
): string {
  const decimal = new Decimal(cents.toString()).dividedBy(100);
  return decimal.toFixed(decimalPlaces);
}

// =============================================================================
// PURE BIGINT ARITHMETIC
// All computation uses BigInt only - no floating point
// =============================================================================

/**
 * Add two CentsAmounts.
 */
export function addCents(a: CentsAmount, b: CentsAmount): CentsAmount {
  return a + b;
}

/**
 * Subtract CentsAmounts.
 */
export function subtractCents(a: CentsAmount, b: CentsAmount): CentsAmount {
  return a - b;
}

/**
 * Multiply a CentsAmount by an integer factor.
 * For percentage operations, use applyBasisPoints instead.
 * 
 * @param amount - Base amount in cents
 * @param factor - Integer multiplier
 * @returns Result as CentsAmount
 */
export function multiplyCentsInt(amount: CentsAmount, factor: bigint): CentsAmount {
  return amount * factor;
}

/**
 * Divide a CentsAmount by an integer divisor.
 * Uses integer division (rounds toward zero).
 * 
 * @param amount - Amount in cents
 * @param divisor - Integer divisor
 * @returns Result as CentsAmount (integer division)
 */
export function divideCentsInt(amount: CentsAmount, divisor: bigint): CentsAmount {
  if (divisor === 0n) {
    throw new Error("Division by zero");
  }
  return amount / divisor;
}

/**
 * Apply basis points to an amount (for percentage calculations).
 * Uses pure BigInt arithmetic with rounding.
 * 
 * Formula: (amount * basisPoints + 5000) / 10000
 * The +5000 provides rounding to nearest cent.
 * 
 * @param amount - Base amount in cents
 * @param basisPoints - Basis points (100 = 1%, 10000 = 100%)
 * @returns Result rounded to nearest cent
 * 
 * @example
 * // Calculate 15% of $100.00
 * applyBasisPoints(10000n, 1500n) // Returns 1500n ($15.00)
 * 
 * // Calculate 15.5% of $100.00
 * applyBasisPoints(10000n, 1550n) // Returns 1550n ($15.50)
 */
export function applyBasisPoints(
  amount: CentsAmount,
  basisPoints: BasisPoints
): CentsAmount {
  // Multiply first, then divide with rounding
  // Adding 5000n before dividing by 10000n rounds to nearest cent
  const numerator = amount * basisPoints + 5000n;
  return numerator / 10000n;
}

/**
 * Calculate percentage of a CentsAmount using basis points.
 * 
 * @param amount - Base amount in cents
 * @param percent - Percentage as integer (e.g., 15 for 15%)
 * @returns Percentage amount rounded to nearest cent
 * 
 * @example
 * percentageOfCents(10000n, 15) // Returns 1500n (15% of $100.00)
 */
export function percentageOfCents(
  amount: CentsAmount,
  percent: number
): CentsAmount {
  const basisPoints = percentToBasisPoints(percent);
  return applyBasisPoints(amount, basisPoints);
}

/**
 * Apply a markup percentage to an amount.
 * Returns the total (original + markup).
 * 
 * @param amount - Base amount in cents
 * @param markupPercent - Markup as integer percentage (e.g., 15 for 15%)
 * @returns Total amount with markup applied
 * 
 * @example
 * applyMarkup(10000n, 15) // Returns 11500n ($100.00 + 15% = $115.00)
 */
export function applyMarkup(
  amount: CentsAmount,
  markupPercent: number
): CentsAmount {
  const markup = percentageOfCents(amount, markupPercent);
  return addCents(amount, markup);
}

/**
 * Apply a markup using basis points (for stored decimal percentages).
 * 
 * @param amount - Base amount in cents
 * @param markupBasisPoints - Markup in basis points (1500n = 15%)
 * @returns Total amount with markup applied
 */
export function applyMarkupBasisPoints(
  amount: CentsAmount,
  markupBasisPoints: BasisPoints
): CentsAmount {
  const markup = applyBasisPoints(amount, markupBasisPoints);
  return addCents(amount, markup);
}

/**
 * Split an amount evenly with remainder handling.
 * Distributes cents fairly (first portions get extra cent if needed).
 * 
 * @param amount - Total amount to split
 * @param parts - Number of parts
 * @returns Array of CentsAmounts that sum to original
 * 
 * @example
 * splitCents(1000n, 3n) // Returns [334n, 333n, 333n]
 */
export function splitCents(amount: CentsAmount, parts: bigint): CentsAmount[] {
  if (parts <= 0n) {
    throw new Error("Parts must be positive");
  }
  
  const base = amount / parts;
  const remainder = amount % parts;
  
  const result: CentsAmount[] = [];
  for (let i = 0n; i < parts; i++) {
    // First 'remainder' parts get an extra cent
    result.push(i < remainder ? base + 1n : base);
  }
  
  return result;
}

// =============================================================================
// COMPARISON & VALIDATION
// =============================================================================

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
 * Check if a CentsAmount is positive.
 */
export function isPositive(amount: CentsAmount): boolean {
  return amount > 0n;
}

/**
 * Get the absolute value of a CentsAmount.
 */
export function absCents(amount: CentsAmount): CentsAmount {
  return amount < 0n ? -amount : amount;
}

/**
 * Get the minimum of two CentsAmounts.
 */
export function minCents(a: CentsAmount, b: CentsAmount): CentsAmount {
  return a < b ? a : b;
}

/**
 * Get the maximum of two CentsAmounts.
 */
export function maxCents(a: CentsAmount, b: CentsAmount): CentsAmount {
  return a > b ? a : b;
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

/**
 * Sum an array of CentsAmounts.
 */
export function sumCents(amounts: CentsAmount[]): CentsAmount {
  return amounts.reduce((sum, amount) => sum + amount, 0n);
}

// =============================================================================
// DEPRECATED FUNCTIONS (for backward compatibility during migration)
// These use floating point - remove after all code is migrated
// =============================================================================

/**
 * @deprecated Use applyBasisPoints or percentageOfCents instead.
 * This function uses floating point and will be removed.
 */
export function multiplyCents(amount: CentsAmount, factor: number): CentsAmount {
  console.warn(
    "multiplyCents is deprecated - uses floating point. " +
    "Use applyBasisPoints for percentages or multiplyCentsInt for integer multiplication."
  );
  // Use Decimal for the conversion to minimize floating point errors
  const result = new Decimal(amount.toString()).times(factor).round();
  return BigInt(result.toString());
}

/**
 * @deprecated Provided for backward compatibility with tests.
 * Converts number dollars to cents using Decimal for accuracy.
 */
export function centsToDollars(cents: CentsAmount): number {
  // Only for display - marked as returning number intentionally
  return new Decimal(cents.toString()).dividedBy(100).toNumber();
}
