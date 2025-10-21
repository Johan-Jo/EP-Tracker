/**
 * Feature Flags System
 * 
 * Manage global feature toggles for the application.
 * Super admins can enable/disable features across all organizations.
 */

import { createClient } from '@/lib/supabase/server';

export interface FeatureFlag {
	id: string;
	flag_name: string;
	is_enabled: boolean;
	description: string | null;
	updated_by: string | null;
	updated_at: string;
}

export interface CreateFeatureFlagInput {
	flag_name: string;
	is_enabled?: boolean;
	description?: string;
}

/**
 * Get all feature flags
 */
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('feature_flags')
		.select('*')
		.order('flag_name', { ascending: true });

	if (error) {
		console.error('Error fetching feature flags:', error);
		throw new Error('Kunde inte hämta feature flags');
	}

	return data || [];
}

/**
 * Get a single feature flag by name
 */
export async function getFeatureFlag(flagName: string): Promise<FeatureFlag | null> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('feature_flags')
		.select('*')
		.eq('flag_name', flagName)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null; // Not found
		}
		console.error('Error fetching feature flag:', error);
		throw new Error('Kunde inte hämta feature flag');
	}

	return data;
}

/**
 * Check if a feature is enabled
 * Returns false if flag doesn't exist
 */
export async function isFeatureEnabled(flagName: string): Promise<boolean> {
	const flag = await getFeatureFlag(flagName);
	return flag?.is_enabled ?? false;
}

/**
 * Toggle a feature flag
 */
export async function toggleFeatureFlag(
	flagName: string,
	isEnabled: boolean,
	updatedBy: string
): Promise<FeatureFlag> {
	const supabase = await createClient();

	// Check if flag exists
	const existing = await getFeatureFlag(flagName);

	if (!existing) {
		throw new Error(`Feature flag '${flagName}' finns inte`);
	}

	// Update the flag
	const { data, error } = await supabase
		.from('feature_flags')
		.update({
			is_enabled: isEnabled,
			updated_by: updatedBy,
			updated_at: new Date().toISOString(),
		})
		.eq('flag_name', flagName)
		.select()
		.single();

	if (error) {
		console.error('Error toggling feature flag:', error);
		throw new Error('Kunde inte uppdatera feature flag');
	}

	return data;
}

/**
 * Create a new feature flag
 */
export async function createFeatureFlag(
	input: CreateFeatureFlagInput,
	createdBy: string
): Promise<FeatureFlag> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from('feature_flags')
		.insert({
			flag_name: input.flag_name,
			is_enabled: input.is_enabled ?? false,
			description: input.description || null,
			updated_by: createdBy,
		})
		.select()
		.single();

	if (error) {
		console.error('Error creating feature flag:', error);
		if (error.code === '23505') {
			throw new Error(`Feature flag '${input.flag_name}' finns redan`);
		}
		throw new Error('Kunde inte skapa feature flag');
	}

	return data;
}

/**
 * Delete a feature flag
 */
export async function deleteFeatureFlag(flagName: string): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase
		.from('feature_flags')
		.delete()
		.eq('flag_name', flagName);

	if (error) {
		console.error('Error deleting feature flag:', error);
		throw new Error('Kunde inte ta bort feature flag');
	}
}

/**
 * Seed default feature flags
 * Call this once to populate the database with standard flags
 */
export async function seedDefaultFeatureFlags(createdBy: string): Promise<void> {
	const defaultFlags: CreateFeatureFlagInput[] = [
		{
			flag_name: 'enable_ata',
			is_enabled: true,
			description: 'Aktivera ÄTA (Ändrings- och tilläggsarbeten) funktionalitet',
		},
		{
			flag_name: 'enable_diary',
			is_enabled: true,
			description: 'Aktivera dagbok-funktionalitet',
		},
		{
			flag_name: 'enable_checklists',
			is_enabled: true,
			description: 'Aktivera checklistor',
		},
		{
			flag_name: 'enable_offline_mode',
			is_enabled: true,
			description: 'Aktivera offline-läge och synkronisering',
		},
		{
			flag_name: 'enable_pwa_install',
			is_enabled: true,
			description: 'Visa PWA installationsprompt',
		},
		{
			flag_name: 'enable_photo_upload',
			is_enabled: true,
			description: 'Aktivera fotouppladdning',
		},
		{
			flag_name: 'enable_crew_management',
			is_enabled: true,
			description: 'Aktivera crew management (stampa in flera)',
		},
		{
			flag_name: 'enable_csv_exports',
			is_enabled: true,
			description: 'Aktivera CSV-export (lön och faktura)',
		},
		{
			flag_name: 'enable_approvals',
			is_enabled: true,
			description: 'Aktivera godkännanden',
		},
		{
			flag_name: 'enable_onboarding',
			is_enabled: true,
			description: 'Visa onboarding-flöde för nya användare',
		},
	];

	for (const flag of defaultFlags) {
		try {
			const existing = await getFeatureFlag(flag.flag_name);
			if (!existing) {
				await createFeatureFlag(flag, createdBy);
				console.log(`Created feature flag: ${flag.flag_name}`);
			}
		} catch (error) {
			console.error(`Error seeding flag ${flag.flag_name}:`, error);
		}
	}
}

