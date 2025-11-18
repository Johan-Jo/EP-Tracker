import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import {
	getFortnoxConnectionForOrg,
	getFortnoxCustomers,
} from '@/lib/integrations/fortnox/client';
import { mapFortnoxCustomerToEPTracker } from '@/lib/integrations/fortnox/customer-mapper';
import { buildCustomerInsert } from '@/lib/services/customer-mapper';

/**
 * POST /api/integrations/fortnox/customers/import
 * Import customers from Fortnox to EP-Tracker
 * Only admin and finance can import customers
 */
export async function POST(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and finance can import customers
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

		// Parse request body
		const body = await request.json();
		const { customerNumbers, limit } = body;

		console.log('[Fortnox Import] Request body:', {
			customerNumbersCount: customerNumbers?.length || 0,
			customerNumbers: customerNumbers,
			limit,
		});

		// Fetch customers from Fortnox
		const fortnoxCustomers = await getFortnoxCustomers(connection, limit || 500);
		console.log('[Fortnox Import] Fetched from Fortnox:', fortnoxCustomers.length);

		// Filter by customerNumbers if provided
		const customersToImport = customerNumbers
			? fortnoxCustomers.filter((c) => customerNumbers.includes(c.CustomerNumber))
			: fortnoxCustomers;

		console.log('[Fortnox Import] Customers to import:', customersToImport.length);

		if (customersToImport.length === 0) {
			return NextResponse.json(
				{ error: 'No customers found to import' },
				{ status: 400 }
			);
		}

		// Map and import customers
		const supabase = await createClient();
		const results = {
			imported: 0,
			skipped: 0,
			skippedArchived: 0, // Track how many were skipped because they're archived
			errors: [] as Array<{ customerNumber: string; error: string }>,
		};

		for (const fortnoxCustomer of customersToImport) {
			try {
				console.log(`[Fortnox Import] Processing customer: ${fortnoxCustomer.CustomerNumber} - ${fortnoxCustomer.Name}`);
				
				// Validate required fields for COMPANY customers
				if (fortnoxCustomer.Type === 'COMPANY' && !fortnoxCustomer.OrganisationNumber) {
					console.warn(`[Fortnox Import] Customer ${fortnoxCustomer.CustomerNumber} is COMPANY but missing OrganisationNumber, skipping`);
					results.errors.push({
						customerNumber: fortnoxCustomer.CustomerNumber,
						error: 'Företagskund saknar organisationsnummer i Fortnox',
					});
					continue;
				}
				
				// Note: PRIVATE customers can be imported without personal_identity_no
				// Fortnox doesn't provide personal identity numbers, but EP-Tracker allows
				// PRIVATE customers without personal_identity_no (unless ROT is enabled)
				// So we'll proceed with the import
				
				// Log raw Fortnox data for debugging
				console.log(`[Fortnox Import] Raw Fortnox customer data:`, {
					CustomerNumber: fortnoxCustomer.CustomerNumber,
					Name: fortnoxCustomer.Name,
					Type: fortnoxCustomer.Type,
					OrganisationNumber: fortnoxCustomer.OrganisationNumber,
					VATNumber: fortnoxCustomer.VATNumber,
					Active: fortnoxCustomer.Active,
				});
				
				// Map Fortnox customer to EP-Tracker format
				const customerPayload = mapFortnoxCustomerToEPTracker(fortnoxCustomer);
				console.log(`[Fortnox Import] Mapped customer:`, {
					customer_no: customerPayload.customer_no,
					type: customerPayload.type,
					personal_identity_no: customerPayload.personal_identity_no,
					org_no: customerPayload.org_no,
				});

				// IMPORTANT: Match existing customers in priority order:
				// 1. By org_no/personal_identity_no (most reliable identifier) - update fortnox_customer_number if missing or different
				// 2. By fortnox_customer_number (if already set correctly)
				// 3. By customer_no (may match Fortnox CustomerNumber)
				// This ensures all customers get their fortnox_customer_number set correctly

				let existingCustomer = null;
				let matchReason = '';

				// Priority 1: Match by org_no (COMPANY) or personal_identity_no (PRIVATE)
				// This is the most reliable way to match customers
				// Note: org_no might be stored with or without dash, so we need to check both formats
				if (customerPayload.type === 'COMPANY' && customerPayload.org_no) {
					// Normalize org_no for comparison (remove dash if present)
					const normalizedOrgNo = customerPayload.org_no.replace(/-/g, '');
					const orgNoWithDash = normalizedOrgNo.length === 10 
						? `${normalizedOrgNo.slice(0, 6)}-${normalizedOrgNo.slice(6)}`
						: customerPayload.org_no;
					
					// Try matching with dash first, then without
					let matchData = null;
					const { data: dataWithDash, error: errorWithDash } = await supabase
						.from('customers')
						.select('id, customer_no, company_name, org_no, fortnox_customer_number, is_archived')
						.eq('org_id', membership.org_id)
						.eq('type', 'COMPANY')
						.eq('org_no', orgNoWithDash)
						.maybeSingle();
					
					if (!errorWithDash && dataWithDash) {
						matchData = dataWithDash;
					} else {
						// Try without dash
						const { data: dataWithoutDash, error: errorWithoutDash } = await supabase
							.from('customers')
							.select('id, customer_no, company_name, org_no, fortnox_customer_number, is_archived')
							.eq('org_id', membership.org_id)
							.eq('type', 'COMPANY')
							.eq('org_no', normalizedOrgNo)
							.maybeSingle();
						
						if (!errorWithoutDash && dataWithoutDash) {
							matchData = dataWithoutDash;
						} else if (errorWithoutDash && errorWithoutDash.code !== 'PGRST116') {
							console.error(`[Fortnox Import] Error checking existing customer by org_no:`, errorWithoutDash);
						}
					}
					
					// Also try matching where org_no in DB has different format (with/without dash)
					if (!matchData) {
						const { data: allCompanyCustomers, error: fetchError } = await supabase
							.from('customers')
							.select('id, customer_no, company_name, org_no, fortnox_customer_number, is_archived')
							.eq('org_id', membership.org_id)
							.eq('type', 'COMPANY')
							.not('org_no', 'is', null);
						
						if (!fetchError && allCompanyCustomers) {
							// Find match by comparing normalized org_no
							for (const customer of allCompanyCustomers) {
								if (customer.org_no) {
									const customerOrgNoNormalized = customer.org_no.replace(/-/g, '');
									if (customerOrgNoNormalized === normalizedOrgNo) {
										matchData = customer;
										break;
									}
								}
							}
						}
					}

					if (matchData) {
						existingCustomer = matchData;
						matchReason = 'org_no';
					}
				} else if (customerPayload.type === 'PRIVATE' && customerPayload.personal_identity_no) {
					const { data, error: checkError4 } = await supabase
						.from('customers')
						.select('id, customer_no, first_name, last_name, personal_identity_no, fortnox_customer_number, is_archived')
						.eq('org_id', membership.org_id)
						.eq('type', 'PRIVATE')
						.eq('personal_identity_no', customerPayload.personal_identity_no)
						.maybeSingle();

					if (checkError4 && checkError4.code !== 'PGRST116') {
						console.error(`[Fortnox Import] Error checking existing customer by personal_identity_no:`, checkError4);
					} else if (data) {
						existingCustomer = data;
						matchReason = 'personal_identity_no';
					}
				}

				// Priority 2: If not matched by identifier, check by fortnox_customer_number
				if (!existingCustomer) {
					const { data, error: checkError1 } = await supabase
						.from('customers')
						.select('id, customer_no, company_name, first_name, last_name, fortnox_customer_number, org_no, personal_identity_no, is_archived')
						.eq('org_id', membership.org_id)
						.eq('fortnox_customer_number', fortnoxCustomer.CustomerNumber)
						.maybeSingle();

					if (checkError1 && checkError1.code !== 'PGRST116') {
						console.error(`[Fortnox Import] Error checking existing customer by fortnox_customer_number:`, checkError1);
					} else if (data) {
						existingCustomer = data;
						matchReason = 'fortnox_customer_number';
					}
				}

				// Priority 3: If still not matched, check by customer_no
				if (!existingCustomer) {
					const { data: existingByCustomerNo, error: checkError2 } = await supabase
						.from('customers')
						.select('id, customer_no, company_name, first_name, last_name, fortnox_customer_number, org_no, personal_identity_no, is_archived')
						.eq('org_id', membership.org_id)
						.eq('customer_no', customerPayload.customer_no)
						.maybeSingle();

					if (checkError2 && checkError2.code !== 'PGRST116') {
						console.error(`[Fortnox Import] Error checking existing customer by customer_no:`, checkError2);
					} else if (existingByCustomerNo) {
						existingCustomer = existingByCustomerNo;
						matchReason = 'customer_no';
					}
				}

				// If we found an existing customer, update fortnox_customer_number if needed
				if (existingCustomer) {
					const customerName = existingCustomer.company_name || `${existingCustomer.first_name || ''} ${existingCustomer.last_name || ''}`.trim();
					console.log(`[Fortnox Import] Found existing customer (matched by ${matchReason}):`, {
						id: existingCustomer.id,
						customer_no: existingCustomer.customer_no,
						fortnox_customer_number: existingCustomer.fortnox_customer_number,
						name: customerName,
						is_archived: existingCustomer.is_archived,
					});

					// Always update fortnox_customer_number if it's missing or different
					// This ensures all customers get their Fortnox number set correctly
					if (!existingCustomer.fortnox_customer_number || existingCustomer.fortnox_customer_number !== fortnoxCustomer.CustomerNumber) {
						const oldNumber = existingCustomer.fortnox_customer_number || 'null';
						console.log(`[Fortnox Import] Updating existing customer ${existingCustomer.id} with Fortnox customer number ${fortnoxCustomer.CustomerNumber} (was: ${oldNumber})`);
						
						const { error: updateError } = await supabase
							.from('customers')
							.update({ fortnox_customer_number: fortnoxCustomer.CustomerNumber })
							.eq('id', existingCustomer.id);
						
						if (updateError) {
							console.error(`[Fortnox Import] Error updating fortnox_customer_number:`, updateError);
							results.errors.push({
								customerNumber: fortnoxCustomer.CustomerNumber,
								error: `Kunde inte uppdatera Fortnox-kundnummer: ${updateError.message}`,
							});
						} else {
							console.log(`[Fortnox Import] Successfully updated fortnox_customer_number for customer ${existingCustomer.id}`);
							results.imported++; // Count as imported since we updated it
						}
					} else {
						console.log(`[Fortnox Import] Customer ${existingCustomer.id} already has correct fortnox_customer_number (${existingCustomer.fortnox_customer_number}), skipping`);
						results.skipped++;
					}
					
					if (existingCustomer.is_archived) {
						results.skippedArchived++;
					}
					continue;
				}

				// Build insert payload
				const insertPayload = buildCustomerInsert({
					payload: customerPayload,
					orgId: membership.org_id,
					userId: user.id,
				});

				console.log(`[Fortnox Import] Insert payload:`, {
					type: insertPayload.type,
					personal_identity_no: insertPayload.personal_identity_no,
					org_no: insertPayload.org_no,
					first_name: insertPayload.first_name,
					last_name: insertPayload.last_name,
					company_name: insertPayload.company_name,
				});

				// Insert customer
				const { data: insertedCustomer, error: insertError } = await supabase
					.from('customers')
					.insert(insertPayload)
					.select('id, customer_no, type, personal_identity_no, org_no, first_name, last_name, company_name')
					.single();

				if (insertError) {
					// Handle duplicate customer_no error
					if (insertError.code === '23505') {
						console.log(`[Fortnox Import] Duplicate customer_no ${customerPayload.customer_no}, skipping`);
						results.skipped++;
					} else {
						console.error(`[Fortnox Import] Insert error for ${fortnoxCustomer.CustomerNumber}:`, insertError);
						throw insertError;
					}
				} else {
					console.log(`[Fortnox Import] Successfully imported: ${insertedCustomer?.customer_no} (ID: ${insertedCustomer?.id})`);
					console.log(`[Fortnox Import] Saved customer data:`, {
						type: insertedCustomer?.type,
						personal_identity_no: insertedCustomer?.personal_identity_no,
						org_no: insertedCustomer?.org_no,
						first_name: insertedCustomer?.first_name,
						last_name: insertedCustomer?.last_name,
						company_name: insertedCustomer?.company_name,
					});
					results.imported++;
				}
			} catch (error) {
				console.error(`[Fortnox Import] Error importing customer ${fortnoxCustomer.CustomerNumber}:`, error);
				results.errors.push({
					customerNumber: fortnoxCustomer.CustomerNumber,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		console.log('[Fortnox Import] Final results:', results);

		// Build detailed message
		let message = `Importerade ${results.imported} kund${results.imported !== 1 ? 'er' : ''}`;
		if (results.skipped > 0) {
			if (results.skippedArchived > 0) {
				message += `, hoppade över ${results.skipped} kund${results.skipped !== 1 ? 'er' : ''} (${results.skippedArchived} är arkiverade och syns inte i standardlistan)`;
			} else {
				message += `, hoppade över ${results.skipped} befintlig${results.skipped !== 1 ? 'a' : ''} kund${results.skipped !== 1 ? 'er' : ''}`;
			}
		}
		if (results.errors.length > 0) {
			message += `, ${results.errors.length} fel`;
		}

		return NextResponse.json(
			{
				success: true,
				results,
				message,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error importing Fortnox customers:', error);
		if (error instanceof Error) {
			return NextResponse.json(
				{ error: error.message || 'Failed to import customers from Fortnox' },
				{ status: 500 }
			);
		}
		return NextResponse.json(
			{ error: 'Failed to import customers from Fortnox' },
			{ status: 500 }
		);
	}
}

