#!/usr/bin/env tsx

/**
 * Seed Demo Data
 * 
 * This script seeds the database with comprehensive demo data for the demo organization.
 * The script is idempotent - it can be run multiple times safely.
 * 
 * Usage: 
 *   npx tsx scripts/seed-demo-data.ts
 *   npx tsx scripts/seed-demo-data.ts --reset  (clears existing demo data first)
 * 
 * Set environment variables before running:
 * $env:NEXT_PUBLIC_SUPABASE_URL="your_url"
 * $env:SUPABASE_SERVICE_ROLE_KEY="your_key"
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

// Demo organization slug
const DEMO_ORG_SLUG = 'demo';

// Helper to generate Swedish names
const swedishNames = {
	firstNames: ['Erik', 'Anna', 'Lars', 'Maria', 'Johan', 'Emma', 'Anders', 'Sara', 'Mikael', 'Lisa'],
	lastNames: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson'],
};

function randomElement<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
	return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date): string {
	return date.toISOString().split('T')[0];
}

async function main() {
	const reset = process.argv.includes('--reset');
	
	console.log('🌱 Seeding demo data...\n');
	
	if (reset) {
		console.log('⚠️  --reset flag detected. This will delete all demo data!\n');
	}

	try {
		// 1. Get or create demo organization
		console.log('📦 Step 1: Getting demo organization...');
		let { data: demoOrg, error: orgError } = await supabase
			.from('organizations')
			.select('id, name')
			.eq('slug', DEMO_ORG_SLUG)
			.single();

		if (orgError && orgError.code !== 'PGRST116') {
			throw orgError;
		}

		if (!demoOrg) {
			// Create demo org if it doesn't exist
			const { data: newOrg, error: createError } = await supabase
				.from('organizations')
				.insert({
					name: 'EP Bygg & Måleri AB',
					slug: DEMO_ORG_SLUG,
				})
				.select('id, name')
				.single();

			if (createError) throw createError;
			demoOrg = newOrg;
			console.log('✅ Created demo organization');
		} else {
			console.log('✅ Found existing demo organization');
		}

	const demoOrgId = demoOrg.id;
	console.log(`   Org ID: ${demoOrgId}\n`);

	// 1.5. Create anchor date (start of current week) for date-shifting
	// This will be saved as demo_reference_date, and all data will be created relative to this date
	// IMPORTANT: Use ISO week (Monday as first day) to match PostgreSQL date_trunc('week', ...)
	console.log('📅 Setting up demo reference date (anchor date)...');
	const anchorDate = new Date();
	// Get Monday of current week (ISO week - Monday is day 1)
	const dayOfWeek = anchorDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
	const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Convert to Monday-based
	anchorDate.setDate(anchorDate.getDate() + daysToMonday);
	anchorDate.setHours(0, 0, 0, 0);

	// Save demo_reference_date to organization
	const { error: updateRefDateError } = await supabase
		.from('organizations')
		.update({ demo_reference_date: anchorDate.toISOString() })
		.eq('id', demoOrgId);

	if (updateRefDateError) {
		console.warn(`   ⚠️  Warning: Could not set demo_reference_date:`, updateRefDateError.message);
	} else {
		console.log(`   ✅ Demo reference date set to: ${anchorDate.toISOString()}\n`);
	}

	// Helper function to get date relative to anchor date
	// Instead of using new Date(), we'll use anchorDate + offset
	const getRelativeDate = (daysOffset: number = 0, hours: number = 0, minutes: number = 0): Date => {
		const date = new Date(anchorDate);
		date.setDate(date.getDate() + daysOffset);
		date.setHours(hours, minutes, 0, 0);
		return date;
	};

	// Helper function to get "today" relative to anchor date (0 days offset)
	const getToday = (): Date => getRelativeDate(0);
	
	// Helper function to get "n weeks ago" relative to anchor date
	const getWeeksAgo = (weeks: number): Date => getRelativeDate(-weeks * 7);

	// 2. Reset demo data if --reset flag
	if (reset) {
			console.log('🗑️  Step 2: Clearing existing demo data...');
			
			// Delete in reverse dependency order
			const tables = [
				'activity_log',
				'invoice_basis',
				'approvals',
				'checklists',
				'ata_photos',
				'ata',
				'diary_entries',
				'time_entries',
				'materials',
				'expenses',
				'absences',
				'assignments',
				'work_orders',
				'phases',
				'projects',
				'customer_contacts',
				'customers',
				'employees',
				'subcontractors',
				'memberships',
			];

			for (const table of tables) {
				const { error } = await supabase
					.from(table)
					.delete()
					.eq('org_id', demoOrgId);
				
				if (error && error.code !== 'PGRST204') {
					console.warn(`   Warning: Could not clear ${table}:`, error.message);
				}
			}

			// Delete profiles that belong only to demo org
			const { data: demoMemberships } = await supabase
				.from('memberships')
				.select('user_id')
				.eq('org_id', demoOrgId);

			if (demoMemberships) {
				for (const membership of demoMemberships) {
					// Check if user has other memberships
					const { data: otherMemberships } = await supabase
						.from('memberships')
						.select('id')
						.eq('user_id', membership.user_id)
						.neq('org_id', demoOrgId)
						.limit(1);

					if (!otherMemberships || otherMemberships.length === 0) {
						// User only belongs to demo org, can delete profile
						await supabase
							.from('profiles')
							.delete()
							.eq('id', membership.user_id);
					}
				}
			}

			console.log('✅ Cleared existing demo data\n');
		}

		// 3. Create customers (4-5)
		console.log('👥 Step 3: Creating customers...');
		const customers = [
			{
				customer_no: 'C-2025-0001',
				type: 'COMPANY' as const,
				company_name: 'BRF Solgården',
				org_no: '556123-4567',
				vat_no: 'SE556123456701',
				f_tax: false,
				rot_enabled: false, // Required field
				invoice_email: 'faktura@brfsolgarden.se',
				invoice_method: 'EMAIL' as const,
				invoice_address_street: 'Solgatan 12',
				invoice_address_zip: '123 45',
				invoice_address_city: 'Stockholm',
				phone_mobile: '08-123 45 67',
			},
			{
				customer_no: 'C-2025-0002',
				type: 'COMPANY' as const,
				company_name: 'Stockholms Kommun',
				org_no: '212000-1234',
				vat_no: 'SE212000123401',
				f_tax: true,
				rot_enabled: false, // Required field
				invoice_email: 'faktura@stockholm.se',
				invoice_method: 'EFAKTURA' as const,
				peppol_id: '0192:2120001234',
				invoice_address_street: 'Stadshuset',
				invoice_address_zip: '105 35',
				invoice_address_city: 'Stockholm',
				phone_mobile: '08-508 00 000',
			},
			{
				customer_no: 'C-2025-0003',
				type: 'PRIVATE' as const,
				first_name: 'Erik',
				last_name: 'Svensson',
				personal_identity_no: '19750515-1234',
				f_tax: false, // Required field
				rot_enabled: true,
				property_designation: 'Solgatan 5',
				apartment_no: '1203',
				ownership_share: 50.0,
				invoice_email: 'erik.svensson@example.com',
				invoice_method: 'EMAIL' as const,
				invoice_address_street: 'Solgatan 5',
				invoice_address_zip: '123 45',
				invoice_address_city: 'Stockholm',
				phone_mobile: '070-123 45 67',
			},
			{
				customer_no: 'C-2025-0004',
				type: 'COMPANY' as const,
				company_name: 'Fastighets AB Centrum',
				org_no: '556789-0123',
				vat_no: 'SE556789012301',
				f_tax: false,
				rot_enabled: false, // Required field
				invoice_email: 'faktura@fastighetscentrum.se',
				invoice_method: 'EMAIL' as const,
				invoice_address_street: 'Storgatan 1',
				invoice_address_zip: '111 22',
				invoice_address_city: 'Stockholm',
				phone_mobile: '08-987 65 43',
			},
			{
				customer_no: 'C-2025-0005',
				type: 'PRIVATE' as const,
				first_name: 'Anna',
				last_name: 'Johansson',
				personal_identity_no: '19820320-5678',
				f_tax: false, // Required field
				rot_enabled: false,
				property_designation: 'Villagatan 8',
				invoice_email: 'anna.johansson@example.com',
				invoice_method: 'EMAIL' as const,
				invoice_address_street: 'Villagatan 8',
				invoice_address_zip: '114 56',
				invoice_address_city: 'Stockholm',
				phone_mobile: '070-987 65 43',
			},
		];

		const { data: createdCustomers, error: customersError } = await supabase
			.from('customers')
			.insert(
				customers.map((c) => ({
					...c,
					org_id: demoOrgId,
				}))
			)
			.select('id, customer_no, company_name, first_name, last_name');

		if (customersError) throw customersError;
		console.log(`✅ Created ${createdCustomers?.length || 0} customers\n`);

		// 4. Get existing demo users (created by migration)
		console.log('👤 Step 4: Getting demo user profiles...');
		const userEmails = [
			'admin@epbygg.se',
			'forman@epbygg.se',
			'arbetare1@epbygg.se',
			'arbetare2@epbygg.se',
			'arbetare3@epbygg.se',
			'arbetare4@epbygg.se',
			'arbetare5@epbygg.se',
			'ekonomi@epbygg.se',
		];

		// Get existing profiles for demo users (created by migration)
		const { data: existingProfiles, error: profilesError } = await supabase
			.from('profiles')
			.select('id, email')
			.in('email', userEmails);

		if (profilesError) {
			console.warn(`   Warning: Could not fetch profiles:`, profilesError.message);
		}

		const profileIds: string[] = existingProfiles?.map(p => p.id) || [];

		if (profileIds.length === 0) {
			console.warn('   ⚠️  No demo users found. Run migration 20250205000005_create_demo_users.sql first.');
		} else {
			console.log(`✅ Found ${profileIds.length} demo user profiles\n`);
		}

		// 4.5. Create memberships for demo users if they don't exist
		console.log('🔗 Step 4.5: Creating memberships for demo users...');
		if (profileIds.length > 0) {
			// Check which users already have memberships
			const { data: existingMemberships, error: membershipsCheckError } = await supabase
				.from('memberships')
				.select('user_id')
				.eq('org_id', demoOrgId)
				.in('user_id', profileIds);

			if (membershipsCheckError) {
				console.warn(`   Warning: Could not check existing memberships:`, membershipsCheckError.message);
			}

			const existingMembershipUserIds = new Set(existingMemberships?.map((m) => m.user_id) || []);
			const usersNeedingMembership = profileIds.filter((id) => !existingMembershipUserIds.has(id));

			if (usersNeedingMembership.length > 0) {
				// Create memberships with appropriate roles
				const membershipEntries = usersNeedingMembership.map((userId) => {
					const email = existingProfiles?.find((p) => p.id === userId)?.email || '';
					let role: 'admin' | 'foreman' | 'worker' | 'finance' | 'ue' = 'worker';
					
					if (email.includes('admin@')) {
						role = 'admin';
					} else if (email.includes('forman@')) {
						role = 'foreman';
					} else if (email.includes('ekonomi@')) {
						role = 'finance';
					} else if (email.includes('arbetare')) {
						role = 'worker';
					}

					return {
						org_id: demoOrgId,
						user_id: userId,
						role: role,
						is_active: true,
						hourly_rate_sek: role === 'worker' ? randomInt(200, 300) : role === 'foreman' ? randomInt(350, 450) : null,
					};
				});

				const { error: membershipsError } = await supabase
					.from('memberships')
					.insert(membershipEntries);

				if (membershipsError) {
					console.warn(`   Warning: Could not create memberships:`, membershipsError.message);
				} else {
					console.log(`✅ Created ${membershipEntries.length} memberships\n`);
				}
			} else {
				console.log(`✅ All demo users already have memberships\n`);
			}
		} else {
			console.log('   ⚠️  Skipping memberships (no users found)\n');
		}

		// 5. Create projects (8+)
		console.log('🏗️  Step 5: Creating projects...');
		const projects = [
			{
				name: 'Renovering BRF Solgården',
				project_number: 'PRJ-2025-001',
				client_name: 'BRF Solgården',
				site_address: 'Solgatan 12, 123 45 Stockholm',
				site_lat: 59.3293,
				site_lon: 18.0686,
				status: 'active' as const,
				budget_mode: 'amount' as const,
				budget_amount: 2500000,
				customer_id: createdCustomers?.[0]?.id,
			},
			{
				name: 'Målning Stadshuset',
				project_number: 'PRJ-2025-002',
				client_name: 'Stockholms Kommun',
				site_address: 'Stadshuset, 105 35 Stockholm',
				site_lat: 59.3274,
				site_lon: 18.0544,
				status: 'active' as const,
				budget_mode: 'hours' as const,
				budget_hours: 1200,
				customer_id: createdCustomers?.[1]?.id,
			},
			{
				name: 'Badrumsrenovering Solgatan 5',
				project_number: 'PRJ-2025-003',
				client_name: 'Erik Svensson',
				site_address: 'Solgatan 5, 123 45 Stockholm',
				site_lat: 59.3300,
				site_lon: 18.0700,
				status: 'active' as const,
				budget_mode: 'amount' as const,
				budget_amount: 150000,
				customer_id: createdCustomers?.[2]?.id,
			},
			{
				name: 'Fasadmålning Fastighets Centrum',
				project_number: 'PRJ-2025-004',
				client_name: 'Fastighets AB Centrum',
				site_address: 'Storgatan 1, 111 22 Stockholm',
				site_lat: 59.3350,
				site_lon: 18.0600,
				status: 'active' as const,
				budget_mode: 'amount' as const,
				budget_amount: 1800000,
				customer_id: createdCustomers?.[3]?.id,
			},
			{
				name: 'Kökrenovering Villagatan',
				project_number: 'PRJ-2025-005',
				client_name: 'Anna Johansson',
				site_address: 'Villagatan 8, 114 56 Stockholm',
				site_lat: 59.3400,
				site_lon: 18.0800,
				status: 'paused' as const,
				budget_mode: 'amount' as const,
				budget_amount: 200000,
				customer_id: createdCustomers?.[4]?.id,
			},
			{
				name: 'Takrenovering BRF Solgården',
				project_number: 'PRJ-2024-006',
				client_name: 'BRF Solgården',
				site_address: 'Solgatan 12, 123 45 Stockholm',
				site_lat: 59.3293,
				site_lon: 18.0686,
				status: 'completed' as const,
				budget_mode: 'amount' as const,
				budget_amount: 1200000,
				customer_id: createdCustomers?.[0]?.id,
			},
			{
				name: 'Golvläggning Kontor',
				project_number: 'PRJ-2024-007',
				client_name: 'Fastighets AB Centrum',
				site_address: 'Storgatan 1, 111 22 Stockholm',
				site_lat: 59.3350,
				site_lon: 18.0600,
				status: 'completed' as const,
				budget_mode: 'hours' as const,
				budget_hours: 800,
				customer_id: createdCustomers?.[3]?.id,
			},
			{
				name: 'Planerad: Balkongrenovering',
				project_number: 'PRJ-2025-008',
				client_name: 'BRF Solgården',
				site_address: 'Solgatan 12, 123 45 Stockholm',
				site_lat: 59.3293,
				site_lon: 18.0686,
				status: 'active' as const,
				budget_mode: 'amount' as const,
				budget_amount: 800000,
				customer_id: createdCustomers?.[0]?.id,
			},
		];

		const { data: createdProjects, error: projectsError } = await supabase
			.from('projects')
			.insert(
				projects.map((p) => ({
					...p,
					org_id: demoOrgId,
					created_by: profileIds[0], // Admin
				}))
			)
			.select('id, name, project_number');

		if (projectsError) throw projectsError;
		console.log(`✅ Created ${createdProjects?.length || 0} projects\n`);

		// 5.5. Enable worksites (personalliggare) for 3-4 active projects
		console.log('🏗️  Step 5.5: Enabling worksites for selected projects...');
		if (createdProjects && createdProjects.length > 0) {
			// Select 3-4 active projects to enable as worksites
			const activeProjectsForWorksite = createdProjects
				.filter((p) => p.project_number.startsWith('PRJ-2025'))
				.slice(0, 4);

			// Helper function to parse address from site_address
			const parseAddress = (siteAddress: string) => {
				// Format: "Street Name, Postal Code City" or "Street Name, Postal Code City, Country"
				// Example: "Solgatan 12, 123 45 Stockholm"
				const parts = siteAddress.split(',').map((s) => s.trim());
				
				if (parts.length >= 2) {
					const addressLine1 = parts[0];
					const cityPart = parts[parts.length - 1];
					
					// Extract postal code and city (format: "123 45 Stockholm")
					const postalCityMatch = cityPart.match(/^(\d{3}\s?\d{2})\s+(.+)$/);
					if (postalCityMatch) {
						return {
							address_line1: addressLine1,
							address_line2: parts.length > 2 ? parts.slice(1, -1).join(', ') : null,
							postal_code: postalCityMatch[1].replace(/\s/, ''),
							city: postalCityMatch[2],
							country: 'Sverige',
						};
					} else {
						// Fallback: assume city is the last part
						return {
							address_line1: addressLine1,
							address_line2: parts.length > 2 ? parts.slice(1, -1).join(', ') : null,
							postal_code: null,
							city: cityPart,
							country: 'Sverige',
						};
					}
				}
				
				// Fallback: use entire address as line1
				return {
					address_line1: siteAddress,
					address_line2: null,
					postal_code: null,
					city: null,
					country: 'Sverige',
				};
			};

			// Update projects with worksite data
			const worksiteUpdates = activeProjectsForWorksite.map((project, index) => {
				const originalProject = projects.find((p) => p.project_number === project.project_number);
				if (!originalProject) return null;

				const addressData = parseAddress(originalProject.site_address);
				const worksiteCode = `WS-${project.project_number.split('-').slice(-1)[0]}`;

				return {
					id: project.id,
					worksite_enabled: true,
					worksite_code: worksiteCode,
					...addressData,
					timezone: 'Europe/Stockholm',
					retention_years: 2,
				};
			}).filter((update) => update !== null);

			// Update projects in batches
			for (const update of worksiteUpdates) {
				if (!update) continue;
				const { id, ...updateData } = update;
				const { error: updateError } = await supabase
					.from('projects')
					.update(updateData)
					.eq('id', id);

				if (updateError) {
					console.warn(`   Warning: Could not update worksite for project ${id}:`, updateError.message);
				}
			}

			console.log(`✅ Enabled worksites for ${worksiteUpdates.length} projects\n`);
		} else {
			console.log('   ⚠️  Skipping worksites (no projects created)\n');
		}

		// 6. Create phases for some projects
		console.log('📋 Step 6: Creating phases...');
		const activeProjects = createdProjects?.filter((p) => p.project_number.startsWith('PRJ-2025')) || [];
		const phases: Array<{ project_id: string; name: string; sort_order: number }> = [];

		for (const project of activeProjects.slice(0, 3)) {
			phases.push(
				{ project_id: project.id, name: 'Förberedelse', sort_order: 1 },
				{ project_id: project.id, name: 'Utförande', sort_order: 2 },
				{ project_id: project.id, name: 'Slutarbete', sort_order: 3 }
			);
		}

		if (phases.length > 0) {
			const { error: phasesError } = await supabase
				.from('phases')
				.insert(phases);

			if (phasesError) throw phasesError;
			console.log(`✅ Created ${phases.length} phases\n`);
		}

		// 7. Create work orders (3-5)
		console.log('📝 Step 7: Creating work orders...');
		const workOrders: Array<{
			organization_id: string;
			project_id: string;
			customer_id?: string;
			work_order_number: string;
			title: string;
			description: string;
			status: string;
			priority: string;
			planned_start_at: string;
			planned_end_at: string;
		}> = [];

		for (let i = 0; i < Math.min(5, activeProjects.length); i++) {
			const project = activeProjects[i];
			const customer = createdCustomers?.find((c) => c.id === project.customer_id);

			const statuses = ['PLANERAD', 'PÅGÅENDE', 'KLAR']; // Valid: PLANERAD, PÅGÅENDE, KLAR, FAKTURERAD, AVBOKAD
			const priorities = ['LOW', 'NORMAL', 'HIGH', 'AKUT']; // Valid: LOW, NORMAL, HIGH, AKUT
			
			const startDate = getRelativeDate(i);
			const endDate = getRelativeDate(i + 1);

			workOrders.push({
				organization_id: demoOrgId,
				project_id: project.id,
				customer_id: customer?.id,
				work_order_number: `WO-2025-${String(i + 1).padStart(4, '0')}`,
				title: `Arbetsorder ${i + 1} - ${project.name}`,
				description: `Detaljerad beskrivning av arbetet för ${project.name}`,
				status: statuses[i % statuses.length],
				priority: priorities[i % priorities.length],
				planned_start_at: startDate.toISOString(),
				planned_end_at: endDate.toISOString(),
			});
		}

		const { data: createdWorkOrders, error: workOrdersError } = await supabase
			.from('work_orders')
			.insert(workOrders)
			.select('id, title, status, work_order_number');

		if (workOrdersError) throw workOrdersError;
		console.log(`✅ Created ${createdWorkOrders?.length || 0} work orders\n`);

		// 8. Create diary entries (30+)
		// Skip if no users (created_by is required)
		console.log('📔 Step 8: Creating diary entries...');
		const diaryEntries: Array<{
			org_id: string;
			project_id: string;
			work_order_id?: string;
			created_by?: string;
			date: string;
			weather: string;
			temperature_c: number;
			crew_count: number;
			work_performed: string;
			obstacles?: string;
			safety_notes?: string;
		}> = [];

		if (profileIds.length > 0) {
			const weatherOptions = ['Soligt', 'Molnigt', 'Regn', 'Snö', 'Oklart'];
			const today = getToday();
			const threeWeeksAgo = getWeeksAgo(3);

			for (let i = 0; i < 35; i++) {
				const date = randomDate(threeWeeksAgo, today);
				const project = randomElement(activeProjects);
				const workOrder = Math.random() > 0.5 ? randomElement(createdWorkOrders || []) : undefined;
				const worker = randomElement(profileIds.slice(2, 7)); // Workers only

				diaryEntries.push({
					org_id: demoOrgId,
					project_id: project.id,
					work_order_id: workOrder?.id,
					created_by: worker,
					date: formatDate(date),
					weather: randomElement(weatherOptions),
					temperature_c: randomInt(5, 25),
					crew_count: randomInt(2, 5),
					work_performed: `Arbete utfört på ${project.name}. ${['Målning', 'Rivning', 'Montering', 'Slipning', 'Spackling'][i % 5]} genomförd enligt plan.`,
					obstacles: Math.random() > 0.7 ? 'Leveransförsening av material' : undefined,
					safety_notes: Math.random() > 0.8 ? 'Säkerhetskontroll genomförd' : undefined,
				});
			}
		} else {
			console.log('   ⚠️  Skipping diary entries (no users created)');
		}

		// Insert diary entries in batches to avoid conflicts
		for (let i = 0; i < diaryEntries.length; i += 10) {
			const batch = diaryEntries.slice(i, i + 10);
			const { error: diaryError } = await supabase
				.from('diary_entries')
				.insert(batch)
				.select('id');

			if (diaryError && diaryError.code !== '23505') {
				console.warn(`   Warning: Could not insert some diary entries:`, diaryError.message);
			}
		}

		console.log(`✅ Created ${diaryEntries.length} diary entries\n`);

		// 9. Create time entries (3 weeks worth)
		// Skip if no users (user_id is required)
		console.log('⏰ Step 9: Creating time entries...');
		const timeEntries: Array<{
			org_id: string;
			project_id: string;
			work_order_id?: string;
			user_id: string;
			task_label: string;
			start_at: string;
			stop_at: string;
			duration_min: number;
			notes?: string;
			status: string;
		}> = [];

		if (profileIds.length > 0) {
			const mainProjects = activeProjects.slice(0, 2);
			const workers = profileIds.slice(2, 7);
			const threeWeeksAgo = getWeeksAgo(3);

			// Create time entries for 3 weeks ago to current week (4 weeks total)
			// This ensures data exists for "current week" in dashboard stats
			// Week 0-2: Past weeks (3 weeks ago to last week)
			// Week 3: Current week (from anchor date = start of week)
			for (let week = 0; week < 4; week++) {
				for (let day = 0; day < 5; day++) {
					// Monday to Friday (day 1-5, where anchor date is Sunday = day 0)
					// For current week (week 3), start from day 1 (Monday)
					const dayOffset = week < 3 
						? -21 + week * 7 + day  // Past weeks: -21 to -1 days
						: day; // Current week: 0 to 4 days (Mon-Fri of current week)
					const date = getRelativeDate(dayOffset);

					for (const worker of workers.slice(0, 3)) {
						// 3 workers per day
						const project = randomElement(mainProjects);
						const workOrder = randomElement(createdWorkOrders?.filter((wo) => wo.project_id === project.id) || []);
						const startHour = randomInt(7, 8);
						const startMinute = randomInt(0, 30);
						const durationHours = randomInt(6, 8);
						const durationMinutes = randomInt(0, 30);

					const dayOffset = week < 3 
						? -21 + week * 7 + day  // Past weeks
						: day; // Current week (Mon-Fri)
					const startAt = getRelativeDate(dayOffset, startHour, startMinute);
					const stopAt = getRelativeDate(dayOffset, startHour + durationHours, startMinute + durationMinutes);

						// Calculate duration in minutes
						const durationMin = Math.round((stopAt.getTime() - startAt.getTime()) / (1000 * 60));

						timeEntries.push({
							org_id: demoOrgId,
							project_id: project.id,
							work_order_id: workOrder?.id,
							user_id: worker,
							task_label: randomElement(['Målning', 'Rivning', 'Montering', 'Slipning', 'Spackling']),
							start_at: startAt.toISOString(),
							stop_at: stopAt.toISOString(),
							duration_min: durationMin, // Explicitly set duration_min
							notes: Math.random() > 0.7 ? 'Arbete utfört enligt specifikation' : undefined,
							status: 'approved',
						});
					}
				}
			}

			const { error: timeEntriesError } = await supabase
				.from('time_entries')
				.insert(timeEntries);

			if (timeEntriesError) throw timeEntriesError;
			console.log(`✅ Created ${timeEntries.length} time entries\n`);
		} else {
			console.log('   ⚠️  Skipping time entries (no users created)\n');
		}

		// 10. Create materials
		// Skip if no users (user_id is required)
		console.log('📦 Step 10: Creating materials...');
		const materialEntries: Array<{
			org_id: string;
			project_id: string;
			user_id: string;
			description: string;
			qty: number;
			unit: string;
			unit_price_sek: number;
			status: string;
			created_at?: string;
		}> = [];

		if (profileIds.length > 0) {
			const materials = [
				{ description: 'Målningfärg vit 10L', qty: 20, unit: 'st', unit_price_sek: 450 },
				{ description: 'Spackel 25kg', qty: 15, unit: 'säck', unit_price_sek: 320 },
				{ description: 'Målarduk 3x4m', qty: 50, unit: 'st', unit_price_sek: 85 },
				{ description: 'Penslar set', qty: 10, unit: 'set', unit_price_sek: 250 },
				{ description: 'Skruv M6x50', qty: 500, unit: 'st', unit_price_sek: 2.5 },
			];

			const workers = profileIds.slice(2, 7);

			// Create materials distributed across last 3 weeks + current week
			for (let i = 0; i < 15; i++) {
				const material = randomElement(materials);
				const project = randomElement(activeProjects);
				const worker = randomElement(workers);
				
				// Distribute across 4 weeks (3 past + current week)
				// Most recent materials should be in current week for dashboard stats
				const dayOffset = i < 5 
					? randomInt(0, 4) // Current week (Mon-Fri)
					: randomInt(-21, -1); // Past 3 weeks
				const createdDate = getRelativeDate(dayOffset);

				materialEntries.push({
					org_id: demoOrgId,
					project_id: project.id,
					user_id: worker,
					description: material.description,
					qty: material.qty * (0.5 + Math.random()),
					unit: material.unit,
					unit_price_sek: material.unit_price_sek,
					// Create more submitted entries for approvals demo (60% submitted, 40% approved)
					status: Math.random() > 0.4 ? 'submitted' : 'approved',
					created_at: createdDate.toISOString(),
				});
			}

			const { error: materialsError } = await supabase
				.from('materials')
				.insert(materialEntries);

			if (materialsError) throw materialsError;
			console.log(`✅ Created ${materialEntries.length} material entries\n`);
		} else {
			console.log('   ⚠️  Skipping materials (no users created)\n');
		}

		// 11. Create expenses
		// Skip if no users (user_id is required)
		console.log('💰 Step 11: Creating expenses...');
		const expenseEntries: Array<{
			org_id: string;
			project_id: string;
			user_id: string;
			category: string;
			description: string;
			amount_sek: number;
			vat: boolean;
			status: string;
			created_at?: string;
		}> = [];

		if (profileIds.length > 0) {
			const expenseCategories = ['Transport', 'Material', 'Verktyg', 'Övrigt'];
			const expenseDescriptions = [
				'Bensin',
				'Parkering',
				'Lunch',
				'Verktygshyra',
				'Transportkostnad',
			];
			const workers = profileIds.slice(2, 7);

			// Create expenses distributed across last 3 weeks + current week
			for (let i = 0; i < 12; i++) {
				const project = randomElement(activeProjects);
				const worker = randomElement(workers);
				
				// Distribute across 4 weeks (3 past + current week)
				// Most recent expenses should be in current week for dashboard stats
				const dayOffset = i < 4 
					? randomInt(0, 4) // Current week (Mon-Fri)
					: randomInt(-21, -1); // Past 3 weeks
				const createdDate = getRelativeDate(dayOffset);

				expenseEntries.push({
					org_id: demoOrgId,
					project_id: project.id,
					user_id: worker,
					category: randomElement(expenseCategories),
					description: randomElement(expenseDescriptions),
					amount_sek: randomInt(50, 500),
					vat: Math.random() > 0.3,
					// Create more submitted entries for approvals demo (60% submitted, 40% approved)
					status: Math.random() > 0.4 ? 'submitted' : 'approved',
					created_at: createdDate.toISOString(),
				});
			}

			const { error: expensesError } = await supabase
				.from('expenses')
				.insert(expenseEntries);

			if (expensesError) throw expensesError;
			console.log(`✅ Created ${expenseEntries.length} expense entries\n`);
		} else {
			console.log('   ⚠️  Skipping expenses (no users created)\n');
		}

		// 12. Create ÄTA/Change Orders (5-7)
		// Skip if no users (created_by is required)
		console.log('📄 Step 12: Creating ÄTA entries...');
		const ataEntries: Array<{
			org_id: string;
			project_id: string;
			created_by: string;
			ata_number: string;
			title: string;
			description: string;
			qty: number;
			unit: string;
			unit_price_sek: number;
			status: string;
		}> = [];

		if (profileIds.length > 0) {
			const ataStatuses = ['draft', 'submitted', 'approved', 'invoiced'];
			const ataTitles = [
				'Extra målning ytterligare rum',
				'Ytterligare isolering',
				'Extra golvläggning',
				'Kompensation för försening',
				'Tillägg för ändringar',
			];

			for (let i = 0; i < 6; i++) {
				const project = randomElement(activeProjects);
				const foreman = profileIds[1]; // Foreman

				ataEntries.push({
					org_id: demoOrgId,
					project_id: project.id,
					created_by: foreman,
					ata_number: `ATA-2025-${String(i + 1).padStart(3, '0')}`,
					title: randomElement(ataTitles),
					description: `Beskrivning av ändring: ${randomElement(ataTitles)}`,
					qty: randomInt(1, 10),
					unit: randomElement(['st', 'm²', 'm', 'tim', 'säck']),
					unit_price_sek: randomInt(500, 5000),
					status: ataStatuses[i % ataStatuses.length],
				});
			}

			const { data: createdAta, error: ataError } = await supabase
				.from('ata')
				.insert(ataEntries)
				.select('id, ata_number, title');

			if (ataError) throw ataError;
			console.log(`✅ Created ${createdAta?.length || 0} ÄTA entries\n`);
		} else {
			console.log('   ⚠️  Skipping ÄTA entries (no users created)\n');
		}

		// 13. Create checklists (5-8)
		console.log('✅ Step 13: Creating checklists...');
		const checklistEntries: Array<{
			org_id: string;
			project_id: string;
			created_by: string;
			name: string;
			completed_at: string | null;
			checklist_data: any;
			signature_name: string | null;
			signature_timestamp: string | null;
		}> = [];

		if (profileIds.length > 0) {
			const checklistTemplates = [
				{
					name: 'Säkerhetskontroll',
					items: [
						{ text: 'Skyddsutrustning kontrollerad', checked: true },
						{ text: 'Arbetsplats avspärrad', checked: true },
						{ text: 'Brandsläckare tillgänglig', checked: true },
						{ text: 'Första hjälpen-kit kontrollerat', checked: true },
					],
				},
				{
					name: 'Kvalitetskontroll målning',
					items: [
						{ text: 'Ytor slipade och rengjorda', checked: true },
						{ text: 'Spackling utförd korrekt', checked: true },
						{ text: 'Grundmålning applicerad', checked: true },
						{ text: 'Slutmålning jämn och täckande', checked: true },
						{ text: 'Skydd borttaget', checked: false },
					],
				},
				{
					name: 'Slutkontroll',
					items: [
						{ text: 'Allt arbete utfört enligt specifikation', checked: true },
						{ text: 'Städning genomförd', checked: true },
						{ text: 'Material och verktyg borttagna', checked: true },
						{ text: 'Kund informerad', checked: true },
					],
				},
				{
					name: 'Daglig kontroll',
					items: [
						{ text: 'Verktyg kontrollerade', checked: true },
						{ text: 'Material tillräckligt', checked: true },
						{ text: 'Arbetsplats säker', checked: true },
					],
				},
			];

			const foreman = profileIds[1]; // Foreman
			const admin = profileIds[0]; // Admin

			for (let i = 0; i < 8; i++) {
				const project = randomElement(activeProjects);
				const template = randomElement(checklistTemplates);
				const creator = i % 2 === 0 ? foreman : admin;
				const isCompleted = Math.random() > 0.3; // 70% completed

				const completedAt = isCompleted
					? getRelativeDate(-randomInt(0, 14)).toISOString()
					: null;

				const signatureName = isCompleted ? (creator === foreman ? 'Lars Johansson' : 'Erik Andersson') : null;
				const signatureTimestamp = isCompleted ? completedAt : null;

				checklistEntries.push({
					org_id: demoOrgId,
					project_id: project.id,
					created_by: creator,
					name: template.name,
					completed_at: completedAt,
					checklist_data: { items: template.items },
					signature_name: signatureName,
					signature_timestamp: signatureTimestamp,
				});
			}

			const { error: checklistsError } = await supabase
				.from('checklists')
				.insert(checklistEntries);

			if (checklistsError) throw checklistsError;
			console.log(`✅ Created ${checklistEntries.length} checklist entries\n`);
		} else {
			console.log('   ⚠️  Skipping checklists (no users created)\n');
		}

		// 14. Create assignments (planning) (10-15)
		console.log('📅 Step 14: Creating planning assignments...');
		const assignmentEntries: Array<{
			org_id: string;
			project_id: string;
			user_id: string;
			start_ts: string;
			end_ts: string;
			all_day: boolean;
			status: string;
			address?: string;
			note?: string;
			created_by: string;
		}> = [];

		if (profileIds.length > 0 && activeProjects.length > 0) {
			const profileMap = new Map(existingProfiles?.map((p) => [p.id, p]) || []);
			const workers = profileIds.filter(id => profileMap.get(id)?.email.startsWith('arbetare'));
			const foreman = profileIds[1]; // Foreman
			const today = getToday();

			// Create assignments for next 2 weeks (relative to anchor date)
			for (let week = 0; week < 2; week++) {
				for (let day = 0; day < 5; day++) {
					// Monday to Friday (week * 7 + day offset from anchor date)
					const date = getRelativeDate(week * 7 + day);

					// Assign 2-3 workers per day to different projects
					const workersForDay = workers.slice(0, randomInt(2, 3));
					for (const worker of workersForDay) {
						const project = randomElement(activeProjects);
						const startHour = randomInt(7, 8);
						const endHour = randomInt(15, 17);

						const startTs = getRelativeDate(week * 7 + day, startHour, 0);
						const endTs = getRelativeDate(week * 7 + day, endHour, 0);

						assignmentEntries.push({
							org_id: demoOrgId,
							project_id: project.id,
							user_id: worker,
							start_ts: startTs.toISOString(),
							end_ts: endTs.toISOString(),
							all_day: false,
							status: randomElement(['planned', 'in_progress', 'done']),
							address: project.address || undefined,
							note: Math.random() > 0.7 ? 'Målning av ytor' : undefined,
							created_by: foreman,
						});
					}
				}
			}

			const { error: assignmentsError } = await supabase
				.from('assignments')
				.insert(assignmentEntries);

			if (assignmentsError) throw assignmentsError;
			console.log(`✅ Created ${assignmentEntries.length} planning assignments\n`);
		} else {
			console.log('   ⚠️  Skipping assignments (no users or projects created)\n');
		}

		// 15. Create absences (3-5)
		console.log('🏖️  Step 15: Creating absences...');
		const absenceEntries: Array<{
			org_id: string;
			user_id: string;
			type: string;
			start_ts: string;
			end_ts: string;
			note?: string;
			created_by: string;
		}> = [];

		if (profileIds.length > 0) {
			const profileMap = new Map(existingProfiles?.map((p) => [p.id, p]) || []);
			const workers = profileIds.filter(id => profileMap.get(id)?.email.startsWith('arbetare'));
			const foreman = profileIds[1]; // Foreman
			const today = getToday();

			// Create absences for next 4 weeks (relative to anchor date)
			for (let i = 0; i < 4; i++) {
				const worker = randomElement(workers);
				const absenceType = randomElement(['vacation', 'sick', 'training']);
				const startDaysOffset = randomInt(7, 28);
				const duration = absenceType === 'vacation' ? randomInt(3, 7) : 1;
				const startDate = getRelativeDate(startDaysOffset);
				const endDate = getRelativeDate(startDaysOffset + duration);

				absenceEntries.push({
					org_id: demoOrgId,
					user_id: worker,
					type: absenceType,
					start_ts: startDate.toISOString(),
					end_ts: endDate.toISOString(),
					note: absenceType === 'vacation' ? 'Semester' : absenceType === 'sick' ? 'Sjukdom' : 'Utbildning',
					created_by: foreman,
				});
			}

			const { error: absencesError } = await supabase
				.from('absences')
				.insert(absenceEntries);

			if (absencesError) throw absencesError;
			console.log(`✅ Created ${absenceEntries.length} absences\n`);
		} else {
			console.log('   ⚠️  Skipping absences (no users created)\n');
		}

		// 16. Create employees (3-5)
		console.log('👥 Step 16: Creating employees...');
		const employeeEntries: Array<{
			org_id: string;
			employee_no: string;
			first_name: string;
			last_name: string;
			email?: string;
			phone_mobile?: string;
			employment_type: string;
			hourly_rate_sek: number;
			employment_start_date: string;
		}> = [];

		const employeeFirstNames = ['Mikael', 'Anders', 'Johan', 'Maria', 'Sara'];
		const employeeLastNames = ['Karlsson', 'Nilsson', 'Larsson', 'Olsson', 'Persson'];

		for (let i = 0; i < 4; i++) {
			const firstName = employeeFirstNames[i] || randomElement(swedishNames.firstNames);
			const lastName = employeeLastNames[i] || randomElement(swedishNames.lastNames);

			employeeEntries.push({
				org_id: demoOrgId,
				employee_no: `E-2025-${String(i + 1).padStart(4, '0')}`,
				first_name: firstName,
				last_name: lastName,
				email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@epbygg.se`,
				phone_mobile: `070-${randomInt(1000000, 9999999)}`,
				employment_type: randomElement(['FULL_TIME', 'PART_TIME']),
				hourly_rate_sek: randomInt(300, 400),
				employment_start_date: formatDate(getRelativeDate(-randomInt(30, 365))),
			});
		}

		const { error: employeesError } = await supabase
			.from('employees')
			.insert(employeeEntries);

		if (employeesError) throw employeesError;
		console.log(`✅ Created ${employeeEntries.length} employees\n`);

		// 17. Create subcontractors (2-3)
		console.log('🏢 Step 17: Creating subcontractors...');
		const subcontractorEntries: Array<{
			org_id: string;
			subcontractor_no: string;
			company_name: string;
			org_no: string;
			f_tax: boolean;
			contact_person_name?: string;
			contact_person_phone?: string;
			email?: string;
			phone_mobile?: string;
			default_vat_rate: number;
			user_id: string;
		}> = [];

		if (profileIds.length > 0) {
			// Use different workers for each subcontractor to avoid unique constraint
			const workers = profileIds.filter(id => {
				const profile = existingProfiles?.find(p => p.id === id);
				return profile?.email.startsWith('arbetare');
			});

			const subcontractorNames = [
				'El & Installation AB',
				'Rör & VVS Service',
				'Golv & Parkett Expert',
			];

			for (let i = 0; i < 3; i++) {
				const companyName = subcontractorNames[i] || `Underentreprenör ${i + 1} AB`;
				// Use different user_id for each subcontractor (cycle through workers)
				const userForSubcontractor = workers[i % workers.length] || profileIds[2];
				
				subcontractorEntries.push({
					org_id: demoOrgId,
					subcontractor_no: `UE-2025-${String(i + 1).padStart(4, '0')}`,
					company_name: companyName,
					org_no: `${randomInt(100000, 999999)}-${randomInt(1000, 9999)}`,
					f_tax: Math.random() > 0.3, // 70% have F-tax
					contact_person_name: `Kontaktperson ${i + 1}`,
					contact_person_phone: `070-${randomInt(1000000, 9999999)}`,
					email: `info@${companyName.toLowerCase().replace(/\s+/g, '').replace('&', '')}.se`,
					phone_mobile: `08-${randomInt(100000, 999999)}`,
					default_vat_rate: 25,
					user_id: userForSubcontractor, // Required field - use different user for each
				});
			}
		}

		if (subcontractorEntries.length > 0) {
			const { error: subcontractorsError } = await supabase
				.from('subcontractors')
				.insert(subcontractorEntries);

			if (subcontractorsError) throw subcontractorsError;
			console.log(`✅ Created ${subcontractorEntries.length} subcontractors\n`);
		} else {
			console.log('   ⚠️  Skipping subcontractors (no users created)\n');
		}

		// 18. Create approvals (2-3)
		console.log('✅ Step 18: Creating approvals...');
		const approvalEntries: Array<{
			org_id: string;
			project_id: string | null;
			approved_by: string;
			period_start: string;
			period_end: string;
			notes?: string;
		}> = [];

		if (profileIds.length > 0) {
			const foreman = profileIds[1]; // Foreman
			const today = getToday();

			for (let i = 0; i < 2; i++) {
				const periodStart = getRelativeDate(-(i + 1) * 7 - 7);
				const periodEnd = getRelativeDate(-(i + 1) * 7 - 7 + 6); // Week period

				const project = i === 0 ? randomElement(activeProjects) : null; // First approval for specific project, second for all

				approvalEntries.push({
					org_id: demoOrgId,
					project_id: project?.id || null,
					approved_by: foreman,
					period_start: formatDate(periodStart),
					period_end: formatDate(periodEnd),
					notes: i === 0 ? 'Godkänd tidrapportering för vecka' : 'Allmän godkännande',
				});
			}

			const { error: approvalsError } = await supabase
				.from('approvals')
				.insert(approvalEntries);

			if (approvalsError) throw approvalsError;
			console.log(`✅ Created ${approvalEntries.length} approvals\n`);
		} else {
			console.log('   ⚠️  Skipping approvals (no users created)\n');
		}

		// 19. Create invoice underlay (2-3)
		console.log('🧾 Step 19: Creating invoice underlay...');
		const invoiceBasisEntries: Array<{
			org_id: string;
			project_id: string;
			customer_id: string;
			period_start: string;
			period_end: string;
			invoice_date: string;
			due_date: string;
			locked: boolean;
		}> = [];

		const threeWeeksAgo = getWeeksAgo(3);

		for (let i = 0; i < 2; i++) {
			const project = randomElement(activeProjects);
			const customer = createdCustomers?.find((c) => c.id === project.customer_id || createdCustomers[0].id);

			if (!customer) continue;

			const periodStart = getRelativeDate(-21 + i * 7);
			const periodEnd = getRelativeDate(-21 + i * 7 + 7);

			const invoiceDate = getRelativeDate(-21 + i * 7 + 7 + 1);
			const dueDate = getRelativeDate(-21 + i * 7 + 7 + 1 + 30);

			invoiceBasisEntries.push({
				org_id: demoOrgId,
				project_id: project.id,
				customer_id: customer.id,
				period_start: formatDate(periodStart),
				period_end: formatDate(periodEnd),
				invoice_date: formatDate(invoiceDate),
				due_date: formatDate(dueDate),
				locked: i === 0, // First one is locked
			});
		}

		const { error: invoiceBasisError } = await supabase
			.from('invoice_basis')
			.insert(
				invoiceBasisEntries.map((entry) => ({
					...entry,
					currency: 'SEK',
					fx_rate: 1.0,
					reverse_charge_building: false,
					rot_rut_flag: false,
					lines_json: { lines: [], diary: [] },
					totals: {},
				}))
			);

		if (invoiceBasisError) throw invoiceBasisError;
		console.log(`✅ Created ${invoiceBasisEntries.length} invoice underlay entries\n`);

		// 20. Create payroll basis from approved time entries
		console.log('💰 Step 20: Creating payroll basis from time entries...');
		if (timeEntries.length > 0) {
			// Group time entries by user and week
			const payrollBasisMap = new Map<string, { user_id: string; week_start: Date; total_hours: number }>();
			
			for (const entry of timeEntries) {
				if (entry.status !== 'approved') continue;
				
				const entryDate = new Date(entry.start_at);
				// Get start of ISO week (Monday)
				const weekStart = new Date(entryDate);
				const day = weekStart.getDay();
				const daysToMonday = day === 0 ? -6 : 1 - day;
				weekStart.setDate(weekStart.getDate() + daysToMonday);
				weekStart.setHours(0, 0, 0, 0);
				
				const weekKey = `${entry.user_id}-${weekStart.toISOString().split('T')[0]}`;
				const hours = entry.duration_min / 60.0;
				
				if (payrollBasisMap.has(weekKey)) {
					const existing = payrollBasisMap.get(weekKey)!;
					existing.total_hours += hours;
				} else {
					payrollBasisMap.set(weekKey, {
						user_id: entry.user_id,
						week_start: weekStart,
						total_hours: hours,
					});
				}
			}

			// Create payroll_basis entries
			const payrollBasisEntries = Array.from(payrollBasisMap.values()).map((entry) => {
				const weekEnd = new Date(entry.week_start);
				weekEnd.setDate(weekEnd.getDate() + 6);
				
				return {
					org_id: demoOrgId,
					person_id: entry.user_id,
					period_start: formatDate(entry.week_start),
					period_end: formatDate(weekEnd),
					hours_norm: entry.total_hours <= 40 ? entry.total_hours : 40,
					hours_overtime: entry.total_hours > 40 ? entry.total_hours - 40 : 0,
					ob_hours: 0,
					break_hours: 0,
					total_hours: entry.total_hours,
					corrections_json: {},
					locked: false,
				};
			});

			if (payrollBasisEntries.length > 0) {
				const { error: payrollBasisError } = await supabase
					.from('payroll_basis')
					.insert(payrollBasisEntries);

				if (payrollBasisError) {
					console.warn(`   Warning: Could not create payroll basis:`, payrollBasisError.message);
				} else {
					console.log(`✅ Created ${payrollBasisEntries.length} payroll basis entries\n`);
				}
			} else {
				console.log('   ⚠️  No approved time entries found for payroll basis\n');
			}
		} else {
			console.log('   ⚠️  Skipping payroll basis (no time entries created)\n');
		}

		console.log('✅ Demo data seeding completed successfully!\n');
		console.log('📊 Summary:');
		console.log(`   - Organization: ${demoOrg.name}`);
		console.log(`   - Customers: ${createdCustomers?.length || 0}`);
		console.log(`   - Users: ${profileIds.length} (Note: User creation skipped - requires manual auth user setup)`);
		console.log(`   - Projects: ${createdProjects?.length || 0}`);
		console.log(`   - Work Orders: ${createdWorkOrders?.length || 0}`);
		console.log(`   - Diary Entries: ${diaryEntries.length}`);
		console.log(`   - Time Entries: ${timeEntries.length}`);
		console.log(`   - Materials: ${materialEntries.length}`);
		console.log(`   - Expenses: ${expenseEntries.length}`);
		console.log(`   - ÄTA: ${ataEntries.length}`);
		console.log(`   - Checklists: ${checklistEntries.length}`);
		console.log(`   - Assignments: ${assignmentEntries.length}`);
		console.log(`   - Absences: ${absenceEntries.length}`);
		console.log(`   - Employees: ${employeeEntries.length}`);
		console.log(`   - Subcontractors: ${subcontractorEntries.length}`);
		console.log(`   - Approvals: ${approvalEntries.length}`);
		console.log(`   - Invoice Underlay: ${invoiceBasisEntries.length}\n`);
		console.log('💡 Note: Some data requires users. Demo mode will work but user-specific features are limited.\n');
	} catch (error) {
		console.error('❌ Error seeding demo data:', error);
		process.exit(1);
	}
}

main();

