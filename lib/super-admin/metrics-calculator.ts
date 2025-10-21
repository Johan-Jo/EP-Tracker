import { createClient } from '@/lib/supabase/server';

/**
 * Metrics Calculator for Super Admin Dashboard
 * 
 * Calculate KPIs, growth metrics, and system health for the platform.
 */

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  paying_customers: number;
  trial_customers: number;
  churn_rate: number;
  average_revenue_per_user: number;
}

export interface GrowthMetrics {
  new_orgs_this_month: number;
  new_orgs_last_month: number;
  growth_rate: number;
  total_users: number;
  active_users_30d: number;
}

export interface UsageMetrics {
  total_time_entries: number;
  total_projects: number;
  total_storage_gb: number;
  time_entries_30d: number;
}

export interface SystemHealthMetrics {
  uptime_percentage: number;
  avg_response_time_ms: number;
  error_rate: number;
  pending_sync_jobs: number;
}

/**
 * Calculate revenue metrics (MRR, ARR, churn)
 */
export async function calculateRevenueMetrics(): Promise<RevenueMetrics> {
  const supabase = await createClient();
  
  // Get all active subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      *,
      organization:organizations!inner(status),
      plan:pricing_plans(price_sek, billing_cycle)
    `)
    .in('status', ['active', 'trial']);
  
  let mrr = 0;
  let payingCustomers = 0;
  let trialCustomers = 0;
  
  (subscriptions || []).forEach((sub) => {
    if (sub.status === 'trial') {
      trialCustomers++;
    } else if (sub.status === 'active' && sub.plan) {
      payingCustomers++;
      
      // Convert to monthly equivalent
      if (sub.plan.billing_cycle === 'monthly') {
        mrr += sub.plan.price_sek;
      } else if (sub.plan.billing_cycle === 'annual') {
        mrr += sub.plan.price_sek / 12;
      }
    }
  });
  
  const arr = mrr * 12;
  const arpu = payingCustomers > 0 ? mrr / payingCustomers : 0;
  
  // Calculate churn rate (organizations that churned in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { count: churnedCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'canceled')
    .gte('updated_at', thirtyDaysAgo.toISOString());
  
  const totalCustomers = payingCustomers + trialCustomers;
  const churnRate = totalCustomers > 0 ? ((churnedCount || 0) / totalCustomers) * 100 : 0;
  
  return {
    mrr: Math.round(mrr),
    arr: Math.round(arr),
    paying_customers: payingCustomers,
    trial_customers: trialCustomers,
    churn_rate: Math.round(churnRate * 10) / 10,
    average_revenue_per_user: Math.round(arpu),
  };
}

/**
 * Calculate growth metrics
 */
export async function calculateGrowthMetrics(): Promise<GrowthMetrics> {
  const supabase = await createClient();
  
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // New orgs this month
  const { count: newOrgsThisMonth } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfThisMonth.toISOString())
    .is('deleted_at', null);
  
  // New orgs last month
  const { count: newOrgsLastMonth } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfLastMonth.toISOString())
    .lt('created_at', startOfThisMonth.toISOString())
    .is('deleted_at', null);
  
  // Growth rate
  const growthRate = newOrgsLastMonth && newOrgsLastMonth > 0
    ? ((newOrgsThisMonth || 0) - newOrgsLastMonth) / newOrgsLastMonth * 100
    : 0;
  
  // Total users
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  
  // Active users (30d)
  const { count: activeUsers } = await supabase
    .from('time_entries')
    .select('user_id', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString());
  
  return {
    new_orgs_this_month: newOrgsThisMonth || 0,
    new_orgs_last_month: newOrgsLastMonth || 0,
    growth_rate: Math.round(growthRate * 10) / 10,
    total_users: totalUsers || 0,
    active_users_30d: activeUsers || 0,
  };
}

/**
 * Calculate usage metrics
 */
export async function calculateUsageMetrics(): Promise<UsageMetrics> {
  const supabase = await createClient();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Total time entries
  const { count: totalTimeEntries } = await supabase
    .from('time_entries')
    .select('*', { count: 'exact', head: true });
  
  // Time entries in last 30 days
  const { count: timeEntries30d } = await supabase
    .from('time_entries')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString());
  
  // Total projects
  const { count: totalProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true });
  
  // Total storage (sum of all org storage)
  const { data: orgs } = await supabase
    .from('organizations')
    .select('storage_used_bytes')
    .is('deleted_at', null);
  
  const totalStorageBytes = (orgs || []).reduce((sum, org) => sum + (org.storage_used_bytes || 0), 0);
  const totalStorageGb = totalStorageBytes / (1024 * 1024 * 1024);
  
  return {
    total_time_entries: totalTimeEntries || 0,
    total_projects: totalProjects || 0,
    total_storage_gb: Math.round(totalStorageGb * 100) / 100,
    time_entries_30d: timeEntries30d || 0,
  };
}

/**
 * Calculate system health metrics
 */
export async function calculateSystemHealthMetrics(): Promise<SystemHealthMetrics> {
  // In production, these would come from monitoring tools
  // For now, return mock data
  return {
    uptime_percentage: 99.9,
    avg_response_time_ms: 145,
    error_rate: 0.02,
    pending_sync_jobs: 0,
  };
}

/**
 * Get MRR trend data for chart (last 12 months)
 */
export async function getMRRTrendData(): Promise<{ month: string; mrr: number }[]> {
  const supabase = await createClient();
  
  const data: { month: string; mrr: number }[] = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    
    // Get subscriptions active during this month
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:pricing_plans(price_sek, billing_cycle)
      `)
      .eq('status', 'active')
      .lte('created_at', monthEnd.toISOString());
    
    let monthMRR = 0;
    (subscriptions || []).forEach((sub) => {
      if (sub.plan) {
        if (sub.plan.billing_cycle === 'monthly') {
          monthMRR += sub.plan.price_sek;
        } else if (sub.plan.billing_cycle === 'annual') {
          monthMRR += sub.plan.price_sek / 12;
        }
      }
    });
    
    data.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      mrr: Math.round(monthMRR),
    });
  }
  
  return data;
}

