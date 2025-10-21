/**
 * Maintenance Mode System
 * 
 * Control site-wide maintenance mode.
 * Super admins can enable/disable maintenance and set custom messages.
 */

import { createClient } from '@/lib/supabase/server';

export interface MaintenanceMode {
	id: string;
	is_active: boolean;
	message: string | null;
	scheduled_start: string | null;
	scheduled_end: string | null;
	enabled_by: string | null;
	enabled_at: string | null;
}

export interface EnableMaintenanceInput {
	message?: string;
	scheduled_start?: string;
	scheduled_end?: string;
}

/**
 * Get current maintenance mode status
 */
export async function getMaintenanceStatus(): Promise<MaintenanceMode | null> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('maintenance_mode')
		.select('*')
		.order('enabled_at', { ascending: false })
		.limit(1)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null; // No records yet
		}
		console.error('Error fetching maintenance status:', error);
		throw new Error('Kunde inte hämta underhållsstatus');
	}

	return data;
}

/**
 * Check if maintenance mode is active
 */
export async function isInMaintenanceMode(): Promise<boolean> {
	const status = await getMaintenanceStatus();
	return status?.is_active ?? false;
}

/**
 * Enable maintenance mode
 */
export async function enableMaintenanceMode(
	input: EnableMaintenanceInput,
	enabledBy: string
): Promise<MaintenanceMode> {
	const supabase = await createClient();

	// Check if there's an existing record
	const existing = await getMaintenanceStatus();

	let data;
	let error;

	if (existing) {
		// Update existing record
		const result = await supabase
			.from('maintenance_mode')
			.update({
				is_active: true,
				message: input.message || 'Systemet är tillfälligt under underhåll. Vänligen försök igen senare.',
				scheduled_start: input.scheduled_start || null,
				scheduled_end: input.scheduled_end || null,
				enabled_by: enabledBy,
				enabled_at: new Date().toISOString(),
			})
			.eq('id', existing.id)
			.select()
			.single();

		data = result.data;
		error = result.error;
	} else {
		// Create new record
		const result = await supabase
			.from('maintenance_mode')
			.insert({
				is_active: true,
				message: input.message || 'Systemet är tillfälligt under underhåll. Vänligen försök igen senare.',
				scheduled_start: input.scheduled_start || null,
				scheduled_end: input.scheduled_end || null,
				enabled_by: enabledBy,
				enabled_at: new Date().toISOString(),
			})
			.select()
			.single();

		data = result.data;
		error = result.error;
	}

	if (error) {
		console.error('Error enabling maintenance mode:', error);
		throw new Error('Kunde inte aktivera underhållsläge');
	}

	return data;
}

/**
 * Disable maintenance mode
 */
export async function disableMaintenanceMode(): Promise<MaintenanceMode> {
	const supabase = await createClient();

	const existing = await getMaintenanceStatus();

	if (!existing) {
		throw new Error('Inget underhållsläge att inaktivera');
	}

	const { data, error } = await supabase
		.from('maintenance_mode')
		.update({
			is_active: false,
		})
		.eq('id', existing.id)
		.select()
		.single();

	if (error) {
		console.error('Error disabling maintenance mode:', error);
		throw new Error('Kunde inte inaktivera underhållsläge');
	}

	return data;
}

/**
 * Update maintenance mode message
 */
export async function updateMaintenanceMessage(message: string): Promise<MaintenanceMode> {
	const supabase = await createClient();

	const existing = await getMaintenanceStatus();

	if (!existing) {
		throw new Error('Inget underhållsläge att uppdatera');
	}

	const { data, error } = await supabase
		.from('maintenance_mode')
		.update({ message })
		.eq('id', existing.id)
		.select()
		.single();

	if (error) {
		console.error('Error updating maintenance message:', error);
		throw new Error('Kunde inte uppdatera meddelande');
	}

	return data;
}

/**
 * Schedule future maintenance
 */
export async function scheduleMaintenanceMode(
	input: Required<EnableMaintenanceInput>,
	scheduledBy: string
): Promise<MaintenanceMode> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('maintenance_mode')
		.insert({
			is_active: false, // Not active yet
			message: input.message,
			scheduled_start: input.scheduled_start,
			scheduled_end: input.scheduled_end,
			enabled_by: scheduledBy,
		})
		.select()
		.single();

	if (error) {
		console.error('Error scheduling maintenance:', error);
		throw new Error('Kunde inte schemalägga underhåll');
	}

	return data;
}

