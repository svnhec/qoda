import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind classes safely (Standard shadcn utility)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as USD currency
 * Example: 1234.5 -> "$1,234.50"
 */
export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

/**
 * Formats a date string or object
 * Example: "2024-01-01" -> "Jan 1, 2024"
 */
export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

/**
 * Artificial delay for simulating network requests (useful for demos)
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
