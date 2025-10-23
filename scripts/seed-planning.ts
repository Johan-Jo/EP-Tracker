#!/usr/bin/env tsx

/**
 * Seed Planning Data
 * 
 * This script seeds the database with test planning data:
 * - Updates projects with colors and capacity needs
 * - Creates sample assignments
 * - Creates sample absences
 * - Creates shift templates
 * 
 * Usage: npx tsx scripts/seed-planning.ts
 * 
 * Set environment variables before running:
 * $env:NEXT_PUBLIC_SUPABASE_URL="your_url"
 * $env:SUPABASE_SERVICE_ROLE_KEY="your_key"
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Project colors
const PROJECT_COLORS = [
	'#4F46E5', // Indigo
	'#EF4444', // Red
	'#10B981', // Green
	'#F59E0B', // Amber
	'#3B82F6', // Blue
	'#8B5CF6', // Purple
	'#EC4899', // Pink
];

async function main() {
	console.log('🌱 Seeding planning data...\n');

	try {
		// 1. Update existing projects with colors and capacity needs
		console.log('📦 Updating projects with planning data...');
		const { data: projects, error: projectsError } = await supabase
			.from('projects')
			.select('id')
			.limit(5);

		if (projectsError) {
			throw projectsError;
		}

		if (!projects || projects.length === 0) {
			console.log('No projects found. Please create projects first.');
			process.exit(0);
		}

		for (let i = 0; i < projects.length; i++) {
			await supabase
				.from('projects')
				.update({
					color: PROJECT_COLORS[i % PROJECT_COLORS.length],
					daily_capacity_need: Math.floor(Math.random() * 3) + 2, // 2-4 workers
				})
				.eq('id', projects[i].id);
		}
		console.log(`✅ Updated ${projects.length} projects\n`);

		// 2. Get users for assignments
		console.log('👥 Fetching users...');
		const { data: memberships, error: membershipsError } = await supabase
			.from('memberships')
			.select('user_id, org_id')
			.eq('is_active', true)
			.limit(5);

		if (membershipsError) {
			throw membershipsError;
		}

		if (!memberships || memberships.length === 0) {
			console.log('No users found. Please create users first.');
			process.exit(0);
		}

		const orgId = memberships[0].org_id;
		console.log(`✅ Found ${memberships.length} users\n`);

		// 3. Create sample assignments for next week
		console.log('📅 Creating sample assignments...');
		const assignments = [];
		const today = new Date();
		const nextMonday = new Date(today);
		nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7));
		nextMonday.setHours(0, 0, 0, 0);

		for (let dayOffset = 0; dayOffset < 5; dayOffset++) { // Mon-Fri
			const assignmentDate = new Date(nextMonday);
			assignmentDate.setDate(nextMonday.getDate() + dayOffset);

			for (let i = 0; i < Math.min(3, memberships.length); i++) {
				const startDate = new Date(assignmentDate);
				startDate.setHours(7, 0, 0, 0);
				const endDate = new Date(assignmentDate);
				endDate.setHours(16, 0, 0, 0);

				assignments.push({
					org_id: orgId,
					project_id: projects[i % projects.length].id,
					user_id: memberships[i].user_id,
					start_ts: startDate.toISOString(),
					end_ts: endDate.toISOString(),
					all_day: false,
					status: 'planned',
					address: `Arbetsplats ${i + 1}, Gata ${dayOffset + 1}`,
					note: 'Testuppdrag från seed script',
					sync_to_mobile: true,
				});
			}
		}

		const { error: assignmentsError } = await supabase
			.from('assignments')
			.insert(assignments);

		if (assignmentsError) {
			throw assignmentsError;
		}
		console.log(`✅ Created ${assignments.length} assignments\n`);

		// 4. Create sample absences
		console.log('🏖️ Creating sample absences...');
		const absences = [];
		
		// Create a vacation for user 0 next Thursday-Friday
		if (memberships.length > 0) {
			const thursdayDate = new Date(nextMonday);
			thursdayDate.setDate(nextMonday.getDate() + 3); // Thursday
			thursdayDate.setHours(0, 0, 0, 0);
			
			const fridayDate = new Date(thursdayDate);
			fridayDate.setDate(thursdayDate.getDate() + 1);
			fridayDate.setHours(23, 59, 59, 999);

			absences.push({
				org_id: orgId,
				user_id: memberships[0].user_id,
				type: 'vacation',
				start_ts: thursdayDate.toISOString(),
				end_ts: fridayDate.toISOString(),
				note: 'Planerad semester',
			});
		}

		// Create a sick leave for user 1 next Wednesday
		if (memberships.length > 1) {
			const wednesdayDate = new Date(nextMonday);
			wednesdayDate.setDate(nextMonday.getDate() + 2); // Wednesday
			wednesdayDate.setHours(0, 0, 0, 0);
			
			const wednesdayEnd = new Date(wednesdayDate);
			wednesdayEnd.setHours(23, 59, 59, 999);

			absences.push({
				org_id: orgId,
				user_id: memberships[1].user_id,
				type: 'sick',
				start_ts: wednesdayDate.toISOString(),
				end_ts: wednesdayEnd.toISOString(),
				note: 'Sjukfrånvaro',
			});
		}

		if (absences.length > 0) {
			const { error: absencesError } = await supabase
				.from('absences')
				.insert(absences);

			if (absencesError) {
				throw absencesError;
			}
			console.log(`✅ Created ${absences.length} absences\n`);
		}

		// 5. Create shift templates
		console.log('⏰ Creating shift templates...');
		const shiftTemplates = [
			{
				org_id: orgId,
				label: 'Standard Day',
				start_time: '07:00',
				end_time: '16:00',
				days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
				is_default: true,
			},
			{
				org_id: orgId,
				label: 'Half Day',
				start_time: '07:00',
				end_time: '12:00',
				days_of_week: [1, 2, 3, 4, 5],
				is_default: false,
			},
			{
				org_id: orgId,
				label: 'Evening Shift',
				start_time: '15:00',
				end_time: '23:00',
				days_of_week: [1, 2, 3, 4, 5],
				is_default: false,
			},
		];

		const { error: templatesError } = await supabase
			.from('shift_templates')
			.insert(shiftTemplates);

		if (templatesError) {
			throw templatesError;
		}
		console.log(`✅ Created ${shiftTemplates.length} shift templates\n`);

		console.log('✅ Planning data seeding complete!\n');
		console.log('Summary:');
		console.log(`  - ${projects.length} projects updated with colors`);
		console.log(`  - ${assignments.length} assignments created`);
		console.log(`  - ${absences.length} absences created`);
		console.log(`  - ${shiftTemplates.length} shift templates created`);
		console.log('\n🚀 Ready to use the planning system!');

	} catch (error) {
		console.error('❌ Error seeding planning data:', error);
		process.exit(1);
	}
}

main();

