import { getOrganizationById, formatStorageSize, getStorageUsagePercentage, formatOrganizationStatus, getOrganizationStatusColor } from '@/lib/super-admin/organizations';
import { formatPlanName, formatPlanPrice } from '@/lib/billing/plans';
import { getTrialDaysRemaining, getSubscriptionHealth } from '@/lib/billing/subscriptions';
import { Building2, Users, HardDrive, Calendar, CreditCard, Activity, AlertTriangle, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrganizationActions } from '@/components/super-admin/organizations/organization-actions';
import { SupportActionsPanel } from '@/components/super-admin/support/support-actions-panel';
import { OrganizationUsersList } from '@/components/super-admin/support/organization-users-list';
import { ManageBillingButton } from '@/components/billing/manage-billing-button';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Organization Detail Page
 * 
 * View complete details about a specific organization including:
 * - Overview and quick stats
 * - Users and members
 * - Usage statistics
 * - Billing and payments
 * - Activity history
 */

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function OrganizationDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab = 'overview' } = await searchParams;

  const organization = await getOrganizationById(id);

  if (!organization) {
    notFound();
  }
  
  // Get organization users for support actions
  const supabase = await createClient();
  const adminClient = createAdminClient();
  
  const { data: orgMembers } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      role,
      profiles:user_id (
        id,
        email,
        full_name
      )
    `)
    .eq('org_id', id);
  
  // Build user list with complete information
  const userEmails: string[] = [];
  const organizationUsers: Array<{
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    last_sign_in_at: string | null;
  }> = [];

  if (orgMembers && orgMembers.length > 0) {
    for (const member of orgMembers) {
      const profile: any = member.profiles;
      if (profile) {
        userEmails.push(profile.email);
        
        // Get last sign in from auth.users
        const { data: { user } } = await adminClient.auth.admin.getUserById(member.user_id);
        
        organizationUsers.push({
          id: member.user_id,
          email: profile.email,
          full_name: profile.full_name,
          role: member.role,
          last_sign_in_at: user?.last_sign_in_at || null,
        });
      }
    }
  }
  
  const plan = organization.plan ? {
    id: organization.plan.id,
    name: organization.plan.name,
    price_sek: organization.plan.price_sek,
    billing_cycle: (organization.plan.billing_cycle || 'monthly') as 'monthly' | 'annual',
    max_users: organization.plan.max_users,
    max_storage_gb: organization.plan.max_storage_gb,
    is_active: true, // Default to true since it's from active subscription
  } : null;
  const subscription = organization.subscription;
  
  // Fetch pricing plans for plan selector
  const { data: pricingPlans } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_sek', { ascending: true });
  
  // Get a customer email (first admin or member)
  const customerEmail = userEmails[0] || 'admin@example.com';
  const statusColor = getOrganizationStatusColor(organization.status);
  const storagePercent = plan ? getStorageUsagePercentage(organization.storage_used_bytes || 0, plan.max_storage_gb) : 0;
  
  // Calculate trial info
  const trialDaysRemaining = organization.trial_ends_at ? getTrialDaysRemaining({ trial_ends_at: organization.trial_ends_at } as any) : 0;
  const isTrialEnding = trialDaysRemaining <= 3 && trialDaysRemaining > 0;
  
  // Subscription health
  const subscriptionHealth = subscription ? getSubscriptionHealth(subscription as any) : 0;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          href="/super-admin/organizations"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Organizations
        </Link>
        
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {organization.name}
            </h1>
            <div className="mt-2 flex items-center gap-4">
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium
                ${statusColor === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                ${statusColor === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
                ${statusColor === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                ${statusColor === 'gray' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' : ''}
              `}>
                {formatOrganizationStatus(organization.status)}
              </span>
              
              {plan && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatPlanName(plan)} • {formatPlanPrice(plan)}
                </span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <OrganizationActions
            organizationId={organization.id}
            organizationName={organization.name}
            currentStatus={organization.status}
          />
        </div>
      </div>
      
      {/* Alerts */}
      {isTrialEnding && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-900/20">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <div>
            <p className="font-medium text-orange-900 dark:text-orange-200">
              Trial ending soon
            </p>
            <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
              This organization&apos;s trial ends in {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'}.
            </p>
          </div>
        </div>
      )}
      
      {storagePercent >= 90 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium text-red-900 dark:text-red-200">
              Storage limit almost reached
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              This organization is using {storagePercent}% of their storage limit.
            </p>
          </div>
        </div>
      )}
      
      {/* Quick Stats */}
      <div className="grid gap-6 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/20">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {organization.user_count || 0}
                {plan && (
                  <span className="text-base font-normal text-gray-500"> / {plan.max_users}</span>
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
              <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {organization.project_count || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-3 ${storagePercent >= 80 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-orange-100 dark:bg-orange-900/20'}`}>
              <HardDrive className={`h-6 w-6 ${storagePercent >= 80 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Storage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {storagePercent}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatStorageSize(organization.storage_used_bytes || 0)} used
              </p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/20">
              <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Subscription</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {subscriptionHealth}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Health score
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          <Link
            href={`/super-admin/organizations/${id}?tab=overview`}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              tab === 'overview'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Overview
          </Link>
          <Link
            href={`/super-admin/organizations/${id}?tab=users`}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              tab === 'users'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Users
          </Link>
          <Link
            href={`/super-admin/organizations/${id}?tab=usage`}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              tab === 'usage'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Usage
          </Link>
          <Link
            href={`/super-admin/organizations/${id}?tab=billing`}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              tab === 'billing'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Billing
          </Link>
          <Link
            href={`/super-admin/organizations/${id}?tab=support`}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              tab === 'support'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Support
          </Link>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Organization Details
              </h3>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {new Date(organization.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {new Date(organization.updated_at).toLocaleString()}
                  </dd>
                </div>
                {organization.trial_ends_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Trial Ends</dt>
                    <dd className="mt-1 flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                      {new Date(organization.trial_ends_at).toLocaleDateString()} ({trialDaysRemaining} days)
                    </dd>
                  </div>
                )}
                {subscription && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Subscription Status</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {subscription.status === 'active' && (
                        <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          Active
                        </span>
                      )}
                      {subscription.status === 'past_due' && (
                        <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <XCircle className="h-4 w-4" />
                          Past Due
                        </span>
                      )}
                      {subscription.status === 'trial' && (
                        <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <Activity className="h-4 w-4" />
                          Trial
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            
            {plan && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Current Plan
                </h3>
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatPlanName(plan)}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {formatPlanPrice(plan)}
                      </p>
                    </div>
                    <button className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                      Change Plan
                    </button>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Max Users</dt>
                      <dd className="font-semibold text-gray-900 dark:text-white">{plan.max_users}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Max Storage</dt>
                      <dd className="font-semibold text-gray-900 dark:text-white">{plan.max_storage_gb} GB</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>
        )}
        
        {tab === 'users' && (
          <OrganizationUsersList users={organizationUsers} />
        )}
        
        {tab === 'usage' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Usage Statistics
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Coming soon: Detailed usage metrics and activity history
            </p>
          </div>
        )}
        
        {tab === 'billing' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Billing & Payments
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage subscription and payment information via Stripe Customer Portal
                </p>
              </div>
              {subscription && (
                <ManageBillingButton organizationId={organization.id} />
              )}
            </div>

            {subscription && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Current Plan
                    </div>
                    <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                      {plan ? formatPlanName(plan) : 'No Plan'}
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Subscription Status
                    </div>
                    <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                      {subscription.status}
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Current Period
                    </div>
                    <div className="mt-2 text-sm text-gray-900 dark:text-white">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Next Billing Date
                    </div>
                    <div className="mt-2 text-sm text-gray-900 dark:text-white">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!subscription && pricingPlans && (
              <div className="space-y-6">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Billing Contact:</strong> {customerEmail}
                  </p>
                  {organization.stripe_customer_id && (
                    <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                      Stripe Customer ID: {organization.stripe_customer_id}
                    </p>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Available Plans
                  </h4>
                  
                  <div className="space-y-3">
                    {pricingPlans
                      .filter((p: any) => p.stripe_price_id)
                      .map((plan: any) => (
                        <div
                          key={plan.id}
                          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-semibold text-gray-900 dark:text-white">
                                {plan.name} - {plan.billing_cycle}
                              </h5>
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {plan.price_sek} SEK • {plan.max_users} users • {plan.max_storage_gb} GB
                              </p>
                            </div>
                            <div className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              ✓ Configured
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Stripe Integration Foundation Complete:</strong> Database schema, API endpoints, and webhook handlers are in place. 
                      Interactive checkout UI will be added in a future phase.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {tab === 'support' && (
          <div>
            <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
              Support Actions
            </h3>
            <SupportActionsPanel
              organizationId={organization.id}
              organizationName={organization.name}
              trialEndsAt={organization.trial_ends_at}
              userEmails={userEmails}
            />
          </div>
        )}
      </div>
    </div>
  );
}

