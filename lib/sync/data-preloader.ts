/**
 * Data Preloading System
 * Caches critical data in IndexedDB on login for offline access
 */

import { db as getDB } from '@/lib/db/offline-store';
import { createClient } from '@/lib/supabase/client';

/**
 * Timeout wrapper for async operations
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
		),
	]);
}

export interface PreloadOptions {
	userId: string;
	orgId: string;
	daysBack?: number;
}

export interface PreloadStats {
	projects: number;
	timeEntries: number;
	materials: number;
	expenses: number;
	mileage: number;
	duration: number;
}

/**
 * Preload all critical user data for offline access
 * 
 * @throws Error if operation times out (60 seconds) or fails
 */
export async function preloadUserData(options: PreloadOptions): Promise<PreloadStats> {
	const db = await getDB();
	if (!db) {
		throw new Error('Database not available (server-side)');
	}
	// Wrap entire preload operation with 60 second timeout
	return withTimeout(
		preloadUserDataInternal(options),
		60000, // 60 seconds
		'timeout: Data preload tog för lång tid'
	);
}

/**
 * Internal preload implementation (with no timeout)
 */
async function preloadUserDataInternal(options: PreloadOptions): Promise<PreloadStats> {
	const startTime = Date.now();
	const { userId, orgId, daysBack = 30 } = options;

	console.log(`📥 Starting data preload for last ${daysBack} days...`);

	const supabase = createClient();
	const db = await getDB();
	
	// If no DB (server-side), skip preloading
	if (!db) {
		console.log('⚠️ Skipping preload (server-side or DB unavailable)');
		return {
			projects: 0,
			timeEntries: 0,
			materials: 0,
			expenses: 0,
			mileage: 0,
			duration: 0,
		};
	}
	
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysBack);
	const cutoffISO = cutoffDate.toISOString();

	const stats: PreloadStats = {
		projects: 0,
		timeEntries: 0,
		materials: 0,
		expenses: 0,
		mileage: 0,
		duration: 0,
	};

	try {
		// 1. Preload active projects
		console.log('📦 Preloading projects...');
		const { data: projects } = await supabase
			.from('projects')
			.select('*')
			.eq('org_id', orgId)
			.in('status', ['active', 'paused']);

		if (projects && projects.length > 0) {
			await db.projects.bulkPut(projects);
			stats.projects = projects.length;
			console.log(`✅ Cached ${projects.length} projects`);
		}

		// 2. Preload recent time entries
		console.log('⏱️ Preloading time entries...');
		const { data: timeEntries } = await supabase
			.from('time_entries')
			.select('*')
			.eq('org_id', orgId)
			.eq('user_id', userId)
			.gte('start_at', cutoffISO)
			.order('start_at', { ascending: false })
			.limit(100);

		if (timeEntries && timeEntries.length > 0) {
			const processedEntries = timeEntries.map((entry) => ({
				...entry,
				synced: true,
			}));
			await db.time_entries.bulkPut(processedEntries);
			stats.timeEntries = timeEntries.length;
			console.log(`✅ Cached ${timeEntries.length} time entries`);
		}

		// 3. Preload recent materials
		console.log('🔨 Preloading materials...');
		const { data: materials } = await supabase
			.from('materials')
			.select('*')
			.eq('org_id', orgId)
			.eq('user_id', userId)
			.gte('created_at', cutoffISO)
			.order('created_at', { ascending: false })
			.limit(50);

		if (materials && materials.length > 0) {
			const processedMaterials = materials.map((material) => ({
				...material,
				synced: true,
			}));
			await db.materials.bulkPut(processedMaterials);
			stats.materials = materials.length;
			console.log(`✅ Cached ${materials.length} materials`);
		}

		// 4. Preload recent expenses
		console.log('💰 Preloading expenses...');
		const { data: expenses } = await supabase
			.from('expenses')
			.select('*')
			.eq('org_id', orgId)
			.eq('user_id', userId)
			.gte('created_at', cutoffISO)
			.order('created_at', { ascending: false })
			.limit(50);

		if (expenses && expenses.length > 0) {
			const processedExpenses = expenses.map((expense) => ({
				...expense,
				synced: true,
			}));
			await db.expenses.bulkPut(processedExpenses);
			stats.expenses = expenses.length;
			console.log(`✅ Cached ${expenses.length} expenses`);
		}

		// 5. Preload recent mileage (Note: mileage table not in offline-store schema yet)
		// Skipping for now to avoid errors

		const duration = Date.now() - startTime;
		stats.duration = duration;

		console.log(`🎉 Data preload complete in ${duration}ms`);
		console.log('📊 Stats:', stats);

		return stats;
	} catch (error) {
		console.error('❌ Data preload failed:', error);
		throw error;
	}
}

/**
 * Clear all cached offline data (useful for logout or switching orgs)
 */
export async function clearOfflineData(): Promise<void> {
	const db = await getDB();
	if (!db) return;
	console.log('🗑️ Clearing offline data...');

	try {
		await Promise.all([
			db.projects.clear(),
			db.time_entries.clear(),
			db.materials.clear(),
			db.expenses.clear(),
			db.sync_queue.clear(),
		]);

		console.log('✅ Offline data cleared');
	} catch (error) {
		console.error('❌ Failed to clear offline data:', error);
		throw error;
	}
}

/**
 * Get offline data statistics
 */
export async function getOfflineStats(): Promise<{
	projects: number;
	timeEntries: number;
	materials: number;
	expenses: number;
	pendingSync: number;
}> {
	const db = await getDB();
	if (!db) {
		return { projects: 0, timeEntries: 0, materials: 0, expenses: 0, pendingSync: 0 };
	}
	const [projects, timeEntries, materials, expenses, pendingSync] = await Promise.all([
		db.projects.count(),
		db.time_entries.count(),
		db.materials.count(),
		db.expenses.count(),
		db.sync_queue.count(),
	]);

	return {
		projects,
		timeEntries,
		materials,
		expenses,
		pendingSync,
	};
}

/**
 * Refresh cached data (useful for periodic updates)
 */
export async function refreshOfflineData(options: PreloadOptions): Promise<PreloadStats> {
	console.log('🔄 Refreshing offline data...');

	// Clear existing data
	await clearOfflineData();

	// Reload fresh data
	return await preloadUserData(options);
}

