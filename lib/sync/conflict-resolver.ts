/**
 * Conflict Resolution Module
 * Handles data conflicts during sync operations
 */

export type ConflictStrategy = 'keep_local' | 'use_server' | 'merge';

export interface ConflictData {
	id: string;
	type: string;
	localData: unknown;
	serverData: unknown;
	localVersion: unknown;
	serverVersion: unknown;
	timestamp: string;
}

export function formatConflictForDisplay(conflict: ConflictData): {
	title: string;
	localSummary: string;
	serverSummary: string;
	recommendation: ConflictStrategy;
} {
	return {
		title: `Conflict in ${conflict.type}`,
		localSummary: JSON.stringify(conflict.localData, null, 2),
		serverSummary: JSON.stringify(conflict.serverData, null, 2),
		recommendation: 'use_server', // Default recommendation
	};
}

