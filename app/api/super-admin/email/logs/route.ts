import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/super-admin/email/logs
 * 
 * Get email sending history with filters
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const emailType = searchParams.get('emailType');
    const organizationId = searchParams.get('organizationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('email_logs')
      .select('*', { count: 'exact' })
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (emailType) {
      query = query.eq('email_type', emailType);
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      logs: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch email logs',
      },
      { status: 500 }
    );
  }
}

