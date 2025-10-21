import { getAllPlans, formatPlanName, getPlanBadge, getPriceWithVAT } from '@/lib/billing/plans';
import { formatCurrency } from '@/lib/billing/mrr-calculator';
import { CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

/**
 * Pricing Plans Management Page
 * 
 * View and manage all pricing plans.
 * Super admins can create, edit, and deactivate plans.
 */

export default async function PricingPlansPage() {
  const plans = await getAllPlans(true); // Include inactive

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Pricing Plans
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage subscription plans and pricing tiers
          </p>
        </div>
        
        <Link
          href="/super-admin/billing/plans/new"
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500"
        >
          Create Plan
        </Link>
      </div>

      {/* Plans Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Plan Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Billing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Limits
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {plans.map((plan) => {
              const badge = getPlanBadge(plan);
              const priceWithVAT = getPriceWithVAT(plan.price_sek);
              
              return (
                <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatPlanName(plan)}
                      </span>
                      {badge && (
                        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                          {badge}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(plan.price_sek)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatCurrency(priceWithVAT)} with VAT
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="capitalize text-sm text-gray-700 dark:text-gray-300">
                      {plan.billing_cycle}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {plan.max_users} users
                      <br />
                      {plan.max_storage_gb} GB storage
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {plan.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                        <XCircle className="h-4 w-4" />
                        <span className="text-sm">Inactive</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/super-admin/billing/plans/${plan.id}`}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                        title="Edit plan"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      {plan.is_active && (
                        <button
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Deactivate plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {plans.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No pricing plans found. Create one to get started.
            </p>
          </div>
        )}
      </div>

      {/* Plans Summary */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Total Plans
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {plans.length}
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Active Plans
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {plans.filter(p => p.is_active).length}
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Billing Cycles
          </h3>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {plans.filter(p => p.billing_cycle === 'monthly').length} Monthly
            <br />
            {plans.filter(p => p.billing_cycle === 'annual').length} Annual
          </p>
        </div>
      </div>
    </div>
  );
}

