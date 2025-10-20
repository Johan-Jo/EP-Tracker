'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        setIsOffline(!navigator.onLine);

        const handleOnline = () => {
            setIsOffline(false);
            setShowBanner(true);
            // Hide success banner after 5 seconds
            setTimeout(() => setShowBanner(false), 5000);
        };

        const handleOffline = () => {
            setIsOffline(true);
            setShowBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!showBanner && !isOffline) return null;

    if (isOffline) {
        return (
            <Alert variant="destructive" className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 shadow-lg">
                <WifiOff className="h-4 w-4" />
                <AlertTitle>Du är offline</AlertTitle>
                <AlertDescription>
                    Dina ändringar sparas lokalt och synkroniseras automatiskt när du är online igen.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 shadow-lg bg-green-50 border-green-200">
            <Wifi className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Tillbaka online!</AlertTitle>
            <AlertDescription className="text-green-700">
                Anslutning återupprättad. Synkroniserar väntande ändringar...
            </AlertDescription>
        </Alert>
    );
}

