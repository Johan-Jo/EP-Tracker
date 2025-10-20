import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
	const supabase = await createClient();
	const { searchParams } = new URL(request.url);
	const projectId = searchParams.get('project_id');

	const { data: { user }, error: authError } = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		let query = supabase
			.from('checklists')
			.select(`
				*,
				project:projects(name, project_number),
				template:checklist_templates(name, category),
				created_by_user:profiles!checklists_created_by_fkey(full_name)
			`)
			.order('created_at', { ascending: false });

		if (projectId) {
			query = query.eq('project_id', projectId);
		}

		const { data, error } = await query;

		if (error) throw error;

		return NextResponse.json({ checklists: data });
	} catch (error) {
		console.error('Error fetching checklists:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch checklists' },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	const supabase = await createClient();

	const { data: { user }, error: authError } = await supabase.auth.getUser();

	if (authError || !user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { project_id, template_id, title, checklist_data, completed_at, signed_by_name, signed_at } = body;

		// Get user's org_id from membership
		const { data: membership, error: membershipError } = await supabase
			.from('memberships')
			.select('org_id')
			.eq('user_id', user.id)
			.single();

		if (membershipError || !membership) {
			return NextResponse.json({ error: 'No organization found' }, { status: 400 });
		}

		const checklistData = {
			org_id: membership.org_id,
			project_id,
			template_id: template_id || null,
			title,
			checklist_data,
			created_by: user.id,
			completed_at: completed_at || null,
			signed_by_name: signed_by_name || null,
			signed_at: signed_at || null,
		};

		const { data, error } = await supabase
			.from('checklists')
			.insert(checklistData)
			.select()
			.single();

		if (error) throw error;

		return NextResponse.json({ checklist: data }, { status: 201 });
	} catch (error) {
		console.error('Error creating checklist:', error);
		return NextResponse.json(
			{ error: 'Failed to create checklist' },
			{ status: 500 }
		);
	}
}

