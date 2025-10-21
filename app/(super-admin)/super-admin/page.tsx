import { 
  calculateRevenueMetrics,
  calculateGrowthMetrics,
  calculateUsageMetrics,
  calculateSystemHealthMetrics,
  getMRRTrendData,
  getUserGrowthData,
  getOrganizationsByPlan,
  getFeatureUsageStats,
} from '@/lib/super-admin/metrics-calculator';
import { getRecentActivity, formatActivityTimestamp, getActivityIcon } from '@/lib/super-admin/activity-feed';
import { formatCurrency } from '@/lib/billing/mrr-calculator';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  Activity,
  HardDrive,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

/**
 * Super Admin Dashboard
 * 
 * Main dashboard for platform overview with KPIs, charts, and activity feed.
 */

export default async function SuperAdminDashboard() {
  // Fetch all metrics
  const [
    revenueMetrics,
    growthMetrics,
    usageMetrics,
    systemHealthMetrics,
    mrrTrendData,
    userGrowthData,
    orgsByPlan,
    featureUsageStats,
    recentActivity,
  ] = await Promise.all([
    calculateRevenueMetrics(),
    calculateGrowthMetrics(),
    calculateUsageMetrics(),
    calculateSystemHealthMetrics(),
    getMRRTrendData(),
    getUserGrowthData(),
    getOrganizationsByPlan(),
    getFeatureUsageStats(),
    getRecentActivity(15),
  ]);

  // Calculate some derived values
  const totalCustomers = revenueMetrics.paying_customers + revenueMetrics.trial_customers;
  const activeUsersPercent = growthMetrics.total_users > 0 
    ? Math.round((growthMetrics.active_users_30d / growthMetrics.total_users) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Platform overview and key metrics
        </p>
      </div>

      {/* Revenue KPIs */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Revenue & Customers
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* MRR */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Recurring Revenue</p>
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/20">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(revenueMetrics.mrr)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              ARR: {formatCurrency(revenueMetrics.arr)}
            </p>
          </div>

          {/* Paying Customers */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Paying Customers</p>
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/20">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {revenueMetrics.paying_customers}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {revenueMetrics.trial_customers} in trial
            </p>
          </div>

          {/* ARPU */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Revenue Per User</p>
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/20">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(revenueMetrics.average_revenue_per_user)}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              per paying customer
            </p>
          </div>

          {/* Churn Rate */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Churn Rate</p>
              <div className={`rounded-full p-2 ${
                revenueMetrics.churn_rate < 5 
                  ? 'bg-green-100 dark:bg-green-900/20' 
                  : 'bg-red-100 dark:bg-red-900/20'
              }`}>
                {revenueMetrics.churn_rate < 5 ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {revenueMetrics.churn_rate}%
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              last 30 days
            </p>
          </div>
        </div>
      </div>

      {/* Growth & Usage */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Growth & Usage
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* New Orgs This Month */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">New Orgs This Month</p>
              <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/20">
                <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {growthMetrics.new_orgs_this_month}
            </p>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {growthMetrics.growth_rate >= 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                  <span className="text-green-600 dark:text-green-400">
                    +{growthMetrics.growth_rate}%
                  </span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                  <span className="text-red-600 dark:text-red-400">
                    {growthMetrics.growth_rate}%
                  </span>
                </>
              )}
              <span className="text-gray-500 dark:text-gray-400">vs last month</span>
            </div>
          </div>

          {/* Total Users */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/20">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {growthMetrics.total_users}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {growthMetrics.active_users_30d} active (30d)
            </p>
          </div>

          {/* Total Projects */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/20">
                <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {usageMetrics.total_projects}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              across all organizations
            </p>
          </div>

          {/* Time Entries */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">Time Entries</p>
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/20">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {usageMetrics.total_time_entries.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {usageMetrics.time_entries_30d.toLocaleString()} in last 30 days
            </p>
          </div>
        </div>
      </div>

      {/* Charts & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Feature Usage */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Feature Usage (Last 30 Days)
          </h3>
          <div className="space-y-3">
            {featureUsageStats.slice(0, 6).map((feature, index) => {
              const maxUsage = featureUsageStats[0].usage_count;
              const percentage = maxUsage > 0 ? (feature.usage_count / maxUsage) * 100 : 0;
              
              return (
                <div key={feature.feature}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{feature.feature}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {feature.usage_count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <div 
                      className="h-full bg-orange-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivity.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {activity.description}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    {formatActivityTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            
            {recentActivity.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No recent activity
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/super-admin/organizations"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
          >
            <Building2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Organizations</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Manage all customers</p>
            </div>
          </Link>
          
          <Link
            href="/super-admin/billing"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
          >
            <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Billing</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Revenue & subscriptions</p>
            </div>
          </Link>
          
          <Link
            href="/super-admin/users"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
          >
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Users</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">User management</p>
            </div>
          </Link>
          
          <Link
            href="/super-admin/analytics"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
          >
            <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Analytics</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Detailed insights</p>
            </div>
          </Link>
        </div>
      </div>

      {/* System Health */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          System Health
        </h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {systemHealthMetrics.uptime_percentage}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {systemHealthMetrics.avg_response_time_ms}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Error Rate</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {systemHealthMetrics.error_rate}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Storage Used</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {usageMetrics.total_storage_gb} GB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