/**
 * Get user growth data for chart (last 12 weeks)
 */
export async function getUserGrowthData(): Promise<{ week: string; new_users: number }[]> {
  const supabase = await createClient();
  
  const data: { week: string; new_users: number }[] = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString());
    
    data.push({
      week: `Week ${12 - i}`,
      new_users: count || 0,
    });
  }
  
  return data;
}

/**
 * Get organizations by plan for pie chart
 */
export async function getOrganizationsByPlan(): Promise<{ plan: string; count: number }[]> {
  const supabase = await createClient();
  
  const { data: orgs } = await supabase
    .from('organizations')
    .select(`
      plan:pricing_plans(name)
    `)
    .is('deleted_at', null);
  
  const planCounts: Record<string, number> = {};
  
  (orgs || []).forEach((org) => {
    const planName = org.plan?.name || 'No Plan';
    planCounts[planName] = (planCounts[planName] || 0) + 1;
  });
  
  return Object.entries(planCounts).map(([plan, count]) => ({
    plan,
    count,
  }));
}

/**
 * Get feature usage statistics
 */
export async function getFeatureUsageStats(): Promise<{ feature: string; usage_count: number }[]> {
  const supabase = await createClient();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Get counts for various features
  const [
    timeEntriesResult,
    materialsResult,
    expensesResult,
    mileageResult,
    atasResult,
    diariesResult,
    checklistsResult,
    approvalsResult,
  ] = await Promise.all([
    supabase.from('time_entries').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('materials').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('expenses').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('mileage_entries').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('ata_requests').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('diary_entries').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('checklists').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('approval_batches').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
  ]);
  
  return [
    { feature: 'Time Tracking', usage_count: timeEntriesResult.count || 0 },
    { feature: 'Materials', usage_count: materialsResult.count || 0 },
    { feature: 'Expenses', usage_count: expensesResult.count || 0 },
    { feature: 'Mileage', usage_count: mileageResult.count || 0 },
    { feature: 'ÄTA Requests', usage_count: atasResult.count || 0 },
    { feature: 'Diary Entries', usage_count: diariesResult.count || 0 },
    { feature: 'Checklists', usage_count: checklistsResult.count || 0 },
    { feature: 'Approvals', usage_count: approvalsResult.count || 0 },
  ].sort((a, b) => b.usage_count - a.usage_count);
}

