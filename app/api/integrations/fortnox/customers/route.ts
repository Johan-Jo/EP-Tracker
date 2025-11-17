import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import {
	getFortnoxConnectionForOrg,
	getFortnoxCustomers,
} from '@/lib/integrations/fortnox/client';

/**
 * GET /api/integrations/fortnox/customers
 * Fetch customers from Fortnox
 * Only admin and finance can fetch customers
 */
export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and finance can fetch customers
		if (!['admin', 'finance'].includes(membership.role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Get Fortnox connection
		const connection = await getFortnoxConnectionForOrg(membership.org_id);
		if (!connection) {
			return NextResponse.json(
				{ error: 'Fortnox connection not found. Please connect your Fortnox account first.' },
				{ status: 404 }
			);
		}

		// Get limit from query params (default: 100)
		const limit = Math.min(500, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '100', 10)));

		// Fetch customers from Fortnox
		try {
			const fortnoxCustomers = await getFortnoxCustomers(connection, limit);
			console.log('[Fortnox Customers API] Fetched customers from Fortnox:', fortnoxCustomers.length);

			// Get existing customers in EP-Tracker
			// Match by fortnox_customer_number OR customer_no (in case fortnox_customer_number wasn't set during import)
			const supabase = await createClient();
			const { data: existingCustomers } = await supabase
				.from('customers')
				.select('fortnox_customer_number, customer_no, company_name, first_name, last_name')
				.eq('org_id', membership.org_id);

			// Build sets of existing customer numbers (both fortnox_customer_number and customer_no)
			const existingFortnoxNumbers = new Set<string>();
			const existingCustomerNos = new Set<string>();

			existingCustomers?.forEach(c => {
				if (c.fortnox_customer_number) {
					existingFortnoxNumbers.add(String(c.fortnox_customer_number).trim());
				}
				if (c.customer_no) {
					existingCustomerNos.add(String(c.customer_no).trim());
				}
			});

			// Log existing customers for debugging
			console.log('[Fortnox Customers API] Existing customers in EP-Tracker:', {
				withFortnoxNumber: existingFortnoxNumbers.size,
				withCustomerNo: existingCustomerNos.size,
				fortnoxNumbers: Array.from(existingFortnoxNumbers).slice(0, 10),
				customerNos: Array.from(existingCustomerNos).slice(0, 10),
				customers: existingCustomers?.slice(0, 5).map(c => ({
					fortnox_no: c.fortnox_customer_number,
					customer_no: c.customer_no,
					name: c.company_name || `${c.first_name} ${c.last_name}`,
				})),
			});

			// Log customer types for debugging
			console.log('[Fortnox Customers API] Customer types from Fortnox:', {
				total: fortnoxCustomers.length,
				company: fortnoxCustomers.filter(c => c.Type === 'COMPANY').length,
				private: fortnoxCustomers.filter(c => c.Type === 'PRIVATE').length,
				unknown: fortnoxCustomers.filter(c => !c.Type).length,
				allCustomers: fortnoxCustomers.map(c => ({
					number: c.CustomerNumber,
					name: c.Name,
					type: c.Type,
					active: c.Active,
				})),
			});

			// Filter out customers that already exist in EP-Tracker
			// Match by fortnox_customer_number OR customer_no (since customer_no might be the same as CustomerNumber)
			const newCustomers = fortnoxCustomers.filter(c => {
				const customerNumber = String(c.CustomerNumber).trim();
				return (
					!existingFortnoxNumbers.has(customerNumber) &&
					!existingCustomerNos.has(customerNumber)
				);
			});

			const filteredOut = fortnoxCustomers.filter(c => {
				const customerNumber = String(c.CustomerNumber).trim();
				return (
					existingFortnoxNumbers.has(customerNumber) ||
					existingCustomerNos.has(customerNumber)
				);
			});

			console.log('[Fortnox Customers API] Filtered results:', {
				total: fortnoxCustomers.length,
				existingByFortnoxNumber: existingFortnoxNumbers.size,
				existingByCustomerNo: existingCustomerNos.size,
				new: newCustomers.length,
				newCompany: newCustomers.filter(c => c.Type === 'COMPANY').length,
				newPrivate: newCustomers.filter(c => c.Type === 'PRIVATE').length,
				filteredOut: filteredOut.map(c => ({
					number: c.CustomerNumber,
					name: c.Name,
					matchedBy: existingFortnoxNumbers.has(String(c.CustomerNumber).trim())
						? 'fortnox_customer_number'
						: 'customer_no',
				})),
			});

			return NextResponse.json({ customers: newCustomers }, { status: 200 });
		} catch (fetchError) {
			console.error('[Fortnox Customers API] Error details:', {
				error: fetchError instanceof Error ? fetchError.message : String(fetchError),
				orgId: membership.org_id,
				limit,
			});
			throw fetchError; // Re-throw to be caught by outer catch
		}
	} catch (error) {
		console.error('Error fetching Fortnox customers:', error);
		if (error instanceof Error) {
			return NextResponse.json(
				{ error: error.message || 'Failed to fetch customers from Fortnox' },
				{ status: 500 }
			);
		}
		return NextResponse.json(
			{ error: 'Failed to fetch customers from Fortnox' },
			{ status: 500 }
		);
	}
}

