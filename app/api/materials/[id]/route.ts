import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateMaterialSchema } from '@/lib/schemas/material';

// PATCH /api/materials/[id] - Update material
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		const body = await request.json();
		const validation = updateMaterialSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		// Check if material exists and user has permission
		const { data: existingMaterial, error: fetchError } = await supabase
			.from('materials')
			.select('id, user_id, org_id, status')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingMaterial) {
			return NextResponse.json({ error: 'Material not found' }, { status: 404 });
		}

		// Finance users have read-only access
		if (membership.role === 'finance') {
			return NextResponse.json({ error: 'Finance users cannot edit materials' }, { status: 403 });
		}

		if (membership.role === 'worker' && existingMaterial.user_id !== user.id) {
			return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
		}

		if (existingMaterial.status === 'approved' && membership.role !== 'admin') {
			return NextResponse.json({ error: 'Cannot edit approved materials' }, { status: 403 });
		}

		const { data: material, error: updateError } = await supabase
			.from('materials')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select(`
				*,
				project:projects(id, name, project_number),
				phase:phases(id, name)
			`)
			.single();

		if (updateError) {
			console.error('Error updating material:', updateError);
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		return NextResponse.json({ material }, { status: 200 });
	} catch (error) {
		console.error('Error in PATCH /api/materials/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// DELETE /api/materials/[id] - Delete material
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const supabase = await createClient();
		const { data: { user }, error: authError } = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { data: membership } = await supabase
			.from('memberships')
			.select('org_id, role')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single();

		if (!membership) {
			return NextResponse.json({ error: 'No active organization membership' }, { status: 403 });
		}

		const { data: existingMaterial, error: fetchError } = await supabase
			.from('materials')
			.select('id, user_id, org_id, status')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingMaterial) {
			return NextResponse.json({ error: 'Material not found' }, { status: 404 });
		}

		// Finance users have read-only access
		if (membership.role === 'finance') {
			return NextResponse.json({ error: 'Finance users cannot delete materials' }, { status: 403 });
		}

		if (membership.role === 'worker' && existingMaterial.user_id !== user.id) {
			return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
		}

		if (existingMaterial.status === 'approved' && membership.role !== 'admin') {
			return NextResponse.json({ error: 'Cannot delete approved materials' }, { status: 403 });
		}

		const { error: deleteError } = await supabase
			.from('materials')
			.delete()
			.eq('id', id);

		if (deleteError) {
			console.error('Error deleting material:', deleteError);
			return NextResponse.json({ error: deleteError.message }, { status: 500 });
		}

		return NextResponse.json({ message: 'Material deleted' }, { status: 200 });
	} catch (error) {
		console.error('Error in DELETE /api/materials/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

