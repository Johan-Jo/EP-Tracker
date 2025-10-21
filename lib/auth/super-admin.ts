import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Super Admin Authentication & Authorization
 * 
 * Handles all super admin-related auth checks and permissions.
 * Super admins have elevated privileges to manage the entire platform.
 */

export interface SuperAdmin {
  id: string;
  user_id: string;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
}

/**
 * Check if the current user is a super admin
 * @returns Promise<boolean> - True if user is super admin, false otherwise
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return false;
    }
    
    // Check if user exists in super_admins table and is not revoked
    const { data, error } = await supabase
      .from('super_admins')
      .select('id, revoked_at')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error in isSuperAdmin:', error);
    return false;
  }
}

/**
 * Check if a specific user is a super admin (by user ID)
 * Useful for server-side checks
 */
export async function checkUserIsSuperAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking user super admin status:', error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error('Error in checkUserIsSuperAdmin:', error);
    return false;
  }
}

/**
 * Get super admin details for the current user
 * @returns Promise<SuperAdmin | null>
 */
export async function getSuperAdminDetails(): Promise<SuperAdmin | null> {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('super_admins')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .maybeSingle();
    
    if (error) {
      console.error('Error getting super admin details:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getSuperAdminDetails:', error);
    return null;
  }
}

/**
 * Require super admin access - redirects if not authorized
 * Use this in server components that require super admin privileges
 */
export async function requireSuperAdmin(): Promise<void> {
  const isAdmin = await isSuperAdmin();
  
  if (!isAdmin) {
    redirect('/dashboard');
  }
}

/**
 * Require super admin access and return user details
 * Redirects if not authorized, returns super admin details if authorized
 */
export async function requireSuperAdminWithDetails(): Promise<SuperAdmin> {
  const details = await getSuperAdminDetails();
  
  if (!details) {
    redirect('/dashboard');
  }
  
  return details;
}

/**
 * Log super admin action to audit trail
 * All super admin actions should be logged for security and compliance
 */
export async function logSuperAdminAction(
  action: string,
  details: Record<string, any> = {},
  targetUserId?: string,
  targetOrganizationId?: string
): Promise<void> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No user found for audit log');
      return;
    }
    
    // Get super admin record
    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (!superAdmin) {
      console.error('User is not a super admin, cannot log action');
      return;
    }
    
    // Insert audit log entry
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        super_admin_id: superAdmin.id,
        action,
        details,
        target_user_id: targetUserId || null,
        target_organization_id: targetOrganizationId || null,
        ip_address: null, // Can be added later from request headers
        user_agent: null, // Can be added later from request headers
      });
    
    if (error) {
      console.error('Error logging super admin action:', error);
    }
  } catch (error) {
    console.error('Error in logSuperAdminAction:', error);
  }
}

/**
 * Grant super admin privileges to a user
 * Only existing super admins can grant this privilege
 */
export async function grantSuperAdmin(
  targetUserId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify current user is super admin
    const currentSuperAdmin = await getSuperAdminDetails();
    
    if (!currentSuperAdmin) {
      return { success: false, error: 'Not authorized' };
    }
    
    const supabase = await createClient();
    
    // Check if user already has super admin
    const { data: existing } = await supabase
      .from('super_admins')
      .select('id, revoked_at')
      .eq('user_id', targetUserId)
      .maybeSingle();
    
    if (existing && !existing.revoked_at) {
      return { success: false, error: 'User is already a super admin' };
    }
    
    // If revoked, we could un-revoke instead of creating new record
    if (existing && existing.revoked_at) {
      const { error } = await supabase
        .from('super_admins')
        .update({ revoked_at: null })
        .eq('id', existing.id);
      
      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Grant new super admin privilege
      const { error } = await supabase
        .from('super_admins')
        .insert({
          user_id: targetUserId,
          granted_by: currentSuperAdmin.user_id,
        });
      
      if (error) {
        return { success: false, error: error.message };
      }
    }
    
    // Log the action
    await logSuperAdminAction('grant_super_admin', { reason }, targetUserId);
    
    return { success: true };
  } catch (error) {
    console.error('Error in grantSuperAdmin:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Revoke super admin privileges from a user
 * Only existing super admins can revoke this privilege
 */
export async function revokeSuperAdmin(
  targetUserId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify current user is super admin
    const currentSuperAdmin = await getSuperAdminDetails();
    
    if (!currentSuperAdmin) {
      return { success: false, error: 'Not authorized' };
    }
    
    // Cannot revoke yourself
    if (currentSuperAdmin.user_id === targetUserId) {
      return { success: false, error: 'Cannot revoke your own super admin privileges' };
    }
    
    const supabase = await createClient();
    
    // Revoke super admin (soft delete)
    const { error } = await supabase
      .from('super_admins')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', targetUserId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Log the action
    await logSuperAdminAction('revoke_super_admin', { reason }, targetUserId);
    
    return { success: true };
  } catch (error) {
    console.error('Error in revokeSuperAdmin:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

