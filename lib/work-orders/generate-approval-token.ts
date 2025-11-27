import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generate a unique approval token for a work order
 * Uses the database function if available, otherwise generates client-side
 */
export async function generateApprovalToken(
	supabase: SupabaseClient,
	workOrderId: string
): Promise<string> {
	try {
		// Try to use database function first
		const { data, error } = await supabase.rpc('generate_approval_token');

		if (!error && data) {
			return data;
		}

		// Fallback: generate client-side token
		console.warn('[generateApprovalToken] Database function not available, using client-side generation');
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		const token = Buffer.from(array).toString('base64url');
		return token;
	} catch (error) {
		// Fallback: generate client-side token
		console.warn('[generateApprovalToken] Error calling database function, using client-side generation', error);
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		const token = Buffer.from(array).toString('base64url');
		return token;
	}
}

