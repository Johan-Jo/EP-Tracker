/**
 * Pricing Plan Formatters
 * 
 * Pure formatting functions that can be used in both server and client components.
 * These functions have no dependencies on server-only code.
 */

import type { PricingPlan } from '@/lib/schemas/billing';

/**
 * Get monthly equivalent price for a plan
 */
export function getMonthlyEquivalent(plan: PricingPlan): number {
  if (plan.billing_cycle === 'annual') {
    return Math.round((plan.price_sek / 12) * 100) / 100;
  }
  return plan.price_sek;
}

/**
 * Format plan name for display
 */
export function formatPlanName(plan: PricingPlan): string {
  if (plan.billing_cycle === 'annual') {
    return `${plan.name} (Annual)`;
  }
  return plan.name;
}

