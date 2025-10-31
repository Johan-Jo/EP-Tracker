import { createClient } from '@/lib/supabase/server';

/**
 * Activity Feed for Super Admin Dashboard
 * 
 * Track and display recent platform-wide events.
 */

export interface ActivityEvent {
  id: string;
  type: 'org_created' | 'org_suspended' | 'org_deleted' | 'plan_changed' | 'payment_received' | 'subscription_created';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get recent platform activity
 */
export async function getRecentActivity(limit: number = 20): Promise<ActivityEvent[]> {
  const supabase = await createClient();
  
  const activities: ActivityEvent[] = [];
  
  // Get recent organizations (created in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: newOrgs } = await supabase
    .from('organizations')
    .select('id, name, created_at')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  
  (newOrgs || []).forEach((org) => {
    activities.push({
      id: `org-${org.id}`,
      type: 'org_created',
      title: 'New Organization',
      description: `${org.name} joined the platform`,
      timestamp: org.created_at,
      metadata: { organization_id: org.id, organization_name: org.name },
    });
  });
  
  // Get recent subscriptions
  const { data: newSubs } = await supabase
    .from('subscriptions')
    .select(`
      id,
      created_at,
      organization:organizations(id, name),
      plan:pricing_plans(name)
    `)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  
  (newSubs || []).forEach((sub: any) => {
    const org = Array.isArray(sub.organization) ? sub.organization[0] : sub.organization;
    const plan = Array.isArray(sub.plan) ? sub.plan[0] : sub.plan;
    activities.push({
      id: `sub-${sub.id}`,
      type: 'subscription_created',
      title: 'New Subscription',
      description: `${org?.name || 'Unknown'} subscribed to ${plan?.name || 'Unknown Plan'}`,
      timestamp: sub.created_at,
      metadata: { subscription_id: sub.id, organization_id: org?.id },
    });
  });
  
  // Get recent payments
  const { data: recentPayments } = await supabase
    .from('payment_transactions')
    .select(`
      id,
      amount_sek,
      created_at,
      subscription:subscriptions(organization:organizations(id, name))
    `)
    .eq('status', 'completed')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  
  (recentPayments || []).forEach((payment: any) => {
    const subscription = Array.isArray(payment.subscription) ? payment.subscription[0] : payment.subscription;
    const org = subscription?.organization 
      ? (Array.isArray(subscription.organization) ? subscription.organization[0] : subscription.organization)
      : null;
    activities.push({
      id: `payment-${payment.id}`,
      type: 'payment_received',
      title: 'Payment Received',
      description: `${org?.name || 'Unknown'} paid ${payment.amount_sek} SEK`,
      timestamp: payment.created_at,
      metadata: { payment_id: payment.id, amount: payment.amount_sek },
    });
  });
  
  // Sort all activities by timestamp
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Return limited results
  return activities.slice(0, limit);
}

/**
 * Format activity timestamp for display
 */
export function formatActivityTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Get activity icon based on type
 */
export function getActivityIcon(type: ActivityEvent['type']): string {
  const iconMap: Record<ActivityEvent['type'], string> = {
    org_created: '🏢',
    org_suspended: '🚫',
    org_deleted: '🗑️',
    plan_changed: '📦',
    payment_received: '💰',
    subscription_created: '✅',
  };
  
  return iconMap[type] || '📄';
}

/**
 * Get activity color based on type
 */
export function getActivityColor(type: ActivityEvent['type']): string {
  const colorMap: Record<ActivityEvent['type'], string> = {
    org_created: 'green',
    org_suspended: 'red',
    org_deleted: 'gray',
    plan_changed: 'blue',
    payment_received: 'green',
    subscription_created: 'green',
  };
  
  return colorMap[type] || 'gray';
}

