import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

// GET /api/diary/find?project_id=xxx&date=2025-11-05
// Find diary entry for a specific project and date
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();
		const searchParams = request.nextUrl.searchParams;
		const projectId = searchParams.get('project_id');
		const date = searchParams.get('date');

		if (!projectId || !date) {
			return NextResponse.json(
				{ error: 'project_id and date are required' },
				{ status: 400 }
			);
		}

		// Validate date format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			return NextResponse.json(
				{ error: 'Invalid date format. Must be YYYY-MM-DD' },
				{ status: 400 }
			);
		}

		// Find diary entry for this project and date
		const { data: diaryEntry, error } = await supabase
			.from('diary_entries')
			.select('id')
			.eq('project_id', projectId)
			.eq('date', date)
			.eq('org_id', membership.org_id)
			.single();

		if (error) {
			// If no entry found, return null (not an error)
			if (error.code === 'PGRST116') {
				return NextResponse.json({ diary: null });
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ diary: diaryEntry });
	} catch (error) {
		console.error('Error in GET /api/diary/find:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

