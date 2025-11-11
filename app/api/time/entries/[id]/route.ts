import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateTimeEntrySchema } from '@/lib/schemas/time-entry';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session
import { notifyOnCheckOut } from '@/lib/notifications/project-alerts'; // EPIC 25 Phase 2: Project alerts
import { resolveRouteParams, type RouteContext } from '@/lib/utils/route-params';

const MAX_MINUTES_PER_DAY = 24 * 60;

function calculateDurationMinutes(startISO: string, stopISO?: string | null, fallbackMinutes?: number | null) {
	if (!stopISO) return 0;
	const start = new Date(startISO);
	const stop = new Date(stopISO);
	const diff = stop.getTime() - start.getTime();
	if (Number.isNaN(diff) || diff <= 0) {
		return Math.max(0, fallbackMinutes ?? 0);
	}
	return Math.round(diff / 60000);
}

// PATCH /api/time/entries/[id] - Update time entry
// EPIC 26: Optimized from 4 queries to 2 queries
type RouteParams = { id: string };

export async function PATCH(
	request: NextRequest,
	context: RouteContext<RouteParams>
) {
	try {
		const { id } = await resolveRouteParams(context);
		if (!id) {
			return NextResponse.json({ error: 'Time entry id is required' }, { status: 400 });
		}
		
		// EPIC 26: Use cached session (saves 2 queries)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validation = updateTimeEntrySchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		const supabase = await createClient();

		// EPIC 26: Fetch and check permissions in one query
		const { data: existingEntry, error: fetchError } = await supabase
			.from('time_entries')
			.select('id, user_id, org_id, status, start_at, stop_at, project_id, billing_type, fixed_block_id, ata_id')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingEntry) {
			return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
		}

		// Finance users have read-only access
		if (membership.role === 'finance') {
			return NextResponse.json({ error: 'Finance users cannot edit time entries' }, { status: 403 });
		}

		// Only allow editing own entries (unless admin/foreman)
		if (membership.role === 'worker' && existingEntry.user_id !== user.id) {
			return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
		}

		// Prevent editing approved entries (unless admin)
		if (existingEntry.status === 'approved' && membership.role !== 'admin') {
			return NextResponse.json({ error: 'Cannot edit approved time entries' }, { status: 403 });
		}

		const nextStartAt = data.start_at ?? existingEntry.start_at;
		const nextStopAt = data.stop_at ?? existingEntry.stop_at;

		if (nextStopAt) {
			const newEntryMinutes = calculateDurationMinutes(nextStartAt, nextStopAt);

			if (newEntryMinutes > MAX_MINUTES_PER_DAY) {
				return NextResponse.json(
					{ error: 'En användare kan inte registrera mer än 24 timmar på ett dygn.' },
					{ status: 400 },
				);
			}

			const dayStart = new Date(nextStartAt);
			dayStart.setHours(0, 0, 0, 0);
			const dayEnd = new Date(dayStart);
			dayEnd.setDate(dayEnd.getDate() + 1);

			const { data: otherEntries, error: dayError } = await supabase
				.from('time_entries')
				.select('id, start_at, stop_at, duration_min')
				.eq('org_id', membership.org_id)
				.eq('user_id', existingEntry.user_id)
				.gte('start_at', dayStart.toISOString())
				.lt('start_at', dayEnd.toISOString())
				.neq('id', id);

			if (dayError) {
				return NextResponse.json({ error: dayError.message }, { status: 500 });
			}

			const accumulatedMinutes =
				(otherEntries || []).reduce((sum, entry) => {
					return (
						sum +
						calculateDurationMinutes(entry.start_at, entry.stop_at, entry.duration_min ?? 0)
					);
				}, 0) + newEntryMinutes;

			if (accumulatedMinutes > MAX_MINUTES_PER_DAY) {
				return NextResponse.json(
					{ error: 'Summan av registrerad arbetstid får inte överstiga 24 timmar för samma dag.' },
					{ status: 400 },
				);
			}
		}

		// EPIC 26: Update time entry without JOINs for maximum speed
		// Client already has project/phase data, just return updated entry
		// Only include fields that are actually provided in the update
		const updateFields: Record<string, any> = {
			updated_at: new Date().toISOString(),
		};
		
		// Only add fields that are defined in the request
		if (data.project_id !== undefined) updateFields.project_id = data.project_id;
		if (data.phase_id !== undefined) updateFields.phase_id = data.phase_id;
		if (data.work_order_id !== undefined) updateFields.work_order_id = data.work_order_id;
		if (data.task_label !== undefined) updateFields.task_label = data.task_label;
		if (data.start_at !== undefined) updateFields.start_at = data.start_at;
		if (data.stop_at !== undefined) updateFields.stop_at = data.stop_at;
		if (data.notes !== undefined) updateFields.notes = data.notes;
		if (data.status !== undefined) updateFields.status = data.status;
		if (data.billing_type !== undefined) {
			updateFields.billing_type = data.billing_type;
			updateFields.fixed_block_id =
				data.billing_type === 'FAST' ? data.fixed_block_id ?? existingEntry.fixed_block_id ?? null : null;
			updateFields.ata_id = data.billing_type === 'FAST' ? data.ata_id ?? existingEntry.ata_id ?? null : null;
		} else if (data.fixed_block_id !== undefined) {
			const effectiveType = data.billing_type ?? existingEntry.billing_type ?? 'LOPANDE';
			updateFields.fixed_block_id =
				effectiveType === 'FAST' ? data.fixed_block_id : null;
		}
		if (data.ata_id !== undefined) {
			updateFields.ata_id = data.ata_id;
		}
		
		const { data: entry, error: updateError } = await supabase
			.from('time_entries')
			.update(updateFields)
			.eq('id', id)
			.select('*')
			.single();

		if (updateError) {
			console.error('Error updating time entry:', updateError);
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		// EPIC 25 Phase 2: Notify admin/foreman when someone checks out
		// Detect check-out: entry had no stop_at but now it does
		if (!existingEntry.stop_at && entry.stop_at && entry.project_id) {
			// Get user's full name for notification
			const { data: profile } = await supabase
				.from('profiles')
				.select('full_name')
				.eq('id', entry.user_id)
				.single();

			// Calculate hours worked
			const startTime = new Date(entry.start_at).getTime();
			const stopTime = new Date(entry.stop_at).getTime();
			const hoursWorked = (stopTime - startTime) / (1000 * 60 * 60); // Convert ms to hours

			try {
				await notifyOnCheckOut({
					projectId: entry.project_id,
					userId: entry.user_id,
					userName: profile?.full_name || 'Okänd användare',
					checkoutTime: new Date(entry.stop_at),
					hoursWorked,
				});
			} catch (error) {
				// Don't fail the request if notification fails
				console.error('Failed to send check-out notification:', error);
			}
		}

		return NextResponse.json({ entry }, { status: 200 });
	} catch (error) {
		console.error('Error in PATCH /api/time/entries/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// DELETE /api/time/entries/[id] - Delete time entry
// EPIC 26: Optimized from 4 queries to 2 queries
export async function DELETE(
	request: NextRequest,
	context: RouteContext<RouteParams>
) {
	try {
		const { id } = await resolveRouteParams(context);
		if (!id) {
			return NextResponse.json({ error: 'Time entry id is required' }, { status: 400 });
		}
		
		// EPIC 26: Use cached session (saves 2 queries)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		// Check if entry exists and user has permission
		const { data: existingEntry, error: fetchError } = await supabase
			.from('time_entries')
			.select('id, user_id, org_id, status')
			.eq('id', id)
			.eq('org_id', membership.org_id)
			.single();

		if (fetchError || !existingEntry) {
			return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
		}

		// Finance users have read-only access
		if (membership.role === 'finance') {
			return NextResponse.json({ error: 'Finance users cannot delete time entries' }, { status: 403 });
		}

		// Only allow deleting own entries (unless admin/foreman)
		if (membership.role === 'worker' && existingEntry.user_id !== user.id) {
			return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
		}

		// Prevent deleting approved entries (unless admin)
		if (existingEntry.status === 'approved' && membership.role !== 'admin') {
			return NextResponse.json({ error: 'Cannot delete approved time entries' }, { status: 403 });
		}

		// Delete time entry
		const { error: deleteError } = await supabase
			.from('time_entries')
			.delete()
			.eq('id', id);

		if (deleteError) {
			console.error('Error deleting time entry:', deleteError);
			return NextResponse.json({ error: deleteError.message }, { status: 500 });
		}

		return NextResponse.json({ message: 'Time entry deleted' }, { status: 200 });
	} catch (error) {
		console.error('Error in DELETE /api/time/entries/[id]:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

