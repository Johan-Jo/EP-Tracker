import { db, type SyncQueue } from '@/lib/db/offline-store';

export type SyncAction = 'create' | 'update' | 'delete';
export type SyncEntity = 'time_entry' | 'material' | 'expense' | 'mileage' | 'travel_time';

interface QueueItem {
	action: SyncAction;
	entity: SyncEntity;
	entity_id: string;
	payload: unknown;
}

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

export class OfflineQueueManager {
	private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
	private syncInProgress: boolean = false;

	constructor() {
		if (typeof window !== 'undefined') {
			// Listen for online/offline events
			window.addEventListener('online', () => {
				console.warn('🌐 Connection restored - starting sync');
				this.isOnline = true;
				this.processSyncQueue();
			});

			window.addEventListener('offline', () => {
				console.warn('📡 Connection lost - offline mode activated');
				this.isOnline = false;
			});
		}
	}

	/**
	 * Add an item to the sync queue
	 */
	async enqueue(item: QueueItem): Promise<void> {
		const database = await db();
		if (!database) {
			console.warn('Database not available (server-side), skipping queue');
			return;
		}
		
		try {
			await database.sync_queue.add({
				action: item.action,
				entity: item.entity,
				entity_id: item.entity_id,
				payload: item.payload,
				created_at: new Date().toISOString(),
				retry_count: 0,
			});

			console.warn(`✅ Added to sync queue: ${item.action} ${item.entity}`, item.entity_id);

			// Try to sync immediately if online
			if (this.isOnline && !this.syncInProgress) {
				this.processSyncQueue();
			}
		} catch (error) {
			console.error('❌ Failed to add to sync queue:', error);
			throw error;
		}
	}

	/**
	 * Process all pending items in the sync queue
	 */
	async processSyncQueue(): Promise<void> {
		const database = await db();
		if (!database) return;
		
		if (this.syncInProgress) {
			console.warn('⏳ Sync already in progress, skipping...');
			return;
		}

		if (!this.isOnline) {
			console.warn('📡 Offline, sync postponed');
			return;
		}

		this.syncInProgress = true;

		try {
			const queue = await database.sync_queue.orderBy('created_at').toArray();

			if (queue.length === 0) {
				console.warn('✨ Sync queue is empty');
				return;
			}

			console.warn(`🔄 Processing ${queue.length} items in sync queue`);

			for (const item of queue) {
				try {
					await this.syncItem(item);
					// Remove from queue after successful sync
					await database.sync_queue.delete(item.id!);
					console.warn(`✅ Synced and removed: ${item.entity} ${item.entity_id}`);
				} catch (error) {
					console.error(`❌ Failed to sync item:`, error);
					
					// Increment retry count
					const newRetryCount = item.retry_count + 1;

					if (newRetryCount >= MAX_RETRIES) {
						console.error(`⚠️ Max retries reached for ${item.entity} ${item.entity_id}`);
						// TODO: Move to failed queue or notify user
						await database.sync_queue.delete(item.id!);
					} else {
						// Update retry count and error message
						await database.sync_queue.update(item.id!, {
							retry_count: newRetryCount,
							last_error: error instanceof Error ? error.message : 'Unknown error',
						});
						
						// Wait before next retry
						await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * newRetryCount));
					}
				}
			}

			console.warn('✨ Sync queue processed successfully');
		} catch (error) {
			console.error('❌ Error processing sync queue:', error);
		} finally {
			this.syncInProgress = false;
		}
	}

	/**
	 * Sync a single queue item to the server
	 */
	private async syncItem(item: SyncQueue): Promise<void> {
		const endpoint = this.getEndpoint(item);
		const method = this.getHttpMethod(item.action);

		const response = await fetch(endpoint, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: method !== 'DELETE' ? JSON.stringify(item.payload) : undefined,
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Network error' }));
			throw new Error(error.error || `HTTP ${response.status}`);
		}

		return response.json();
	}

	/**
	 * Get API endpoint for sync item
	 */
	private getEndpoint(item: SyncQueue): string {
		const baseUrls: Record<SyncEntity, string> = {
			time_entry: '/api/time/entries',
			material: '/api/materials',
			expense: '/api/expenses',
			mileage: '/api/mileage',
			travel_time: '/api/travel-time',
		};

		const baseUrl = baseUrls[item.entity as SyncEntity];

		if (item.action === 'create') {
			return baseUrl;
		}

		return `${baseUrl}/${item.entity_id}`;
	}

	/**
	 * Get HTTP method for sync action
	 */
	private getHttpMethod(action: SyncAction): string {
		const methods: Record<SyncAction, string> = {
			create: 'POST',
			update: 'PATCH',
			delete: 'DELETE',
		};

		return methods[action];
	}

	/**
	 * Get count of pending sync items
	 */
	async getPendingCount(): Promise<number> {
		const database = await db();
		if (!database) return 0;
		return await database.sync_queue.count();
	}

	/**
	 * Check if online
	 */
	getOnlineStatus(): boolean {
		return this.isOnline;
	}

	/**
	 * Manually trigger sync
	 */
	async forceSyncNow(): Promise<void> {
		if (!this.isOnline) {
			throw new Error('Cannot sync while offline');
		}
		await this.processSyncQueue();
	}

	/**
	 * Clear all pending items (use with caution)
	 */
	async clearQueue(): Promise<void> {
		const database = await db();
		if (!database) return;
		await database.sync_queue.clear();
		console.warn('🗑️ Sync queue cleared');
	}
}

// Singleton instance
export const offlineQueue = new OfflineQueueManager();

