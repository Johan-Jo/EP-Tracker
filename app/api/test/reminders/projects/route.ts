/**
 * API endpoint to fetch projects for reminder testing
 * Returns projects with names
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or foreman
    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'foreman'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins and foremen can access this' },
        { status: 403 }
      );
    }

    // Get all projects in the organization
    const adminClient = createAdminClient();
    const { data: projects, error } = await adminClient
      .from('projects')
      .select('id, name, project_number, status')
      .eq('org_id', membership.org_id)
      .order('name');

    if (error) {
      console.error('[Test Reminders] Error fetching projects:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data
    const projectsList = (projects || []).map((project) => ({
      id: project.id,
      name: project.name,
      projectNumber: project.project_number,
      status: project.status,
      displayName: project.project_number
        ? `${project.name} (${project.project_number})`
        : project.name,
    }));

    return NextResponse.json({ projects: projectsList });
  } catch (error: any) {
    console.error('[Test Reminders] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


