import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateExpenseSchema } from '@/lib/schemas/expense';
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

type RouteParams = { id: string };

// PATCH /api/expenses/[id]
export async function PATCH(
	request: NextRequest,
	context: RouteContext<RouteParams>
) {
	try {
		const { id } = await resolveRouteParams(context);
		if (!id) {
			return NextResponse.json({ error: 'Expense id is required' }, { status: 400 });
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
		const validation = updateExpenseSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		const { data: existingExpense, error: fetchError } = await supabase
			.from('expenses')
			.select('id, user_id, org_id, status')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingExpense) {
			return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
		}

		// Finance users have read-only access
		if (membership.role === 'finance') {
			return NextResponse.json({ error: 'Finance users cannot edit expenses' }, { status: 403 });
		}

		if ((membership.role === 'worker' || membership.role === 'ue') && existingExpense.user_id !== user.id) {
			return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
		}

		if (existingExpense.status === 'approved' && membership.role !== 'admin') {
			return NextResponse.json({ error: 'Cannot edit approved expenses' }, { status: 403 });
		}

		const { data: expense, error: updateError } = await supabase
			.from('expenses')
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
			console.error('Error updating expense:', updateError);
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		return NextResponse.json({ expense }, { status: 200 });
	} catch (error) {
		console.error('Error in PATCH /api/expenses/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// DELETE /api/expenses/[id]
export async function DELETE(
	request: NextRequest,
	context: RouteContext<RouteParams>
) {
	try {
		const { id } = await resolveRouteParams(context);
		if (!id) {
			return NextResponse.json({ error: 'Expense id is required' }, { status: 400 });
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

		const { data: existingExpense, error: fetchError } = await supabase
			.from('expenses')
			.select('id, user_id, org_id, status')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingExpense) {
			return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
		}

		// Finance users have read-only access
		if (membership.role === 'finance') {
			return NextResponse.json({ error: 'Finance users cannot delete expenses' }, { status: 403 });
		}

		if ((membership.role === 'worker' || membership.role === 'ue') && existingExpense.user_id !== user.id) {
			return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
		}

		if (existingExpense.status === 'approved' && membership.role !== 'admin') {
			return NextResponse.json({ error: 'Cannot delete approved expenses' }, { status: 403 });
		}

		const { error: deleteError } = await supabase
			.from('expenses')
			.delete()
			.eq('id', id);

		if (deleteError) {
			console.error('Error deleting expense:', deleteError);
			return NextResponse.json({ error: deleteError.message }, { status: 500 });
		}

		return NextResponse.json({ message: 'Expense deleted' }, { status: 200 });
	} catch (error) {
		console.error('Error in DELETE /api/expenses/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

