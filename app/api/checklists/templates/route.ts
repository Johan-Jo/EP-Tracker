import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
	const supabase = await createClient();

	const { data: { user }, error: authError } = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Get user's org_id
		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id')
			.eq('user_id', user.id)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No organization found' }, { status: 400 });
		}

		// Fetch public templates and org templates
		const { data, error } = await supabase
			.from('checklist_templates')
			.select('*')
			.or(`is_public.eq.true,org_id.eq.${membership.org_id}`)
			.order('category')
			.order('name');

		if (error) throw error;

		return NextResponse.json({ templates: data });
	} catch (error) {
		console.error('Error fetching checklist templates:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch templates' },
			{ status: 500 }
		);
	}
}

