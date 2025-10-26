import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { absenceSchema } from '@/lib/schemas/planning';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session

// GET /api/absences - List absences with filters
// EPIC 26: Optimized from 2 queries to 1 cached query
export async function GET(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 1 query)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		// Parse query parameters
		const searchParams = request.nextUrl.searchParams;
		const user_id = searchParams.get('user_id');
		const type = searchParams.get('type');
		const start = searchParams.get('start');
		const end = searchParams.get('end');

		// Build query
		let query = supabase
			.from('absences')
			.select(`
				*,
				user:profiles!absences_user_id_fkey(id, full_name, email)
			`)
			.eq('org_id', membership.org_id)
			.order('start_ts', { ascending: false });

		// Apply filters
		if (user_id) query = query.eq('user_id', user_id);
		if (type) query = query.eq('type', type);
		if (start && end) {
			// Fetch absences that overlap with the date range
			query = query.or(`start_ts.lte.${end},end_ts.gte.${start}`);
		} else if (start) {
			query = query.gte('start_ts', start);
		} else if (end) {
			query = query.lte('start_ts', end);
		}

		const { data: absences, error } = await query;

		if (error) {
			console.error('Error fetching absences:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ absences }, { status: 200 });
	} catch (error) {
		console.error('Error in GET /api/absences:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// POST /api/absences - Create new absence
// EPIC 26: Optimized from 2 queries to 1 cached query
export async function POST(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 1 query)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		// Parse and validate request body
		const body = await request.json();
		const validation = absenceSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		// Check permissions: admin/foreman can create for anyone, workers only for self
		if (data.user_id !== user.id && !['admin', 'foreman', 'finance'].includes(membership.role)) {
			return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
		}

		// Verify user belongs to the same organization
		const { data: targetMembership, error: membershipError } = await supabase
			.from('memberships')
			.select('org_id')
			.eq('user_id', data.user_id)
			.eq('org_id', membership.org_id)
			.single();

		if (membershipError || !targetMembership) {
			return NextResponse.json({ error: 'User not found in organization' }, { status: 404 });
		}

		// Insert absence
		const { data: absence, error: insertError } = await supabase
			.from('absences')
			.insert({
				org_id: membership.org_id,
				user_id: data.user_id,
				type: data.type,
				start_ts: data.start_ts,
				end_ts: data.end_ts,
				note: data.note,
				created_by: user.id,
			})
			.select(`
				*,
				user:profiles!absences_user_id_fkey(id, full_name, email)
			`)
			.single();

		if (insertError) {
			console.error('Error creating absence:', insertError);
			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		return NextResponse.json({ absence }, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/absences:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

