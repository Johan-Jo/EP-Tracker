import { createClient } from '@/lib/supabase/server';
import type { PricingPlan } from '@/lib/schemas/billing';

/**
 * Pricing Plan Helpers
 * 
 * Functions for managing pricing plans.
 */

/**
 * Get all pricing plans
 */
export async function getAllPlans(includeInactive: boolean = false) {
  const supabase = await createClient();
  
  let query = supabase
    .from('pricing_plans')
    .select('*')
    .order('price_sek', { ascending: true });
  
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching pricing plans:', error);
    return [];
  }
  
  return data as PricingPlan[];
}

/**
 * Get a single pricing plan by ID
 */
export async function getPlanById(planId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('id', planId)
    .single();
  
  if (error) {
    console.error('Error fetching pricing plan:', error);
    return null;
  }
  
  return data as PricingPlan;
}

/**
 * Get plans grouped by billing cycle
 */
export async function getPlansGroupedByName() {
  const plans = await getAllPlans();
  
  const grouped: Record<string, PricingPlan[]> = {};
  
  for (const plan of plans) {
    if (!grouped[plan.name]) {
      grouped[plan.name] = [];
    }
    grouped[plan.name].push(plan);
  }
  
  return grouped;
}

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
 * Get annual equivalent price for a plan
 */
export function getAnnualEquivalent(plan: PricingPlan): number {
  if (plan.billing_cycle === 'monthly') {
    return plan.price_sek * 12;
  }
  return plan.price_sek;
}

/**
 * Calculate price with VAT
 */
export function getPriceWithVAT(price: number, vatRate: number = 0.25): number {
  return Math.round(price * (1 + vatRate) * 100) / 100;
}

/**
 * Get discount percentage for annual plan
 */
export function getAnnualDiscount(monthlyPrice: number, annualPrice: number): number {
  const monthlyEquivalentOfAnnual = annualPrice / 12;
  const discount = ((monthlyPrice - monthlyEquivalentOfAnnual) / monthlyPrice) * 100;
  return Math.round(discount * 10) / 10;
}

/**
 * Check if a plan has a specific feature
 */
export function planHasFeature(plan: PricingPlan, featureKey: string): boolean {
  if (!plan.features || typeof plan.features !== 'object') {
    return false;
  }
  return plan.features[featureKey] === true;
}

/**
 * Get feature value from plan
 */
export function getPlanFeature(plan: PricingPlan, featureKey: string): any {
  if (!plan.features || typeof plan.features !== 'object') {
    return undefined;
  }
  return plan.features[featureKey];
}

/**
 * Compare two plans and return differences
 */
export function comparePlans(plan1: PricingPlan, plan2: PricingPlan) {
  return {
    price_diff: plan2.price_sek - plan1.price_sek,
    users_diff: plan2.max_users - plan1.max_users,
    storage_diff: plan2.max_storage_gb - plan1.max_storage_gb,
    is_upgrade: plan2.price_sek > plan1.price_sek,
  };
}

/**
 * Get recommended plan for an organization based on usage
 */
export function getRecommendedPlan(
  plans: PricingPlan[],
  currentUsers: number,
  currentStorageGB: number
): PricingPlan | null {
  // Filter to monthly plans for simplicity
  const monthlyPlans = plans
    .filter(p => p.billing_cycle === 'monthly' && p.is_active)
    .sort((a, b) => a.price_sek - b.price_sek);
  
  // Find the cheapest plan that meets requirements
  for (const plan of monthlyPlans) {
    if (plan.max_users >= currentUsers && plan.max_storage_gb >= currentStorageGB) {
      return plan;
    }
  }
  
  // No suitable plan found
  return null;
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

/**
 * Format plan price for display
 */
export function formatPlanPrice(plan: PricingPlan): string {
  const price = plan.price_sek;
  const cycle = plan.billing_cycle === 'annual' ? '/year' : '/month';
  return `${price.toLocaleString('sv-SE')} SEK${cycle}`;
}

/**
 * Get plan badge/label
 */
export function getPlanBadge(plan: PricingPlan): string | null {
  const features = plan.features as Record<string, any> | null;
  
  if (features?.most_popular) {
    return 'Most Popular';
  }
  
  if (features?.custom_pricing) {
    return 'Enterprise';
  }
  
  if (plan.price_sek === 0 && features?.trial_days) {
    return 'Free Trial';
  }
  
  if (plan.billing_cycle === 'annual' && features?.annual_discount_percent) {
    return `Save ${features.annual_discount_percent}%`;
  }
  
  return null;
}

