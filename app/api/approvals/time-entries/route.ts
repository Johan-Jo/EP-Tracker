import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { checkDemoMode } from '@/lib/demo/check-demo-mode';
import { getEffectiveDateForDemo } from '@/lib/demo/date-shift';

export async function GET(request: NextRequest) {
	const { user, membership } = await getSession();

	if (!user || !membership) {
		return NextResponse.json({ error: 'Inte autentiserad' }, { status: 401 });
	}

	// Only admin and foreman can review time entries
	if (membership.role !== 'admin' && membership.role !== 'foreman') {
		return NextResponse.json(
			{ error: 'Endast administratörer och arbetsledare kan granska tidrapporter' },
			{ status: 403 }
		);
	}

	const supabase = await createClient();
	const searchParams = request.nextUrl.searchParams;
	const periodStartParam = searchParams.get('period_start');
	const periodEndParam = searchParams.get('period_end');
	const status = searchParams.get('status') || 'submitted';

	if (!periodStartParam || !periodEndParam) {
		return NextResponse.json(
			{ error: 'period_start och period_end krävs' },
			{ status: 400 }
		);
	}

	// Check if in demo mode and apply date-shifting
	const demoCheck = await checkDemoMode(membership.org_id);
	const effectiveOrgId = demoCheck.isDemoMode && demoCheck.demoOrgId ? demoCheck.demoOrgId : membership.org_id;
	
	const periodStartDate = new Date(periodStartParam);
	const periodEndDate = new Date(periodEndParam);
	
	// Apply date-shifting for demo organization
	const effectivePeriodStart = await getEffectiveDateForDemo(effectiveOrgId, periodStartDate);
	const effectivePeriodEnd = await getEffectiveDateForDemo(effectiveOrgId, periodEndDate);

	// ✅ PERFORMANCE: Select specific columns instead of *
	// ✅ SOFT DELETE: Exclude soft-deleted entries (deleted_at IS NULL)
	// NOTE: Only filter by deleted_at if the column exists (after migration is applied)
	let query = supabase
		.from('time_entries')
		.select(`
			id,
			org_id,
			project_id,
			phase_id,
			user_id,
			task_label,
			start_at,
			stop_at,
			duration_min,
			status,
			billing_type,
			fixed_block_id,
			ata_id,
			notes,
			approved_by,
			approved_at,
			created_at,
			updated_at,
			user:profiles!time_entries_user_id_fkey(id, full_name, email),
			project:projects(name, project_number),
			phase:phases(name)
		`)
		.eq('org_id', effectiveOrgId);
		// TODO: Uncomment after applying soft delete migration
		// .is('deleted_at', null) // Exclude soft-deleted entries
	query = query.gte('start_at', effectivePeriodStart.toISOString())
		.lte('start_at', effectivePeriodEnd.toISOString())
		.order('start_at', { ascending: false });

	if (status !== 'all') {
		query = query.eq('status', status);
	}

	const { data, error } = await query;

	if (error) {
		console.error('Error fetching time entries:', error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	// Ensure user data is always present with fallback to email
	const entriesWithUserData = (data || []).map((entry: any) => {
		if (!entry.user || !entry.user.full_name) {
			// If user profile doesn't exist or has no name, try to get email from auth or use fallback
			return {
				...entry,
				user: {
					...entry.user,
					full_name: entry.user?.email || `Användare ${entry.user_id?.substring(0, 8) || 'Okänd'}`,
					email: entry.user?.email || null,
				},
			};
		}
		return entry;
	});

	return NextResponse.json({ entries: entriesWithUserData });
}

