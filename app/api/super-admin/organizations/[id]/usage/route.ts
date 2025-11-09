import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

type RouteParams = { id: string };

/**
 * GET /api/super-admin/organizations/[id]/usage
 * 
 * Get organization usage statistics (time entries, materials, expenses, etc.)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<RouteParams>
) {
  try {
    await requireSuperAdmin();
    const { id } = await resolveRouteParams(context);
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Organization id is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Get counts for various resources
    const [
      timeEntriesResult,
      materialsResult,
      expensesResult,
      mileageResult,
      projectsResult,
      atasResult,
      diariesResult,
      checklistsResult,
    ] = await Promise.all([
      supabase.from('time_entries').select('*', { count: 'exact', head: true }).eq('organization_id', id),
      supabase.from('materials').select('*', { count: 'exact', head: true }).eq('organization_id', id),
      supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('organization_id', id),
      supabase.from('mileage_entries').select('*', { count: 'exact', head: true }).eq('organization_id', id),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('organization_id', id),
      supabase.from('ata_requests').select('*', { count: 'exact', head: true }).eq('organization_id', id),
      supabase.from('diary_entries').select('*', { count: 'exact', head: true }).eq('organization_id', id),
      supabase.from('checklists').select('*', { count: 'exact', head: true }).eq('organization_id', id),
    ]);
    
    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: recentTimeEntries } = await supabase
      .from('time_entries')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id)
      .gte('created_at', thirtyDaysAgo.toISOString());
    
    // Get most recent activity
    const { data: lastActivity } = await supabase
      .from('time_entries')
      .select('created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const usage = {
      time_entries: timeEntriesResult.count || 0,
      materials: materialsResult.count || 0,
      expenses: expensesResult.count || 0,
      mileage: mileageResult.count || 0,
      projects: projectsResult.count || 0,
      ata_requests: atasResult.count || 0,
      diary_entries: diariesResult.count || 0,
      checklists: checklistsResult.count || 0,
      recent_time_entries_30d: recentTimeEntries || 0,
      last_activity: lastActivity?.created_at || null,
    };
    
    return NextResponse.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    console.error('Error fetching organization usage:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization usage' },
      { status: 500 }
    );
  }
}

