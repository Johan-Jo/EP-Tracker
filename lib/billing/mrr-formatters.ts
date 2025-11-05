/**
 * MRR Formatters
 * 
 * Pure formatting functions that can be used in both server and client components.
 * These functions have no dependencies on server-only code.
 */

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'SEK'): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

