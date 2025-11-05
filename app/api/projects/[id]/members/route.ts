import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';

// Get project members
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		
		// Use cached session (saves 1 query)
		const { user } = await getSession();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		// Get project members with profile info
		const { data: members, error } = await supabase
			.from('project_members')
			.select(`
				id,
				user_id,
				created_at,
				assigned_by,
				profiles:user_id (
					id,
					full_name,
					email,
					phone
				)
			`)
			.eq('project_id', id)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching project members:', error);
			return NextResponse.json({ error: 'Failed to fetch project members' }, { status: 500 });
		}

		return NextResponse.json({ members });
	} catch (error) {
		console.error('Error in GET /api/projects/[id]/members:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

const addMemberSchema = z.object({
	user_id: z.string().uuid(),
});

// Add member to project
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Verify user is foreman or admin for this project's org
		const { data: project } = await supabase
			.from('projects')
			.select('org_id')
			.eq('id', id)
			.single();

		if (!project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		const { data: membership } = await supabase
			.from('memberships')
			.select('role')
			.eq('user_id', user.id)
			.eq('org_id', project.org_id)
			.eq('is_active', true)
			.single();

		if (!membership || !['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Only admins and foremen can manage project members' },
				{ status: 403 }
			);
		}

		// Validate request body
		const body = await request.json();
		const validatedData = addMemberSchema.parse(body);

		// Verify the user being added is in the same org
		const { data: targetMember } = await supabase
			.from('memberships')
			.select('id')
			.eq('user_id', validatedData.user_id)
			.eq('org_id', project.org_id)
			.eq('is_active', true)
			.single();

		if (!targetMember) {
			return NextResponse.json(
				{ error: 'User not found in organization' },
				{ status: 404 }
			);
		}

		// Add member to project
		const { data: newMember, error: insertError } = await supabase
			.from('project_members')
			.insert({
				project_id: id,
				user_id: validatedData.user_id,
				assigned_by: user.id,
			})
			.select(`
				id,
				user_id,
				created_at,
				assigned_by,
				profiles:user_id (
					id,
					full_name,
					email
				)
			`)
			.single();

		if (insertError) {
			if (insertError.code === '23505') {
				// Unique constraint violation
				return NextResponse.json(
					{ error: 'User is already a member of this project' },
					{ status: 400 }
				);
			}
			console.error('Error adding project member:', insertError);
			return NextResponse.json({ error: 'Failed to add project member' }, { status: 500 });
		}

		return NextResponse.json({ member: newMember }, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
		}

		console.error('Error in POST /api/projects/[id]/members:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// Remove member from project
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const supabase = await createClient();

		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user_id from query params
		const url = new URL(request.url);
		const userId = url.searchParams.get('user_id');

		if (!userId) {
			return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
		}

		// Verify user is foreman or admin for this project's org
		const { data: project } = await supabase
			.from('projects')
			.select('org_id')
			.eq('id', id)
			.single();

		if (!project) {
			return NextResponse.json({ error: 'Project not found' }, { status: 404 });
		}

		const { data: membership } = await supabase
			.from('memberships')
			.select('role')
			.eq('user_id', user.id)
			.eq('org_id', project.org_id)
			.eq('is_active', true)
			.single();

		if (!membership || !['admin', 'foreman'].includes(membership.role)) {
			return NextResponse.json(
				{ error: 'Only admins and foremen can manage project members' },
				{ status: 403 }
			);
		}

		// Remove member from project
		const { error: deleteError } = await supabase
			.from('project_members')
			.delete()
			.eq('project_id', id)
			.eq('user_id', userId);

		if (deleteError) {
			console.error('Error removing project member:', deleteError);
			return NextResponse.json({ error: 'Failed to remove project member' }, { status: 500 });
		}

		return NextResponse.json({ message: 'Member removed successfully' });
	} catch (error) {
		console.error('Error in DELETE /api/projects/[id]/members:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

