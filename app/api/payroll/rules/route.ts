import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * GET /api/payroll/rules
 * Get payroll rules for the current organization
 */
export async function GET() {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin can view/edit payroll rules
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const supabase = await createClient();

		const { data: rules, error } = await supabase
			.from('payroll_rules')
			.select('*')
			.eq('org_id', membership.org_id)
			.single();

		if (error && error.code !== 'PGRST116') {
			// PGRST116 means no rows found (expected if not configured yet)
			console.error('Error fetching payroll rules:', error);
			return NextResponse.json({ error: 'Failed to fetch payroll rules' }, { status: 500 });
		}

		// Return default rules if not configured
		if (!rules) {
			return NextResponse.json({
				rules: {
					normal_hours_threshold: 40,
					auto_break_duration: 30,
					auto_break_after_hours: 6.0,
					overtime_multiplier: 1.5,
					ob_rates: {
						night: 1.2,
						weekend: 1.5,
						holiday: 2.0,
					},
				},
			});
		}

		return NextResponse.json({ rules });
	} catch (error) {
		console.error('Error in GET /api/payroll/rules:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * POST /api/payroll/rules
 * Create or update payroll rules for the current organization
 */
export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin can manage payroll rules
		if (membership.role !== 'admin') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const {
			normal_hours_threshold,
			auto_break_duration,
			auto_break_after_hours,
			overtime_multiplier,
			ob_rates,
		} = body;

		// Validate required fields
		if (
			normal_hours_threshold === undefined ||
			auto_break_duration === undefined ||
			auto_break_after_hours === undefined ||
			overtime_multiplier === undefined ||
			!ob_rates
		) {
			return NextResponse.json(
				{ error: 'All fields are required' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Upsert payroll rules
		const { data: rules, error } = await supabase
			.from('payroll_rules')
			.upsert(
				{
					org_id: membership.org_id,
					normal_hours_threshold: Number(normal_hours_threshold),
					auto_break_duration: Number(auto_break_duration),
					auto_break_after_hours: Number(auto_break_after_hours),
					overtime_multiplier: Number(overtime_multiplier),
					ob_rates: ob_rates,
				},
				{
					onConflict: 'org_id',
				}
			)
			.select()
			.single();

		if (error) {
			console.error('Error upserting payroll rules:', error);
			return NextResponse.json({ error: 'Failed to save payroll rules' }, { status: 500 });
		}

		return NextResponse.json({ rules });
	} catch (error) {
		console.error('Error in POST /api/payroll/rules:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

