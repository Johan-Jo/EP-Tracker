import { createClient } from '@/lib/supabase/server';

/**
 * Organization Management Helpers
 * 
 * Functions for managing organizations from the super admin panel.
 */

export interface OrganizationWithDetails {
  id: string;
  name: string;
  status: string;
  plan_id: string | null;
  storage_used_bytes: number;
  trial_ends_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  plan?: {
    id: string;
    name: string;
    price_sek: number;
    billing_cycle: string;
    max_users: number;
    max_storage_gb: number;
  };
  subscription?: {
    id: string;
    status: string;
    current_period_end: string;
  };
  user_count?: number;
  project_count?: number;
  last_activity?: string;
}

/**
 * Get all organizations with details
 */
export async function getAllOrganizations(includeDeleted: boolean = false) {
  const supabase = await createClient();
  
  let query = supabase
    .from('organizations')
    .select(`
      *,
      plan:pricing_plans(id, name, price_sek, billing_cycle, max_users, max_storage_gb)
    `)
    .order('created_at', { ascending: false });
  
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }
  
  const { data: orgs, error } = await query;
  
  if (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }
  
  // Get user counts for each org
  const orgsWithCounts = await Promise.all(
    (orgs || []).map(async (org) => {
      // Get user count
      const { count: userCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);
      
      // Get project count
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);
      
      // Get subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id, status, current_period_end')
        .eq('organization_id', org.id)
        .maybeSingle();
      
      return {
        ...org,
        user_count: userCount || 0,
        project_count: projectCount || 0,
        subscription,
      };
    })
  );
  
  return orgsWithCounts as OrganizationWithDetails[];
}

/**
 * Get organization by ID with full details
 */
export async function getOrganizationById(orgId: string) {
  const supabase = await createClient();
  
  const { data: org, error } = await supabase
    .from('organizations')
    .select(`
      *,
      plan:pricing_plans(*),
      subscription:subscriptions(*)
    `)
    .eq('id', orgId)
    .single();
  
  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }
  
  // Get counts
  const { count: userCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);
  
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);
  
  return {
    ...org,
    user_count: userCount || 0,
    project_count: projectCount || 0,
  } as OrganizationWithDetails;
}

/**
 * Calculate storage usage for an organization
 */
export async function calculateStorageUsage(orgId: string): Promise<number> {
  const supabase = await createClient();
  
  // Get all files from storage for this organization
  // This is a simplified calculation - in production you'd want to 
  // track this in the database for performance
  const { data: files } = await supabase
    .storage
    .from('receipts')
    .list(orgId);
  
  let totalBytes = 0;
  if (files) {
    totalBytes += files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
  }
  
  return totalBytes;
}

/**
 * Format storage size for display
 */
export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Calculate storage usage percentage
 */
export function getStorageUsagePercentage(usedBytes: number, maxGB: number): number {
  const maxBytes = maxGB * 1024 * 1024 * 1024;
  return Math.round((usedBytes / maxBytes) * 100);
}

/**
 * Check if organization is approaching storage limit
 */
export function isApproachingStorageLimit(usedBytes: number, maxGB: number): boolean {
  return getStorageUsagePercentage(usedBytes, maxGB) >= 80;
}

/**
 * Get organization status color
 */
export function getOrganizationStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    active: 'green',
    trial: 'blue',
    suspended: 'red',
    deleted: 'gray',
  };
  
  return colorMap[status] || 'gray';
}

/**
 * Format organization status for display
 */
export function formatOrganizationStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'Active',
    trial: 'Trial',
    suspended: 'Suspended',
    deleted: 'Deleted',
  };
  
  return statusMap[status] || status;
}

/**
 * Check if organization is inactive (no activity in 30+ days)
 */
export async function isOrganizationInactive(orgId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Check for recent time entries
  const { count } = await supabase
    .from('time_entries')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .gte('created_at', thirtyDaysAgo.toISOString());
  
  return (count || 0) === 0;
}

/**
 * Get last activity date for organization
 */
export async function getLastActivityDate(orgId: string): Promise<Date | null> {
  const supabase = await createClient();
  
  // Get most recent time entry
  const { data: timeEntry } = await supabase
    .from('time_entries')
    .select('created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (timeEntry) {
    return new Date(timeEntry.created_at);
  }
  
  // Fallback to organization created date
  const { data: org } = await supabase
    .from('organizations')
    .select('created_at')
    .eq('id', orgId)
    .single();
  
  return org ? new Date(org.created_at) : null;
}

/**
 * Search organizations by name
 */
export async function searchOrganizations(searchTerm: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organizations')
    .select(`
      *,
      plan:pricing_plans(id, name)
    `)
    .ilike('name', `%${searchTerm}%`)
    .is('deleted_at', null)
    .limit(20);
  
  if (error) {
    console.error('Error searching organizations:', error);
    return [];
  }
  
  return data;
}

