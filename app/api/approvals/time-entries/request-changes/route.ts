import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function POST(request: Request) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can request changes
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { entry_id, feedback } = await request.json();

		if (!entry_id || !feedback) {
			return NextResponse.json(
				{ error: 'entry_id and feedback are required' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Get reviewer name
		const { data: profile } = await supabase
			.from('profiles')
			.select('full_name')
			.eq('id', user.id)
			.single();

		const reviewerName = profile?.full_name || 'Admin';

		// Update entry status to draft and add feedback to notes
		const feedbackNote = `[Feedback från ${reviewerName}]: ${feedback}`;
		
		const { data, error } = await supabase
			.from('time_entries')
			.update({
				status: 'draft',
				notes: feedbackNote,
			})
			.eq('id', entry_id)
			.eq('org_id', membership.org_id)
			.select()
			.single();

		if (error) {
			console.error('Error requesting changes:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ 
			success: true, 
			entry: data 
		});
	} catch (error) {
		console.error('Request changes error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

