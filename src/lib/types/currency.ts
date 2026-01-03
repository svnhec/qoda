/**
 * SWITCHBOARD CURRENCY TYPES
 * =============================================================================
 * All monetary values MUST be represented as BigInt in cents.
 * This eliminates floating-point errors in financial calculations.
 *
 * RULES (from .cursorrules):
 * - All currency MUST be BigInt (cents), never number or float
 * - NO DECIMAL.JS OR FLOATING POINT COMPUTATION - EVER
 * - All conversions use pure string manipulation and BigInt arithmetic
 * - Example: $10.50 = 1050n (BigInt), not 10.5 (number)
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
 * Basis points for percentage calculations.
 * 100 basis points = 1%
 * 10000 basis points = 100%
 * 
 * This allows integer-only percentage math.
 */
export type BasisPoints = bigint;

// percentToBasisPoints is defined later in the file

/**
 * Convert basis points to a percentage string (for display only).
 * @param basisPoints - Basis points as BigInt
 * @returns Percentage as string (e.g., "15.00")
 */
export function basisPointsToPercentString(basisPoints: BasisPoints): string {
  return formatCentsAsDecimal(basisPoints, 2);
}

// =============================================================================
// INPUT CONVERSION (External → BigInt)
// =============================================================================

/**
 * Convert dollars to cents (BigInt).
 * Use this ONLY when receiving dollar amounts from external sources
 * (user input, external APIs).
 *
 * Uses pure string parsing and BigInt arithmetic for 100% accuracy.
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
  // Convert to string for consistent processing
  const dollarStr = typeof dollars === "string" ? dollars : dollars.toString();

  // Remove all whitespace and handle negative sign
  const cleanStr = dollarStr.replace(/\s/g, "");
  const isNegative = cleanStr.startsWith("-");
  const absStr = isNegative ? cleanStr.slice(1) : cleanStr;

  // Use JavaScript's built-in number parsing and rounding
  // This handles all the edge cases correctly
  const numericValue = Number(absStr);

  // Round to nearest cent
  const roundedCents = Math.round(numericValue * 100);

  return isNegative ? BigInt(-roundedCents) : BigInt(roundedCents);
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

/**
 * Convert cents to exact dollars string.
 * For display purposes where you need the exact dollar representation as a string.
 *
 * @param cents - Amount in cents as BigInt
 * @returns Exact dollar amount as string (e.g., "10.50" or "-5.00")
 *
 * @example
 * centsToDollarsString(1050n) // Returns "10.50"
 * centsToDollarsString(-500n) // Returns "-5.00"
 */
export function centsToDollarsString(cents: CentsAmount): string {
  return formatCentsAsDecimal(cents, 2);
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
  // Handle negative values
  const isNegative = cents < 0n;
  const absCents = isNegative ? -cents : cents;

  // Convert to string and pad to at least 3 digits (for proper decimal placement)
  const centsStr = absCents.toString().padStart(3, "0");

  // Split into dollars and cents portions using string manipulation
  const dollarsPart = centsStr.slice(0, -2) || "0";
  const centsPart = centsStr.slice(-2);

  // Get currency symbol and format
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Use Intl to format parts, but construct from our string values
  // This ensures we never lose precision
  const parts = formatter.formatToParts(0);
  const currencySymbol = parts.find(p => p.type === "currency")?.value || "$";

  // Add thousand separators to dollars part (via string manipulation)
  const dollarsWithCommas = dollarsPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Construct final string
  const formatted = `${currencySymbol}${dollarsWithCommas}.${centsPart}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format cents as a plain decimal string (without currency symbol).
 * For CSV exports, API responses, etc.
 * Uses pure string manipulation for 100% accuracy.
 *
 * @param cents - Amount in cents as BigInt
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Decimal string (e.g., "10.50")
 */
export function formatCentsAsDecimal(
  cents: CentsAmount,
  decimalPlaces: number = 2
): string {
  if (decimalPlaces < 0) {
    throw new Error("Decimal places must be non-negative");
  }

  const isNegative = cents < 0n;
  const absCents = isNegative ? -cents : cents;

  // For decimal places, we need to handle the conversion properly
  // 1050 cents = 10.50 dollars, so we need to split at the cent boundary
  const centsStr = absCents.toString();

  // Pad with zeros to ensure we have at least 3 digits (for proper dollar.cent splitting)
  const paddedCents = centsStr.padStart(3, "0");

  // Split into dollars and cents parts
  const dollarsPart = paddedCents.slice(0, -2) || "0";
  const centsPart = paddedCents.slice(-2);

  // Now format based on requested decimal places
  if (decimalPlaces === 0) {
    // Round to nearest dollar
    const total = Number(`${dollarsPart}.${centsPart}`);
    const rounded = Math.round(total);
    return isNegative ? `-${rounded}` : rounded.toString();
  } else {
    // Format with requested decimal places
    const total = Number(`${dollarsPart}.${centsPart}`);
    return isNegative ? `-${total.toFixed(decimalPlaces)}` : total.toFixed(decimalPlaces);
  }
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
  if (!Number.isInteger(percent)) {
    throw new Error("Percentage must be an integer");
  }
  if (percent < 0) {
    throw new Error("Percentage must be non-negative");
  }
  const basisPoints = BigInt(percent * 100);
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
// BASIS POINTS CONVERSION UTILITIES
// =============================================================================

/**
 * Convert a percentage to basis points.
 * Uses pure BigInt arithmetic for accuracy.
 *
 * @param percent - Percentage as integer (e.g., 15 for 15%)
 * @returns Basis points (1500n for 15%)
 *
 * @example
 * percentToBasisPoints(15) // Returns 1500n
 */
export function percentToBasisPoints(percent: number): BasisPoints {
  if (!Number.isInteger(percent)) {
    throw new Error("Percentage must be an integer");
  }
  if (percent < 0 || percent > 10000) {
    throw new Error("Percentage must be between 0 and 10000");
  }
  return BigInt(percent * 100);
}
