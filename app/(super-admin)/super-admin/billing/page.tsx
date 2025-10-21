import { createClient } from '@/lib/supabase/server';
import { calculateMRR, calculateChurnRate, formatCurrency, formatPercentage } from '@/lib/billing/mrr-calculator';
import { TrendingUp, TrendingDown, Users, DollarSign, AlertCircle, CreditCard } from 'lucide-react';
import Link from 'next/link';

/**
 * Billing Dashboard
 * 
 * Main billing overview for super admins.
 * Shows MRR, revenue trends, subscriptions, and payments.
 */

export default async function BillingDashboardPage() {
  const supabase = await createClient();

  // Fetch subscriptions with plan details
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:pricing_plans(id, name, price_sek, billing_cycle)
    `);

  // Fetch recent payments
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      organization:organizations(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate metrics
  const mrrData = calculateMRR(subscriptions || []);
  const churnData = calculateChurnRate(subscriptions || []);

  // Calculate total revenue (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentRevenue = (payments || [])
    .filter(p => 
      p.status === 'paid' && 
      new Date(p.created_at) >= thirtyDaysAgo
    )
    .reduce((sum, p) => sum + p.amount_sek, 0);

  // Calculate trial conversion rate
  const totalConvertedOrgs = mrrData.paying_orgs + churnData.churned_count;
  const totalTrialsStarted = totalConvertedOrgs + mrrData.trial_orgs;
  const conversionRate = totalTrialsStarted > 0 
    ? (totalConvertedOrgs / totalTrialsStarted) * 100 
    : 0;

  const stats = [
    {
      name: 'Monthly Recurring Revenue',
      value: formatCurrency(mrrData.total_mrr),
      change: `${formatCurrency(mrrData.avg_revenue_per_org)} avg per org`,
      changeType: 'neutral' as const,
      icon: DollarSign,
    },
    {
      name: 'Paying Customers',
      value: mrrData.paying_orgs,
      change: `${formatCurrency(mrrData.avg_revenue_per_org)} avg revenue`,
      changeType: 'positive' as const,
      icon: Users,
    },
    {
      name: 'Trial Customers',
      value: mrrData.trial_orgs,
      change: formatPercentage(conversionRate) + ' conversion rate',
      changeType: conversionRate >= 30 ? 'positive' as const : conversionRate >= 20 ? 'neutral' as const : 'negative' as const,
      icon: TrendingUp,
    },
    {
      name: 'Churn Rate',
      value: formatPercentage(churnData.churn_rate),
      change: `${churnData.churned_count} canceled this month`,
      changeType: churnData.churn_rate > 5 ? 'negative' as const : 'positive' as const,
      icon: AlertCircle,
    },
  ];

  // Find overdue payments
  const overduePayments = (payments || []).filter(p => 
    p.status === 'pending' && 
    new Date(p.created_at) < thirtyDaysAgo
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Billing Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Revenue metrics, subscriptions, and payment tracking
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className={`mt-2 text-xs ${
                    stat.changeType === 'positive' 
                      ? 'text-green-600 dark:text-green-400' 
                      : stat.changeType === 'negative'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-500'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/20">
                  <Icon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales Funnel */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Sales Funnel
        </h2>
        
        <div className="space-y-4">
          {/* Trial Customers */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">Trial Customers</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {mrrData.trial_orgs}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div 
                className="h-full bg-blue-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* Converted to Paying */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">Converted to Paying</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {mrrData.paying_orgs}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div 
                className="h-full bg-green-500"
                style={{ 
                  width: totalTrialsStarted > 0 
                    ? `${(mrrData.paying_orgs / totalTrialsStarted) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
          </div>

          {/* Conversion Rate Summary */}
          <div className="mt-4 rounded-lg bg-orange-50 p-4 dark:bg-orange-900/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Conversion Rate
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Trial → Paying Customer
                </p>
              </div>
              <p className={`text-2xl font-bold ${
                conversionRate >= 30 
                  ? 'text-green-600 dark:text-green-400' 
                  : conversionRate >= 20
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatPercentage(conversionRate, 1)}
              </p>
            </div>
            
            {/* Benchmark hint */}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {conversionRate >= 30 
                ? '✓ Excellent! Above 30% benchmark' 
                : conversionRate >= 20
                ? '⚠ Good, but room to improve (aim for 30%+)'
                : '⚠ Below 20% - needs attention'}
            </p>
          </div>

          {/* Canceled */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">Canceled (Churned)</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {churnData.churned_count}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div 
                className="h-full bg-red-500"
                style={{ 
                  width: totalTrialsStarted > 0 
                    ? `${(churnData.churned_count / totalTrialsStarted) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Link
          href="/super-admin/billing/plans"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
        >
          <CreditCard className="h-8 w-8 text-orange-600" />
          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
            Pricing Plans
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage subscription tiers and pricing
          </p>
        </Link>

        <Link
          href="/super-admin/billing/subscriptions"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
        >
          <Users className="h-8 w-8 text-orange-600" />
          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
            Subscriptions
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            View and manage customer subscriptions
          </p>
        </Link>

        <Link
          href="/super-admin/billing/payments"
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
        >
          <DollarSign className="h-8 w-8 text-orange-600" />
          <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
            Payments
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Track payment transactions and invoices
          </p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Payments
            </h2>
            <Link
              href="/super-admin/billing/payments"
              className="text-sm text-orange-600 hover:text-orange-500"
            >
              View all
            </Link>
          </div>
          
          <div className="space-y-3">
            {payments && payments.length > 0 ? (
              payments.slice(0, 5).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.organization?.name || 'Unknown Org'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(payment.amount_sek)}
                    </p>
                    <p className={`text-xs ${
                      payment.status === 'paid' 
                        ? 'text-green-600' 
                        : payment.status === 'failed'
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}>
                      {payment.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                No payments yet
              </p>
            )}
          </div>
        </div>

        {/* Overdue Payments */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Overdue Payments
            </h2>
            {overduePayments.length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                {overduePayments.length} overdue
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            {overduePayments.length > 0 ? (
              overduePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 p-3 dark:border-red-900 dark:bg-red-900/10"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.organization?.name || 'Unknown Org'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Due: {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(payment.amount_sek)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-green-600 dark:text-green-400">
                ✓ No overdue payments
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

