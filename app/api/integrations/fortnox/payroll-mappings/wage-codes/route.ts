import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * GET /api/integrations/fortnox/payroll-mappings/wage-codes
 * Returns all wage code mappings for the current user's org
 */
export async function GET() {
	try {
		const { membership } = await getSession();

		if (!membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can view wage mappings
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const supabase = await createClient();

		const { data: mappings, error } = await supabase
			.from('fortnox_wage_code_mappings')
			.select('*')
			.eq('org_id', membership.org_id)
			.order('ep_wage_type', { ascending: true });

		if (error) {
			console.error('[Fortnox Wage Mappings] Error fetching mappings:', error);
			return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
		}

		return NextResponse.json({ mappings: mappings || [] });
	} catch (error) {
		console.error('[Fortnox Wage Mappings] Error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

/**
 * PUT /api/integrations/fortnox/payroll-mappings/wage-codes
 * Upserts wage code mappings for the org
 */
export async function PUT(request: NextRequest) {
	try {
		const { membership, user } = await getSession();

		if (!membership || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can manage wage mappings
		if (!['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json().catch(() => ({}));
		const { mappings } = body as {
			mappings: Array<{
				id?: string;
				ep_wage_type: string;
				fortnox_salary_code: string;
				description?: string;
				is_active?: boolean;
			}>;
		};

		if (!Array.isArray(mappings)) {
			return NextResponse.json(
				{ error: 'mappings must be an array', code: 'INVALID_INPUT' },
				{ status: 400 }
			);
		}

		// Valid EP-Tracker wage types (from export-payroll.ts)
		const VALID_WAGE_TYPES = ['normal', 'overtime', 'ob'];

		// Validate each mapping
		for (const mapping of mappings) {
			if (!mapping.ep_wage_type || typeof mapping.ep_wage_type !== 'string') {
				return NextResponse.json(
					{ error: 'ep_wage_type is required', code: 'INVALID_INPUT' },
					{ status: 400 }
				);
			}

			if (!VALID_WAGE_TYPES.includes(mapping.ep_wage_type)) {
				return NextResponse.json(
					{
						error: `Invalid ep_wage_type: ${mapping.ep_wage_type}. Must be one of: ${VALID_WAGE_TYPES.join(', ')}`,
						code: 'INVALID_WAGE_TYPE',
					},
					{ status: 400 }
				);
			}

			if (!mapping.fortnox_salary_code || typeof mapping.fortnox_salary_code !== 'string') {
				return NextResponse.json(
					{ error: `fortnox_salary_code is required for ${mapping.ep_wage_type}`, code: 'INVALID_INPUT' },
					{ status: 400 }
				);
			}

			// Trim whitespace
			mapping.fortnox_salary_code = mapping.fortnox_salary_code.trim();
			if (!mapping.fortnox_salary_code) {
				return NextResponse.json(
					{ error: `fortnox_salary_code cannot be empty for ${mapping.ep_wage_type}`, code: 'INVALID_INPUT' },
					{ status: 400 }
				);
			}
		}

		const supabase = await createClient();

		// Upsert mappings (one by one to handle unique constraint on org_id + ep_wage_type)
		const upsertedMappings = [];

		for (const mapping of mappings) {
			const upsertData = {
				org_id: membership.org_id,
				ep_wage_type: mapping.ep_wage_type,
				fortnox_salary_code: mapping.fortnox_salary_code.trim(),
				description: mapping.description?.trim() || null,
				is_active: mapping.is_active !== undefined ? mapping.is_active : true,
			};

			const { data: upserted, error: upsertError } = await supabase
				.from('fortnox_wage_code_mappings')
				.upsert(upsertData, {
					onConflict: 'org_id,ep_wage_type',
					returning: true,
				})
				.select()
				.single();

			if (upsertError) {
				console.error('[Fortnox Wage Mappings] Error upserting mapping:', upsertError);
				return NextResponse.json(
					{ error: `Failed to save mapping for ${mapping.ep_wage_type}`, code: 'UPSERT_ERROR' },
					{ status: 500 }
				);
			}

			upsertedMappings.push(upserted);
		}

		return NextResponse.json({ mappings: upsertedMappings });
	} catch (error) {
		console.error('[Fortnox Wage Mappings] Error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
