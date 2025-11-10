'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { offlineQueue } from '@/lib/sync/offline-queue';
import { toast } from 'sonner';

export function SyncStatus() {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    useEffect(() => {
        // Initialize online status
        setIsOnline(navigator.onLine);

        // Listen for online/offline events
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Anslutning återupprättad! Synkroniserar...', {
                icon: '🌐',
            });
            refreshPendingCount();
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast('Du är offline. Ändringar sparas lokalt.', {
                icon: '📡',
                duration: 5000,
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Refresh pending count periodically
        const interval = setInterval(() => {
            refreshPendingCount();
        }, 5000);

        // Initial load
        refreshPendingCount();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const refreshPendingCount = async () => {
        try {
            const count = await offlineQueue.getPendingCount();
            setPendingCount(count);
        } catch (error) {
            console.error('Failed to get pending count:', error);
        }
    };

    const handleSyncNow = async () => {
        if (!isOnline) {
            toast.error('Kan inte synkronisera när du är offline');
            return;
        }

        setIsSyncing(true);
        try {
            await offlineQueue.forceSyncNow();
            await refreshPendingCount();
            setLastSyncTime(new Date());
            toast.success('Synkronisering klar!', { icon: '✅' });
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Synkronisering misslyckades');
        } finally {
            setIsSyncing(false);
        }
    };

    if (!isOnline) {
        return (
            <div className="flex items-center gap-2">
                <Badge variant="destructive" className="flex items-center gap-1">
                    <WifiOff className="w-3 h-3" />
                    Offline
                </Badge>
                {pendingCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                        {pendingCount} väntande
                    </Badge>
                )}
            </div>
        );
    }

    if (pendingCount === 0 && !isSyncing) {
        return (
            <div className="flex items-center gap-2 text-sm">
                <Badge
                    variant="outline"
                    className="flex items-center gap-1 rounded-full border-border/50 bg-muted px-3 py-1 text-xs font-medium text-foreground dark:border-white/15 dark:bg-white/5"
                >
                    <svg viewBox="0 0 8 8" className="h-2.5 w-2.5 text-emerald-500" aria-hidden="true">
                        <circle cx="4" cy="4" r="4" fill="currentColor" />
                    </svg>
                    Synkat
                </Badge>

                {lastSyncTime && (
                    <span className="hidden text-xs text-muted-foreground md:inline">
                        {lastSyncTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            {isSyncing ? (
                <Badge variant="outline" className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Synkroniserar...
                </Badge>
            ) : pendingCount > 0 ? (
                <>
                    <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 border-yellow-200">
                        <Wifi className="w-3 h-3 text-yellow-600" />
                        <span className="text-yellow-700">{pendingCount} väntande</span>
                    </Badge>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSyncNow}
                        disabled={isSyncing}
                        className="h-7 px-2"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </Button>
                </>
            ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Online
                </Badge>
            )}
        </div>
    );
}
