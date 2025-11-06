/**
 * Script to update gross_salary_sek for existing payroll_basis entries
 * 
 * This script calculates and updates gross salary for all payroll_basis entries
 * that don't have it set yet (NULL or 0).
 * 
 * Run with: node scripts/update-gross-salary.js
 * 
 * Make sure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in your environment
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
	console.error('Please set these in your .env.local file');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

/**
 * Calculate average OB rate from payroll rules
 */
function calculateAverageOBRate(obRates) {
	if (!obRates) return 0;
	
	const rates = [];
	if (obRates.night > 0) rates.push(obRates.night);
	if (obRates.weekend > 0) rates.push(obRates.weekend);
	if (obRates.holiday > 0) rates.push(obRates.holiday);
	
	if (rates.length === 0) return 0;
	return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}

/**
 * Calculate gross salary for a payroll basis entry
 */
function calculateGrossSalary(entry, salaryPerHour, rules) {
	if (!salaryPerHour || salaryPerHour <= 0) {
		return 0;
	}
	
	let grossSalary = 0;
	
	// Normal hours: hours_norm × salary_per_hour_sek
	grossSalary += entry.hours_norm * salaryPerHour;
	
	// Overtime hours: hours_overtime × salary_per_hour_sek × overtime_multiplier
	grossSalary += entry.hours_overtime * salaryPerHour * (rules.overtime_multiplier || 1.5);
	
	// OB hours: ob_hours × salary_per_hour_sek × avgOBRate
	const avgOBRate = calculateAverageOBRate(rules.ob_rates);
	if (entry.ob_hours > 0 && avgOBRate > 0) {
		grossSalary += entry.ob_hours * salaryPerHour * avgOBRate;
	}
	
	return Number(grossSalary.toFixed(2));
}

async function main() {
	console.log('Starting update of gross_salary_sek for payroll_basis entries...\n');
	
	try {
		// Fetch all payroll_basis entries that need updating
		const { data: payrollEntries, error: fetchError } = await supabase
			.from('payroll_basis')
			.select('id, org_id, person_id, hours_norm, hours_overtime, ob_hours, gross_salary_sek')
			.or('gross_salary_sek.is.null,gross_salary_sek.eq.0')
			.order('org_id', { ascending: true })
			.order('period_start', { ascending: true });
		
		if (fetchError) {
			throw new Error(`Failed to fetch payroll_basis entries: ${fetchError.message}`);
		}
		
		if (!payrollEntries || payrollEntries.length === 0) {
			console.log('No payroll_basis entries found that need updating.');
			return;
		}
		
		console.log(`Found ${payrollEntries.length} entries to update.\n`);
		
		// Get unique org_ids and person_ids to fetch memberships and rules efficiently
		const orgIds = [...new Set(payrollEntries.map(e => e.org_id))];
		const personIds = [...new Set(payrollEntries.map(e => e.person_id))];
		
		// Fetch all memberships (salary_per_hour_sek)
		const { data: memberships, error: membershipsError } = await supabase
			.from('memberships')
			.select('user_id, org_id, salary_per_hour_sek')
			.in('user_id', personIds)
			.in('org_id', orgIds)
			.eq('is_active', true);
		
		if (membershipsError) {
			throw new Error(`Failed to fetch memberships: ${membershipsError.message}`);
		}
		
		// Create a map: (org_id, user_id) -> salary_per_hour_sek
		const salaryMap = new Map();
		memberships?.forEach(m => {
			const key = `${m.org_id}:${m.user_id}`;
			if (m.salary_per_hour_sek && m.salary_per_hour_sek > 0) {
				salaryMap.set(key, m.salary_per_hour_sek);
			}
		});
		
		// Fetch payroll rules for all organizations
		const { data: payrollRules, error: rulesError } = await supabase
			.from('payroll_rules')
			.select('org_id, normal_hours_threshold, overtime_multiplier, ob_rates')
			.in('org_id', orgIds);
		
		if (rulesError) {
			throw new Error(`Failed to fetch payroll rules: ${rulesError.message}`);
		}
		
		// Create a map: org_id -> payroll rules
		const rulesMap = new Map();
		payrollRules?.forEach(rule => {
			rulesMap.set(rule.org_id, {
				normal_hours_threshold: rule.normal_hours_threshold || 40,
				overtime_multiplier: rule.overtime_multiplier || 1.5,
				ob_rates: rule.ob_rates || {},
			});
		});
		
		// Process each entry
		let updated = 0;
		let skipped = 0;
		
		for (const entry of payrollEntries) {
			const salaryKey = `${entry.org_id}:${entry.person_id}`;
			const salaryPerHour = salaryMap.get(salaryKey);
			
			if (!salaryPerHour || salaryPerHour <= 0) {
				console.log(`⏭️  Skipping entry ${entry.id}: No salary_per_hour_sek set for person ${entry.person_id}`);
				skipped++;
				continue;
			}
			
			const rules = rulesMap.get(entry.org_id) || {
				normal_hours_threshold: 40,
				overtime_multiplier: 1.5,
				ob_rates: {},
			};
			
			const grossSalary = calculateGrossSalary(entry, salaryPerHour, rules);
			
			if (grossSalary <= 0) {
				console.log(`⏭️  Skipping entry ${entry.id}: Calculated gross salary is 0`);
				skipped++;
				continue;
			}
			
			// Update the entry
			const { error: updateError } = await supabase
				.from('payroll_basis')
				.update({
					gross_salary_sek: grossSalary,
					updated_at: new Date().toISOString(),
				})
				.eq('id', entry.id);
			
			if (updateError) {
				console.error(`❌ Failed to update entry ${entry.id}:`, updateError.message);
				continue;
			}
			
			console.log(`✅ Updated entry ${entry.id}: gross_salary_sek = ${grossSalary.toFixed(2)} SEK`);
			updated++;
		}
		
		console.log(`\n✅ Update complete!`);
		console.log(`   Updated: ${updated}`);
		console.log(`   Skipped: ${skipped}`);
		console.log(`   Total: ${payrollEntries.length}`);
		
	} catch (error) {
		console.error('❌ Error:', error.message);
		process.exit(1);
	}
}

main();

