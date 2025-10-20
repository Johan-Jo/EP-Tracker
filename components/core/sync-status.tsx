'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Check, Loader2 } from 'lucide-react';
import { offlineQueue } from '@/lib/sync/offline-queue';
import toast from 'react-hot-toast';

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
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1 bg-green-50 border-green-200">
                    <Check className="w-3 h-3 text-green-600" />
                    <span className="text-green-700">Synkad</span>
                </Badge>
                {lastSyncTime && (
                    <span className="text-xs text-muted-foreground hidden md:inline">
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
