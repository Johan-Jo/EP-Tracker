import { createClient } from '@/lib/supabase/server';

/**
 * Type definition for a Fortnox connection row from the database
 */
export interface FortnoxConnection {
	id: string;
	org_id: string;
	access_token: string;
	refresh_token: string;
	access_token_expires_at: string;
	scopes: string | null;
	fortnox_customer_number: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Fortnox API error response structure
 * Based on Fortnox API v3 error responses
 */
interface FortnoxErrorResponse {
	ErrorInformation?: {
		error?: number;
		message?: string;
		code?: string;
	};
	message?: string;
	error?: string;
	error_description?: string;
}

/**
 * Get Fortnox connection for an organization
 * @param orgId Organization ID
 * @returns Fortnox connection or null if not found
 */
export async function getFortnoxConnectionForOrg(orgId: string): Promise<FortnoxConnection | null> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('fortnox_connections')
		.select('*')
		.eq('org_id', orgId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			// No rows returned
			return null;
		}
		throw new Error(`Failed to fetch Fortnox connection: ${error.message}`);
	}

	return data as FortnoxConnection;
}

/**
 * Refresh access token if it has expired
 * @param connection Fortnox connection
 * @returns Updated connection with fresh tokens
 */
export async function refreshAccessTokenIfNeeded(
	connection: FortnoxConnection
): Promise<FortnoxConnection> {
	const expiresAt = new Date(connection.access_token_expires_at);
	const now = new Date();

	// Refresh if token expires in less than 5 minutes (buffer for clock skew)
	if (expiresAt.getTime() > now.getTime() + 5 * 60 * 1000) {
		return connection;
	}

	// Token needs refresh
	const clientId = process.env.FORTNOX_CLIENT_ID;
	const clientSecret = process.env.FORTNOX_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new Error('FORTNOX_CLIENT_ID and FORTNOX_CLIENT_SECRET must be set');
	}

	// Fortnox OAuth token endpoint
	// Fortnox uses apps.fortnox.se for OAuth, not api.fortnox.se
	const tokenUrl = 'https://apps.fortnox.se/oauth-v1/token';

	// Prepare refresh token request
	const params = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: connection.refresh_token,
		client_id: clientId,
		client_secret: clientSecret,
	});

	const response = await fetch(tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: params.toString(),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to refresh Fortnox access token: ${response.status} ${errorText}`);
	}

	const tokenData = await response.json();

	// Calculate expiration time (Fortnox tokens typically expire in 3600 seconds)
	const expiresIn = tokenData.expires_in || 3600;
	const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

	// Update connection in database
	const supabase = await createClient();
	const { data: updatedConnection, error: updateError } = await supabase
		.from('fortnox_connections')
		.update({
			access_token: tokenData.access_token,
			refresh_token: tokenData.refresh_token || connection.refresh_token,
			access_token_expires_at: newExpiresAt.toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('id', connection.id)
		.select()
		.single();

	if (updateError || !updatedConnection) {
		throw new Error(`Failed to update Fortnox connection: ${updateError?.message || 'Unknown error'}`);
	}

	return updatedConnection as FortnoxConnection;
}

/**
 * Create an invoice in Fortnox
 * @param connection Fortnox connection (will be refreshed if needed)
 * @param payload Invoice payload (will be wrapped in { Invoice: ... } format)
 * @returns Parsed JSON response from Fortnox
 */
export async function createFortnoxInvoice(
	connection: FortnoxConnection,
	payload: unknown
): Promise<unknown> {
	// Ensure token is fresh
	const freshConnection = await refreshAccessTokenIfNeeded(connection);

	// Fortnox API endpoint for invoices
	const apiUrl = 'https://api.fortnox.se/3/invoices';

	// Wrap payload according to Fortnox convention
	const wrappedPayload = {
		Invoice: payload,
	};

	// Log payload to verify no TotalExcludingVAT
	console.log('[Fortnox Client] Sending invoice to Fortnox API');
	console.log('[Fortnox Client] Payload keys:', Object.keys(payload as any));
	
	// Log InvoiceRows to see what fields we're sending
	if ((payload as any).InvoiceRows) {
		console.log('[Fortnox Client] InvoiceRows count:', (payload as any).InvoiceRows.length);
		if ((payload as any).InvoiceRows.length > 0) {
			console.log('[Fortnox Client] First InvoiceRow fields:', Object.keys((payload as any).InvoiceRows[0]!));
			console.log('[Fortnox Client] First InvoiceRow:', JSON.stringify((payload as any).InvoiceRows[0], null, 2));
		}
	}
	
	const payloadStr = JSON.stringify(wrappedPayload);
	if (payloadStr.includes('TotalExcludingVAT') || payloadStr.includes('TotalVAT') || payloadStr.includes('"Total":')) {
		console.error('[Fortnox Client] ERROR: Payload contains total fields!', payloadStr);
	}

	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${freshConnection.access_token}`,
			'Content-Type': 'application/json',
		},
		body: payloadStr,
	});

	const responseText = await response.text();
	let responseData: unknown;

	try {
		responseData = JSON.parse(responseText);
	} catch {
		// If response is not JSON, log the raw text and throw
		console.error('[Fortnox Client] Non-JSON response received:', {
			status: response.status,
			statusText: response.statusText,
			responseText: responseText.substring(0, 500), // Limit length for logging
		});
		throw new Error(`Fortnox API returned non-JSON response: ${response.status} ${response.statusText}`);
	}

	if (!response.ok) {
		const error = responseData as FortnoxErrorResponse;
		
		// Extract error message from various possible locations in Fortnox error response
		const errorMessage =
			error.ErrorInformation?.message ||
			error.ErrorInformation?.code ||
			error.message ||
			error.error ||
			error.error_description ||
			`Fortnox API error: ${response.status} ${response.statusText}`;
		
		// Log detailed error information for debugging
		console.error('[Fortnox Client] Fortnox API error:', {
			status: response.status,
			statusText: response.statusText,
			errorMessage,
			errorResponse: error,
			responseText: responseText.substring(0, 1000), // Limit length for logging
		});
		
		// Create a more detailed error message if ErrorInformation is present
		if (error.ErrorInformation) {
			const detailedMessage = error.ErrorInformation.code
				? `${errorMessage} (Code: ${error.ErrorInformation.code})`
				: errorMessage;
			throw new Error(detailedMessage);
		}
		
		throw new Error(errorMessage);
	}

	return responseData;
}

