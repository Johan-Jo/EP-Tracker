import { createClient } from '@/lib/supabase/server';
import type { Subscription, SubscriptionStatus } from '@/lib/schemas/billing';

/**
 * Subscription Helpers
 * 
 * Functions for managing organization subscriptions.
 */

/**
 * Get all subscriptions with related data
 */
export async function getAllSubscriptions() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      organization:organizations(id, name),
      plan:pricing_plans(id, name, price_sek, billing_cycle)
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }
  
  return data;
}

/**
 * Get subscription by organization ID
 */
export async function getSubscriptionByOrg(orgId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      organization:organizations(id, name),
      plan:pricing_plans(id, name, price_sek, billing_cycle, max_users, max_storage_gb)
    `)
    .eq('organization_id', orgId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
  
  return data;
}

/**
 * Get subscription by ID
 */
export async function getSubscriptionById(subscriptionId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      organization:organizations(id, name),
      plan:pricing_plans(id, name, price_sek, billing_cycle)
    `)
    .eq('id', subscriptionId)
    .single();
  
  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
  
  return data;
}

/**
 * Check if subscription is in trial
 */
export function isInTrial(subscription: Subscription): boolean {
  if (subscription.status !== 'trial') return false;
  if (!subscription.trial_ends_at) return false;
  
  const trialEnd = new Date(subscription.trial_ends_at);
  return trialEnd > new Date();
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(subscription: Subscription): number {
  if (!subscription.trial_ends_at) return 0;
  
  const trialEnd = new Date(subscription.trial_ends_at);
  const now = new Date();
  const diff = trialEnd.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  return Math.max(0, days);
}

/**
 * Check if subscription is overdue
 */
export function isOverdue(subscription: Subscription): boolean {
  if (subscription.status !== 'past_due') return false;
  
  const periodEnd = new Date(subscription.current_period_end);
  const now = new Date();
  
  // Consider overdue if more than 7 days past period end
  const daysPastDue = Math.floor((now.getTime() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));
  return daysPastDue > 7;
}

/**
 * Get days until next billing
 */
export function getDaysUntilNextBilling(subscription: Subscription): number {
  const periodEnd = new Date(subscription.current_period_end);
  const now = new Date();
  const diff = periodEnd.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  return Math.max(0, days);
}

/**
 * Calculate trial end date
 */
export function calculateTrialEndDate(trialDays: number = 14): string {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  return trialEnd.toISOString();
}

/**
 * Calculate next billing period
 */
export function calculateNextPeriod(billingCycle: 'monthly' | 'annual', startDate?: Date): {
  period_start: string;
  period_end: string;
} {
  const start = startDate || new Date();
  const end = new Date(start);
  
  if (billingCycle === 'annual') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  
  return {
    period_start: start.toISOString(),
    period_end: end.toISOString(),
  };
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  const statusMap: Record<SubscriptionStatus, string> = {
    trial: 'Trial',
    active: 'Active',
    past_due: 'Past Due',
    canceled: 'Canceled',
    suspended: 'Suspended',
  };
  
  return statusMap[status] || status;
}

/**
 * Get subscription status color
 */
export function getSubscriptionStatusColor(status: SubscriptionStatus): string {
  const colorMap: Record<SubscriptionStatus, string> = {
    trial: 'blue',
    active: 'green',
    past_due: 'orange',
    canceled: 'gray',
    suspended: 'red',
  };
  
  return colorMap[status] || 'gray';
}

/**
 * Get subscription health score (0-100)
 */
export function getSubscriptionHealth(subscription: Subscription): number {
  let score = 100;
  
  if (subscription.status === 'past_due') score -= 40;
  if (subscription.status === 'canceled') score = 0;
  if (subscription.status === 'suspended') score = 0;
  
  if (subscription.cancel_at_period_end) score -= 20;
  
  // Reduce score if trial is ending soon
  if (subscription.status === 'trial') {
    const daysRemaining = getTrialDaysRemaining(subscription);
    if (daysRemaining <= 3) score -= 30;
    else if (daysRemaining <= 7) score -= 15;
  }
  
  return Math.max(0, score);
}

/**
 * Check if organization can upgrade storage
 */
export function canUpgradeStorage(currentStorageGB: number, maxStorageGB: number): boolean {
  const usagePercentage = (currentStorageGB / maxStorageGB) * 100;
  return usagePercentage > 80; // Suggest upgrade at 80% usage
}

/**
 * Check if organization can upgrade users
 */
export function canUpgradeUsers(currentUsers: number, maxUsers: number): boolean {
  const usagePercentage = (currentUsers / maxUsers) * 100;
  return usagePercentage > 80; // Suggest upgrade at 80% usage
}

