import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin can view audit logs
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const entityType = searchParams.get('entity_type');
		const action = searchParams.get('action');
		const userId = searchParams.get('user_id');
		const startDate = searchParams.get('start_date');
		const endDate = searchParams.get('end_date');
		const limit = parseInt(searchParams.get('limit') || '50', 10);
		const offset = parseInt(searchParams.get('offset') || '0', 10);

		const supabase = await createClient();

		// Build query
		let query = supabase
			.from('audit_log')
			.select(`
				*,
				user:profiles!audit_log_user_id_fkey(full_name, email)
			`, { count: 'exact' })
			.eq('org_id', membership.org_id)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		// Apply filters
		if (entityType) {
			query = query.eq('entity_type', entityType);
		}
		if (action) {
			query = query.eq('action', action);
		}
		if (userId) {
			query = query.eq('user_id', userId);
		}
		if (startDate) {
			query = query.gte('created_at', startDate);
		}
		if (endDate) {
			query = query.lte('created_at', endDate);
		}

		const { data, error, count } = await query;

		if (error) {
			console.error('Error fetching audit logs:', error);
			return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
		}

		return NextResponse.json({
			logs: data || [],
			total: count || 0,
			limit,
			offset,
		});
	} catch (error) {
		console.error('Error in GET /api/audit-logs:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