/**
 * Fortnox Customer type (from API response)
 */
export interface FortnoxCustomer {
	CustomerNumber: string;
	Name: string;
	Address1?: string;
	Address2?: string;
	ZipCode?: string;
	City?: string;
	Country?: string;
	CountryCode?: string;
	Phone1?: string;
	Phone2?: string;
	Email?: string;
	EmailInvoice?: string;
	EmailInvoiceBCC?: string;
	EmailOffer?: string;
	EmailOrder?: string;
	VATNumber?: string;
	OrganisationNumber?: string;
	GLN?: string;
	OurReference?: string;
	YourReference?: string;
	DefaultDeliveryType?: string;
	DefaultDeliveryAddress?: string;
	DefaultTemplates?: {
		Invoice?: string;
		Offer?: string;
		Order?: string;
	};
	DefaultCurrency?: string;
	DefaultPaymentTerms?: number;
	DefaultWayOfDelivery?: string;
	SalesAccount?: string;
	ShowPriceVATIncluded?: boolean;
	Type?: 'PRIVATE' | 'COMPANY';
	VATType?: string;
	PriceList?: string;
	Discount?: number;
	TermsOfPayment?: string;
	BankAccountNumber?: string;
	BankAccountNumber2?: string;
	BankAccountNumber3?: string;
	BankAccountNumber4?: string;
	BankAccountNumber5?: string;
	BankAccountNumber6?: string;
	BankAccountNumber7?: string;
	BankAccountNumber8?: string;
	BankAccountNumber9?: string;
	BankAccountNumber10?: string;
	InvoiceLanguage?: string;
	InvoiceDiscount?: number;
	Active?: boolean;
	CostCenter?: string;
	Project?: string;
	Notes?: string;
}

