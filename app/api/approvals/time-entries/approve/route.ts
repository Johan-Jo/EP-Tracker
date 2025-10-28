import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';
import { sendApprovalConfirmed } from '@/lib/notifications'; // EPIC 25: Push notifications

export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can approve
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { entry_ids } = await request.json();

		if (!entry_ids || !Array.isArray(entry_ids) || entry_ids.length === 0) {
			return NextResponse.json(
				{ error: 'entry_ids array is required' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Update all entries to approved
		const { data, error } = await supabase
			.from('time_entries')
			.update({
				status: 'approved',
				approved_by: user.id,
				approved_at: new Date().toISOString(),
			})
			.in('id', entry_ids)
			.eq('org_id', membership.org_id)
			.select();

		if (error) {
			console.error('Error approving time entries:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		// EPIC 25: Notify users that their time entries are approved
		// Group by user and send one notification per user
		if (data && data.length > 0) {
			const userGroups = data.reduce((acc: Record<string, any[]>, entry) => {
				if (!acc[entry.user_id]) {
					acc[entry.user_id] = [];
				}
				acc[entry.user_id].push(entry);
				return acc;
			}, {});

			// Get approver's name
			const { data: approverProfile } = await supabase
				.from('profiles')
				.select('full_name')
				.eq('id', user.id)
				.single();

			const approverName = approverProfile?.full_name || 'Administrator';

			// Send notification to each user
			Object.entries(userGroups).forEach(([userId, userEntries]) => {
				// Calculate total hours
				const totalHours = userEntries.reduce((sum, entry) => {
					if (entry.start_at && entry.stop_at) {
						const hours = (new Date(entry.stop_at).getTime() - new Date(entry.start_at).getTime()) / (1000 * 60 * 60);
						return sum + hours;
					}
					return sum;
				}, 0);

				// Get week info from first entry
				const firstEntry = userEntries[0];
				const entryDate = new Date(firstEntry.start_at);
				const weekNumber = getWeekNumber(entryDate);
				const year = entryDate.getFullYear();

				sendApprovalConfirmed({
					userId,
					weekNumber,
					year,
					approverName,
					totalHours: Math.round(totalHours * 10) / 10,
				}).catch((error) => {
					console.error('Failed to send approval notification:', error);
				});
			});
		}

		return NextResponse.json({ 
			success: true, 
			approved_count: data?.length || 0 
		});
	} catch (error) {
		console.error('Approval error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
