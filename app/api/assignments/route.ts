import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAssignmentSchema, type Conflict } from '@/lib/schemas/planning';
import { getSession } from '@/lib/auth/get-session'; // EPIC 26: Use cached session

// GET /api/assignments - List assignments with filters
// EPIC 26: Optimized from 2 queries to 1 cached query
export async function GET(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 1 query)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		// Parse query parameters
		const searchParams = request.nextUrl.searchParams;
		const project_id = searchParams.get('project_id');
		const user_id = searchParams.get('user_id');
		const status = searchParams.get('status');
		const start_date = searchParams.get('start_date');
		const end_date = searchParams.get('end_date');

		// Build query
		let query = supabase
			.from('assignments')
			.select(`
				*,
				project:projects(id, name, project_number, color, client_name),
				user:profiles!assignments_user_id_fkey(id, full_name, email),
				mobile_notes(*)
			`)
			.eq('org_id', membership.org_id)
			.order('start_ts', { ascending: false });

		// Apply filters
		if (project_id) query = query.eq('project_id', project_id);
		if (user_id) query = query.eq('user_id', user_id);
		if (status) query = query.eq('status', status);
		if (start_date) query = query.gte('start_ts', start_date);
		if (end_date) query = query.lte('start_ts', end_date);

		const { data: assignments, error } = await query;

		if (error) {
			console.error('Error fetching assignments:', error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ assignments }, { status: 200 });
	} catch (error) {
		console.error('Error in GET /api/assignments:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

// POST /api/assignments - Create new assignment(s) with multi-assign support
// EPIC 26: Optimized from 2 queries to 1 cached query
export async function POST(request: NextRequest) {
	try {
		// EPIC 26: Use cached session (saves 1 query)
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = await createClient();

		// Check permissions (admin/foreman only)
		if (!['admin', 'foreman', 'finance'].includes(membership.role)) {
			return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validation = createAssignmentSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json({ 
				error: 'Validation error', 
				details: validation.error.format() 
			}, { status: 400 });
		}

		const data = validation.data;

		// Verify project belongs to user's organization
		const { data: project, error: projectError } = await supabase
			.from('projects')
			.select('id')
			.eq('id', data.project_id)
			.eq('org_id', membership.org_id)
			.single();

		if (projectError || !project) {
			return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
		}

		// Check for conflicts unless force override
		// PERFORMANCE FIX: Batch conflict checking instead of N+1 pattern
		// OLD: Loop through users, 2 queries per user = 10+ queries for 5 users
		// NEW: Batch check all users at once = 2 queries total (80% faster!)
		const conflicts: Conflict[] = [];
		
		if (!data.force) {
			// Batch check: Get ALL users' overlapping assignments in ONE query
			const { data: overlapping } = await supabase
				.from('assignments')
				.select('id, user_id, project:projects(name)')
				.in('user_id', data.user_ids)  // Check all users at once!
				.eq('org_id', membership.org_id)
				.neq('status', 'cancelled')
				.or(`and(start_ts.lte.${data.end_ts},end_ts.gte.${data.start_ts})`);

			// Batch check: Get ALL users' absences in ONE query
			const { data: absences } = await supabase
				.from('absences')
				.select('id, type, user_id')
				.in('user_id', data.user_ids)  // Check all users at once!
				.eq('org_id', membership.org_id)
				.or(`and(start_ts.lte.${data.end_ts},end_ts.gte.${data.start_ts})`);

			// Group results by user_id (fast client-side operation)
			const conflictsByUser: Record<string, any[]> = {};
			
			// Process overlapping assignments
			if (overlapping && overlapping.length > 0) {
				overlapping.forEach((assignment: any) => {
					if (!conflictsByUser[assignment.user_id]) {
						conflictsByUser[assignment.user_id] = [];
					}
					conflictsByUser[assignment.user_id].push({
						type: 'overlap',
						projectName: assignment.project?.name || 'Okänt projekt',
					});
				});
			}

			// Process absences
			if (absences && absences.length > 0) {
				absences.forEach((absence: any) => {
					if (!conflictsByUser[absence.user_id]) {
						conflictsByUser[absence.user_id] = [];
					}
					const absenceType = {
						'vacation': 'Semester',
						'sick': 'Sjuk',
						'training': 'Utbildning',
					}[absence.type] || absence.type;
					
					conflictsByUser[absence.user_id].push({
						type: 'absence',
						absenceType,
					});
				});
			}

			// Build conflicts array from grouped results
			Object.entries(conflictsByUser).forEach(([userId, userConflicts]) => {
				const overlapConflicts = userConflicts.filter(c => c.type === 'overlap');
				const absenceConflicts = userConflicts.filter(c => c.type === 'absence');

				if (overlapConflicts.length > 0) {
					const projectNames = overlapConflicts.map(c => c.projectName).join(', ');
					conflicts.push({
						user_id: userId,
						type: 'overlap',
						details: `Användaren har redan uppdrag: ${projectNames}`,
					});
				}

				if (absenceConflicts.length > 0) {
					const absenceTypes = absenceConflicts.map(c => c.absenceType).join(', ');
					conflicts.push({
						user_id: userId,
						type: 'absence',
						details: `Användaren är frånvarande: ${absenceTypes}`,
					});
				}
			});

			// If conflicts exist, return 409
			if (conflicts.length > 0) {
				return NextResponse.json({ 
					created: [], 
					conflicts 
				}, { status: 409 });
			}
		}

		// Create assignments (one per user)
		const createdIds: string[] = [];
		const assignmentsToInsert = data.user_ids.map(userId => ({
			org_id: membership.org_id,
			project_id: data.project_id,
			user_id: userId,
			start_ts: data.start_ts,
			end_ts: data.end_ts,
			all_day: data.all_day,
			address: data.address,
			note: data.note,
			sync_to_mobile: data.sync_to_mobile,
			status: 'planned',
			created_by: user.id,
		}));

		const { data: created, error: insertError } = await supabase
			.from('assignments')
			.insert(assignmentsToInsert)
			.select('id');

		if (insertError) {
			console.error('Error creating assignments:', insertError);
			return NextResponse.json({ error: insertError.message }, { status: 500 });
		}

		createdIds.push(...(created?.map(a => a.id) || []));

		// Log override if forced
		if (data.force && data.override_comment) {
			await supabase
				.from('audit_log')
				.insert({
					org_id: membership.org_id,
					user_id: user.id,
					action: 'assignment_conflict_override',
					entity_type: 'assignments',
					entity_id: createdIds[0], // Reference first assignment
					new_data: {
						comment: data.override_comment,
						conflicts: conflicts,
					},
				});
		}

		return NextResponse.json({ 
			created: createdIds, 
			conflicts: [] 
		}, { status: 201 });
	} catch (error) {
		console.error('Error in POST /api/assignments:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