/**
 * Get customers from Fortnox
 * @param connection Fortnox connection (will be refreshed if needed)
 * @param limit Maximum number of customers to fetch (default: 100)
 * @returns Array of Fortnox customers
 */
export async function getFortnoxCustomers(
	connection: FortnoxConnection,
	limit: number = 100
): Promise<FortnoxCustomer[]> {
	// Ensure token is fresh
	const freshConnection = await refreshAccessTokenIfNeeded(connection);

	// Fortnox API endpoint for customers
	const apiUrl = `https://api.fortnox.se/3/customers?limit=${limit}`;

	const response = await fetch(apiUrl, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${freshConnection.access_token}`,
			'Content-Type': 'application/json',
		},
	});

	const responseText = await response.text();
	let responseData: unknown;

	try {
		responseData = JSON.parse(responseText);
	} catch {
		console.error('[Fortnox] Failed to parse response:', responseText);
		throw new Error(`Fortnox API returned non-JSON response: ${responseText.substring(0, 200)}`);
	}

	if (!response.ok) {
		const error = responseData as FortnoxErrorResponse;
		const errorMessage =
			error.ErrorInformation?.message ||
			error.message ||
			`Fortnox API error: ${response.status} ${response.statusText}`;
		console.error('[Fortnox] API error:', {
			status: response.status,
			statusText: response.statusText,
			error: errorMessage,
			response: responseData,
		});
		throw new Error(errorMessage);
	}

	// Fortnox returns { Customers: [...] }
	const data = responseData as { Customers?: FortnoxCustomer[] };
	const customers = data.Customers || [];
	
	console.log('[Fortnox] Fetched customers:', {
		count: customers.length,
		active: customers.filter(c => c.Active !== false).length,
		inactive: customers.filter(c => c.Active === false).length,
	});
	
	// Return all customers (both active and inactive)
	// The UI can filter if needed
	return customers;
}

/**
 * Fortnox company information response structure
 */
export interface FortnoxCompanyInformation {
	CompanyInformation?: {
		CompanyName?: string;
		OrganisationNumber?: string;
		Address?: string;
		Address2?: string;
		PostalCode?: string;
		City?: string;
		Country?: string;
		Phone?: string;
		Email?: string;
		Website?: string;
		Currency?: string;
		VATNumber?: string;
		CustomerNumber?: string; // This is the Fortnox customer number for the company
		[key: string]: unknown;
	};
}

/**
 * Get company information from Fortnox
 * This includes the Fortnox customer number for the organization
 * @param connection Fortnox connection (will be refreshed if needed)
 * @returns Company information including customer number
 */
export async function getFortnoxCompanyInformation(
	connection: FortnoxConnection
): Promise<FortnoxCompanyInformation['CompanyInformation']> {
	// Ensure token is fresh
	const freshConnection = await refreshAccessTokenIfNeeded(connection);

	// Fortnox API endpoint for company information
	const apiUrl = 'https://api.fortnox.se/3/companyinformation';

	const response = await fetch(apiUrl, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${freshConnection.access_token}`,
			'Content-Type': 'application/json',
		},
	});

	const responseText = await response.text();
	let responseData: unknown;

	try {
		responseData = JSON.parse(responseText);
	} catch {
		throw new Error(`Fortnox API returned non-JSON response: ${responseText}`);
	}

	if (!response.ok) {
		const error = responseData as FortnoxErrorResponse;
		const errorMessage =
			error.ErrorInformation?.message ||
			error.message ||
			`Fortnox API error: ${response.status} ${response.statusText}`;
		throw new Error(errorMessage);
	}

	// Fortnox returns { CompanyInformation: {...} }
	const data = responseData as FortnoxCompanyInformation;
	return data.CompanyInformation || null;
}


