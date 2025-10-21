/**
 * MRR (Monthly Recurring Revenue) Calculator
 * 
 * Calculates revenue metrics for the billing dashboard.
 * All calculations are in SEK (Swedish Krona).
 */

export interface MRRBreakdown {
  total_mrr: number;
  paying_orgs: number;
  trial_orgs: number;
  canceled_orgs: number;
  avg_revenue_per_org: number;
  annual_run_rate: number;
}

export interface RevenuePoint {
  month: string; // YYYY-MM format
  mrr: number;
  paying_orgs: number;
  new_mrr: number;
  churned_mrr: number;
}

/**
 * Calculate current MRR from active subscriptions
 */
export function calculateMRR(subscriptions: Array<{
  plan: {
    price_sek: number;
    billing_cycle: 'monthly' | 'annual';
  };
  status: string;
}>): MRRBreakdown {
  let total_mrr = 0;
  let paying_orgs = 0;
  let trial_orgs = 0;
  let canceled_orgs = 0;

  for (const sub of subscriptions) {
    if (sub.status === 'trial') {
      trial_orgs++;
      continue;
    }

    if (sub.status === 'canceled' || sub.status === 'suspended') {
      canceled_orgs++;
      continue;
    }

    if (sub.status === 'active' || sub.status === 'past_due') {
      paying_orgs++;
      
      // Convert annual to monthly
      if (sub.plan.billing_cycle === 'annual') {
        total_mrr += sub.plan.price_sek / 12;
      } else {
        total_mrr += sub.plan.price_sek;
      }
    }
  }

  const avg_revenue_per_org = paying_orgs > 0 ? total_mrr / paying_orgs : 0;
  const annual_run_rate = total_mrr * 12;

  return {
    total_mrr: Math.round(total_mrr * 100) / 100,
    paying_orgs,
    trial_orgs,
    canceled_orgs,
    avg_revenue_per_org: Math.round(avg_revenue_per_org * 100) / 100,
    annual_run_rate: Math.round(annual_run_rate * 100) / 100,
  };
}

/**
 * Calculate revenue trend over time
 * Returns monthly MRR for the last N months
 */
export function calculateRevenueTrend(
  payments: Array<{
    created_at: string;
    amount_sek: number;
    status: string;
  }>,
  months: number = 12
): RevenuePoint[] {
  const now = new Date();
  const points: RevenuePoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Calculate revenue for this month
    const monthRevenue = payments
      .filter(p => {
        if (p.status !== 'paid') return false;
        const paymentDate = new Date(p.created_at);
        return (
          paymentDate.getFullYear() === date.getFullYear() &&
          paymentDate.getMonth() === date.getMonth()
        );
      })
      .reduce((sum, p) => sum + p.amount_sek, 0);

    points.push({
      month: monthStr,
      mrr: Math.round(monthRevenue * 100) / 100,
      paying_orgs: 0, // Would need subscription data to calculate
      new_mrr: 0,
      churned_mrr: 0,
    });
  }

  return points;
}

/**
 * Calculate churn rate
 * Percentage of customers who canceled in the last month
 */
export function calculateChurnRate(
  subscriptions: Array<{
    status: string;
    canceled_at: string | null;
  }>
): {
  churn_rate: number;
  churned_count: number;
  total_count: number;
} {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const churned_count = subscriptions.filter(sub => {
    if (!sub.canceled_at) return false;
    const canceledDate = new Date(sub.canceled_at);
    return canceledDate >= lastMonth;
  }).length;

  const total_count = subscriptions.filter(sub =>
    sub.status === 'active' || sub.status === 'canceled'
  ).length;

  const churn_rate = total_count > 0
    ? Math.round((churned_count / total_count) * 100 * 10) / 10
    : 0;

  return {
    churn_rate,
    churned_count,
    total_count,
  };
}

/**
 * Calculate LTV (Lifetime Value)
 * Average revenue per customer over their lifetime
 */
export function calculateLTV(
  avg_mrr: number,
  avg_customer_lifetime_months: number = 24
): number {
  return Math.round(avg_mrr * avg_customer_lifetime_months * 100) / 100;
}

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

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate growth rate between two periods
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

