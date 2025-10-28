'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerUpdatePrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
                setRegistration(reg);

                // Listen for updates
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker available
                                setShowPrompt(true);
                            }
                        });
                    }
                });
            });

            // Listen for controller change (SW activated)
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }
    }, []);

    const handleUpdate = () => {
        if (registration?.waiting) {
            // Tell the service worker to skip waiting
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    if (!showPrompt) return null;

    return (
        <Alert className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[60] shadow-lg bg-blue-50 border-blue-200">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Uppdatering tillgänglig</AlertTitle>
            <AlertDescription className="text-blue-700 space-y-3">
                <p>En ny version av appen är tillgänglig.</p>
                <Button
                    size="sm"
                    onClick={handleUpdate}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                >
                    Uppdatera nu
                </Button>
            </AlertDescription>
        </Alert>
    );
}

