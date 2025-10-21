import { getAllSubscriptions } from '@/lib/billing/subscriptions';
import { formatCurrency } from '@/lib/billing/mrr-calculator';
import { 
  formatSubscriptionStatus, 
  getSubscriptionStatusColor, 
  getDaysUntilNextBilling,
  getTrialDaysRemaining,
  isInTrial 
} from '@/lib/billing/subscriptions';
import { getMonthlyEquivalent, formatPlanName } from '@/lib/billing/plans';
import { Calendar, Edit, XCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * Subscriptions Management Page
 * 
 * View and manage all organization subscriptions.
 * Super admins can assign plans, change plans, and cancel subscriptions.
 */

export default async function SubscriptionsPage() {
  const subscriptions = await getAllSubscriptions();

  // Calculate summary stats
  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const trialCount = subscriptions.filter(s => s.status === 'trial').length;
  const pastDueCount = subscriptions.filter(s => s.status === 'past_due').length;
  const canceledCount = subscriptions.filter(s => s.status === 'canceled').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Subscriptions
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage organization subscriptions and plans
          </p>
        </div>
        
        <Link
          href="/super-admin/organizations"
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500"
        >
          Assign Plan to Org
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Active
          </h3>
          <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
            {activeCount}
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Trial
          </h3>
          <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {trialCount}
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Past Due
          </h3>
          <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">
            {pastDueCount}
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Canceled
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-600 dark:text-gray-400">
            {canceledCount}
          </p>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  MRR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Next Billing
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {subscriptions.map((subscription) => {
                const plan = subscription.plan as any;
                const org = subscription.organization as any;
                const monthlyMRR = plan ? getMonthlyEquivalent(plan) : 0;
                const statusColor = getSubscriptionStatusColor(subscription.status);
                const daysUntilBilling = getDaysUntilNextBilling(subscription);
                const inTrial = isInTrial(subscription);
                const trialDays = inTrial ? getTrialDaysRemaining(subscription) : 0;
                
                return (
                  <tr key={subscription.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {org?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {org?.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {plan ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatPlanName(plan)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {plan.max_users} users, {plan.max_storage_gb} GB
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No plan</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(monthlyMRR)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        per month
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium
                        ${statusColor === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${statusColor === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                        ${statusColor === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : ''}
                        ${statusColor === 'gray' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' : ''}
                        ${statusColor === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                      `}>
                        {formatSubscriptionStatus(subscription.status)}
                      </span>
                      {inTrial && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {trialDays} days left
                        </div>
                      )}
                      {subscription.cancel_at_period_end && (
                        <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                          Canceling soon
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                        <Calendar className="h-4 w-4" />
                        <span>{daysUntilBilling} days</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(subscription.current_period_end).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                          title="Change plan"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {subscription.status !== 'canceled' && (
                          <button
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Cancel subscription"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {subscriptions.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No subscriptions found. Assign plans to organizations to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

