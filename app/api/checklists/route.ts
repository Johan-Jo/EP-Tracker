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

		// Map database column names to expected API format
		const checklists = data.map((checklist: any) => ({
			...checklist,
			title: checklist.name,  // Map 'name' to 'title'
			signed_by_name: checklist.signature_name,  // Map 'signature_name' to 'signed_by_name'
			signed_at: checklist.signature_timestamp,  // Map 'signature_timestamp' to 'signed_at'
		}));

		return NextResponse.json({ checklists });
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
			name: title,  // Changed from 'title' to 'name'
			checklist_data,
			created_by: user.id,
			completed_at: completed_at || null,
			signature_name: signed_by_name || null,  // Changed from 'signed_by_name' to 'signature_name'
			signature_timestamp: signed_at || null,  // Changed from 'signed_at' to 'signature_timestamp'
		};

		const { data, error } = await supabase
			.from('checklists')
			.insert(checklistData)
			.select()
			.single();

		if (error) throw error;

		// Map database column names to expected API format
		const checklist = {
			...data,
			title: data.name,
			signed_by_name: data.signature_name,
			signed_at: data.signature_timestamp,
		};

		return NextResponse.json({ checklist }, { status: 201 });
	} catch (error: any) {
		console.error('Error creating checklist:', error);
		
		// Return more specific error messages
		let errorMessage = 'Failed to create checklist';
		
		if (error?.code === '23503') {
			errorMessage = 'Ogiltigt projekt eller mall vald';
		} else if (error?.code === '23505') {
			errorMessage = 'En checklista med detta namn finns redan';
		} else if (error?.message) {
			errorMessage = error.message;
		}
		
		return NextResponse.json(
			{ error: errorMessage },
			{ status: 500 }
		);
	}
}

