/**
 * Script to fix customers that were imported as COMPANY but should be PRIVATE
 * 
 * This script:
 * 1. Finds customers with type='COMPANY' that have a personal identity number in org_no
 * 2. Converts them to type='PRIVATE'
 * 3. Moves the number from org_no to personal_identity_no
 * 
 * Run with: npx tsx scripts/fix-private-customers.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { normalizeSwedishPersonalIdentityNumber } from '../lib/utils/swedish';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('Missing required environment variables:');
	console.error('- NEXT_PUBLIC_SUPABASE_URL');
	console.error('- SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function fixPrivateCustomers() {
	console.log('🔍 Searching for customers that should be PRIVATE...\n');

	// Get all COMPANY customers with org_no
	const { data: customers, error: fetchError } = await supabase
		.from('customers')
		.select('id, org_id, customer_no, company_name, first_name, last_name, org_no, personal_identity_no, type')
		.eq('type', 'COMPANY')
		.not('org_no', 'is', null);

	if (fetchError) {
		console.error('❌ Error fetching customers:', fetchError);
		process.exit(1);
	}

	if (!customers || customers.length === 0) {
		console.log('✅ No COMPANY customers with org_no found.');
		return;
	}

	console.log(`Found ${customers.length} COMPANY customers with org_no\n`);

	const toFix: Array<{
		id: string;
		org_no: string;
		customer_no: string;
		name: string;
	}> = [];

	// Check each customer to see if org_no is actually a personal identity number
	for (const customer of customers) {
		if (!customer.org_no) continue;

		// Try to normalize as personal identity number
		try {
			const normalized = normalizeSwedishPersonalIdentityNumber(customer.org_no);
			if (normalized) {
				// It's a valid personal identity number!
				const name = customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
				toFix.push({
					id: customer.id,
					org_no: customer.org_no,
					customer_no: customer.customer_no,
					name,
				});
			}
		} catch {
			// Not a personal identity number, skip
		}
	}

	if (toFix.length === 0) {
		console.log('✅ No customers need fixing.');
		return;
	}

	console.log(`📋 Found ${toFix.length} customers that should be PRIVATE:\n`);
	toFix.forEach((c, i) => {
		console.log(`${i + 1}. ${c.name} (${c.customer_no}) - Org.nr: ${c.org_no}`);
	});

	console.log('\n🔄 Fixing customers...\n');

	let fixed = 0;
	let errors = 0;

	for (const customer of toFix) {
		try {
			// Normalize the personal identity number
			const normalizedPersonalId = normalizeSwedishPersonalIdentityNumber(customer.org_no);

			// Update customer: change type to PRIVATE, move org_no to personal_identity_no, clear org_no
			const { error: updateError } = await supabase
				.from('customers')
				.update({
					type: 'PRIVATE',
					personal_identity_no: normalizedPersonalId,
					org_no: null,
					company_name: null, // Clear company name for private customers
				})
				.eq('id', customer.id);

			if (updateError) {
				console.error(`❌ Error fixing ${customer.name}:`, updateError.message);
				errors++;
			} else {
				console.log(`✅ Fixed: ${customer.name} (${customer.customer_no})`);
				fixed++;
			}
		} catch (error) {
			console.error(`❌ Error fixing ${customer.name}:`, error instanceof Error ? error.message : String(error));
			errors++;
		}
	}

	console.log(`\n✨ Done! Fixed ${fixed} customer(s), ${errors} error(s)`);
}

fixPrivateCustomers()
	.then(() => {
		console.log('\n✅ Script completed successfully');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Script failed:', error);
		process.exit(1);
	});

