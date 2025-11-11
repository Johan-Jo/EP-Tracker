import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
	const value = process.env[name] || process.env[`NEXT_PUBLIC_${name}`];
	if (!value) {
		throw new Error(`Missing environment variable: ${name}`);
	}
	return value;
}

interface SeedArgs {
	orgId: string;
	projectId: string;
	userId: string;
	periodStart: string;
	periodEnd: string;
}

function parseArgs(): SeedArgs {
	const [, , orgId, projectId, userId, periodStartArg, periodEndArg] = process.argv;
	if (!orgId || !projectId || !userId) {
		console.error(
			'Usage: ts-node scripts/seed-invoice-test-data.ts <orgId> <projectId> <userId> [periodStart] [periodEnd]'
		);
		process.exit(1);
	}

	const today = new Date();
	const monday = new Date(today);
	monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);

	const periodStart = periodStartArg ?? monday.toISOString().slice(0, 10);
	const periodEnd = periodEndArg ?? sunday.toISOString().slice(0, 10);

	return {
		orgId,
		projectId,
		userId,
		periodStart,
		periodEnd,
	};
}

async function main() {
	const args = parseArgs();
	const supabaseUrl = requireEnv('SUPABASE_URL');
	const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

	const client = createClient(supabaseUrl, serviceKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});

	// Insert approved time entry (4h)
	const timeEntryId = randomUUID();
	const startAt = `${args.periodStart}T07:00:00Z`;
	const stopAt = `${args.periodStart}T11:00:00Z`;
	const { error: timeError } = await client.from('time_entries').insert({
		id: timeEntryId,
		org_id: args.orgId,
		project_id: args.projectId,
		user_id: args.userId,
		task_label: 'Målning väggar',
		start_at: startAt,
		stop_at: stopAt,
		status: 'approved',
		approved_by: args.userId,
		approved_at: new Date().toISOString(),
	});
	if (timeError) {
		throw timeError;
	}

	// Insert approved material
	const { error: materialError } = await client.from('materials').insert({
		org_id: args.orgId,
		project_id: args.projectId,
		user_id: args.userId,
		description: 'Hälsavägg färg 20L',
		qty: 2,
		unit: 'st',
		unit_price_sek: 950,
		status: 'approved',
		approved_by: args.userId,
		approved_at: new Date().toISOString(),
	});
	if (materialError) {
		throw materialError;
	}

	// Insert approved expense
	const { error: expenseError } = await client.from('expenses').insert({
		org_id: args.orgId,
		project_id: args.projectId,
		user_id: args.userId,
		description: 'Hyra byggställning',
		category: 'Hyra',
		amount_sek: 1200,
		status: 'approved',
		date: args.periodStart,
		approved_by: args.userId,
		approved_at: new Date().toISOString(),
	});
	if (expenseError) {
		throw expenseError;
	}

	// Insert diary entry
	const { error: diaryError } = await client.from('diary_entries').insert({
		org_id: args.orgId,
		project_id: args.projectId,
		created_by: args.userId,
		date: args.periodStart,
		work_performed: 'Grundmålning av väggar i entré samt maskering av lister.',
		obstacles: 'Vattenläcka i trapphus begränsade åtkomsten under morgonen.',
		deliveries: '2 st färgburkar 20L, 1 st byggfläkt.',
		visitors: 'Fastighetsägare (Info-möte kl 09).',
		crew_count: 3,
		weather: 'Mulet',
		temperature_c: 8,
		signature_name: 'Test Användare',
	});
	if (diaryError) {
		throw diaryError;
	}

	console.log('✅ Seed data inserted.');
	console.log('   • Time entry:', timeEntryId);
	console.log('   • Period:', args.periodStart, '→', args.periodEnd);
	console.log('🔁 Öppna fakturaunderlaget och klicka “Uppdatera underlag” eller kör refreshInvoiceBasis manuellt.');
}

main().catch((error) => {
	console.error('❌ Seed failed:', error);
	process.exit(1);
});





