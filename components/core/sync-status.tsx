'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { offlineQueue } from '@/lib/sync/offline-queue';

export function SyncStatus() {
	const [isOnline, setIsOnline] = useState(true);
	const [pendingCount, setPendingCount] = useState(0);
	const [isSyncing, setIsSyncing] = useState(false);

	useEffect(() => {
		// Initial status
		setIsOnline(navigator.onLine);
		updatePendingCount();

		// Listen for online/offline events
		const handleOnline = () => {
			setIsOnline(true);
			updatePendingCount();
		};

		const handleOffline = () => {
			setIsOnline(false);
			updatePendingCount();
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// Poll for pending count every 10 seconds
		const interval = setInterval(updatePendingCount, 10000);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
			clearInterval(interval);
		};
	}, []);

	const updatePendingCount = async () => {
		try {
			const count = await offlineQueue.getPendingCount();
			setPendingCount(count);
		} catch (error) {
			console.error('Failed to get pending count:', error);
		}
	};

	const handleSync = async () => {
		if (!isOnline) {
			alert('Kan inte synkronisera när du är offline');
			return;
		}

		setIsSyncing(true);
		try {
			await offlineQueue.forceSyncNow();
			await updatePendingCount();
		} catch (error) {
			console.error('Sync failed:', error);
			alert('Synkronisering misslyckades');
		} finally {
			setIsSyncing(false);
		}
	};

	return (
		<div className="flex items-center gap-3">
			{/* Online/Offline Status */}
			{isOnline ? (
				<Badge variant="outline" className="gap-2">
					<Wifi className="w-3 h-3" />
					Online
				</Badge>
			) : (
				<Badge variant="destructive" className="gap-2">
					<WifiOff className="w-3 h-3" />
					Offline
				</Badge>
			)}

			{/* Pending Sync Count */}
			{pendingCount > 0 && (
				<>
					<Badge variant="secondary">
						{pendingCount} väntande
					</Badge>
					<Button
						size="sm"
						variant="ghost"
						onClick={handleSync}
						disabled={!isOnline || isSyncing}
					>
						{isSyncing ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<RefreshCw className="w-4 h-4" />
						)}
					</Button>
				</>
			)}
		</div>
	);
}

