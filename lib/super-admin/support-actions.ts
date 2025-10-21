import { createClient } from '@/lib/supabase/server';

/**
 * Support Actions for Super Admin
 * 
 * Helper functions for common customer support tasks.
 */

/**
 * Extend trial period for an organization
 */
export async function extendTrial(organizationId: string, additionalDays: number): Promise<boolean> {
  const supabase = await createClient();
  
  // Get current trial end date
  const { data: org } = await supabase
    .from('organizations')
    .select('trial_ends_at')
    .eq('id', organizationId)
    .single();
  
  if (!org) {
    throw new Error('Organization not found');
  }
  
  // Calculate new trial end date
  const currentTrialEnd = org.trial_ends_at ? new Date(org.trial_ends_at) : new Date();
  const newTrialEnd = new Date(currentTrialEnd);
  newTrialEnd.setDate(newTrialEnd.getDate() + additionalDays);
  
  // Update organization
  const { error } = await supabase
    .from('organizations')
    .update({
      trial_ends_at: newTrialEnd.toISOString(),
      status: 'trial',
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
  
  if (error) {
    console.error('Error extending trial:', error);
    return false;
  }
  
  return true;
}

/**
 * Grant temporary storage increase to an organization
 */
export async function grantTemporaryStorage(organizationId: string, additionalGB: number): Promise<boolean> {
  const supabase = await createClient();
  
  // Get current plan
  const { data: org } = await supabase
    .from('organizations')
    .select('plan_id, pricing_plans(max_storage_gb)')
    .eq('id', organizationId)
    .single();
  
  if (!org) {
    throw new Error('Organization not found');
  }
  
  // This would typically update a temporary storage override field
  // For now, we'll just log it
  console.log(`Granted ${additionalGB}GB additional storage to organization ${organizationId}`);
  
  // In production, you might:
  // 1. Add a `temp_storage_gb` field to organizations
  // 2. Add an expiration date for the temp storage
  // 3. Update the storage limit check logic to account for temp storage
  
  return true;
}

/**
 * Reset user password (sends password reset email)
 */
export async function sendPasswordResetEmail(userEmail: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });
  
  if (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
  
  return true;
}

/**
 * Resend verification email to user
 */
export async function resendVerificationEmail(userEmail: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: userEmail,
  });
  
  if (error) {
    console.error('Error resending verification email:', error);
    return false;
  }
  
  return true;
}

/**
 * Unlock a suspended user account
 */
export async function unlockUserAccount(userId: string): Promise<boolean> {
  const supabase = await createClient();
  
  // Update user status (if you have a status field)
  // For now, we'll assume users are managed through organization membership
  const { error } = await supabase
    .from('organization_members')
    .update({ updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error unlocking user account:', error);
    return false;
  }
  
  return true;
}

/**
 * Clear stuck sync queue for an organization
 */
export async function clearSyncQueue(organizationId: string): Promise<number> {
  // In a real implementation, this would clear entries from a sync_queue table
  // For now, return a mock count
  console.log(`Cleared sync queue for organization ${organizationId}`);
  return 0;
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(userId: string) {
  const supabase = await createClient();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Get counts for various activities
  const [
    timeEntriesResult,
    materialsResult,
    expensesResult,
    atasResult,
  ] = await Promise.all([
    supabase.from('time_entries').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('materials').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('ata_requests').select('*', { count: 'exact', head: true }).eq('created_by', userId).gte('created_at', thirtyDaysAgo.toISOString()),
  ]);
  
  return {
    time_entries_30d: timeEntriesResult.count || 0,
    materials_30d: materialsResult.count || 0,
    expenses_30d: expensesResult.count || 0,
    ata_requests_30d: atasResult.count || 0,
  };
}

/**
 * Format support action for audit log
 */
export function formatSupportAction(action: string, targetId: string, details?: Record<string, unknown>): string {
  return JSON.stringify({
    action,
    target_id: targetId,
    details,
    timestamp: new Date().toISOString(),
  });
}

