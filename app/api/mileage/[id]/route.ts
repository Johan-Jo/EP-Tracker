import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateMileageSchema } from '@/lib/schemas/mileage';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

type RouteParams = { id: string };

// PATCH /api/mileage/[id]
export async function PATCH(
	request: NextRequest,
	context: RouteContext<RouteParams>
) {
	try {
		const { id } = await resolveRouteParams(context);
		if (!id) {
			return NextResponse.json({ error: 'Mileage id is required' }, { status: 400 });
		}
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
		const validation = updateMileageSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		const { data: existingMileage, error: fetchError } = await supabase
			.from('mileage')
			.select('id, user_id, org_id, status')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingMileage) {
			return NextResponse.json({ error: 'Mileage not found' }, { status: 404 });
		}

		// Finance users have read-only access
		if (membership.role === 'finance') {
			return NextResponse.json({ error: 'Finance users cannot edit mileage' }, { status: 403 });
		}

		if ((membership.role === 'worker' || membership.role === 'ue') && existingMileage.user_id !== user.id) {
			return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
		}

		if (existingMileage.status === 'approved' && membership.role !== 'admin') {
			return NextResponse.json({ error: 'Cannot edit approved mileage' }, { status: 403 });
		}

		const { data: mileage, error: updateError } = await supabase
			.from('mileage')
			.update({
				...data,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id)
			.select(`
				*,
				project:projects(id, name, project_number)
			`)
			.single();

		if (updateError) {
			console.error('Error updating mileage:', updateError);
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		return NextResponse.json({ mileage }, { status: 200 });
	} catch (error) {
		console.error('Error in PATCH /api/mileage/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// DELETE /api/mileage/[id]
export async function DELETE(
	request: NextRequest,
	context: RouteContext<RouteParams>
) {
	try {
		const { id } = await resolveRouteParams(context);
		if (!id) {
			return NextResponse.json({ error: 'Mileage id is required' }, { status: 400 });
		}
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

		const { data: existingMileage, error: fetchError } = await supabase
			.from('mileage')
			.select('id, user_id, org_id, status')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingMileage) {
			return NextResponse.json({ error: 'Mileage not found' }, { status: 404 });
		}

		// Finance users have read-only access
		if (membership.role === 'finance') {
			return NextResponse.json({ error: 'Finance users cannot delete mileage' }, { status: 403 });
		}

		if ((membership.role === 'worker' || membership.role === 'ue') && existingMileage.user_id !== user.id) {
			return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
		}

		if (existingMileage.status === 'approved' && membership.role !== 'admin') {
			return NextResponse.json({ error: 'Cannot delete approved mileage' }, { status: 403 });
		}

		const { error: deleteError } = await supabase
			.from('mileage')
			.delete()
			.eq('id', id);

		if (deleteError) {
			console.error('Error deleting mileage:', deleteError);
			return NextResponse.json({ error: deleteError.message }, { status: 500 });
		}

		return NextResponse.json({ message: 'Mileage deleted' }, { status: 200 });
	} catch (error) {
		console.error('Error in DELETE /api/mileage/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

