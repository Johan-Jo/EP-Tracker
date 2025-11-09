'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerUpdatePrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);
	const shouldReloadRef = useRef(false);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
			let mounted = true;
			let refreshing = false;

			navigator.serviceWorker.ready.then((reg) => {
				if (!mounted) {
					return;
				}

                setRegistration(reg);

                // Listen for updates
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
							if (!mounted) {
								return;
							}

							if (newWorker.state === 'installed' && navigator.serviceWorker.controller && reg.waiting) {
								// New service worker available and waiting to activate
								setShowPrompt(true);
                            }
                        });
                    }
                });
            });

            // Listen for controller change (SW activated)
			const handleControllerChange = () => {
				if (!refreshing && shouldReloadRef.current) {
                    refreshing = true;
                    window.location.reload();
                }
			};

			navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

			return () => {
				mounted = false;
				navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
			};
        }
    }, []);

    const handleUpdate = () => {
        if (registration?.waiting) {
			setIsUpdating(true);
            // Tell the service worker to skip waiting
			setShowPrompt(false);
			shouldReloadRef.current = true;
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
					disabled={isUpdating}
                    onClick={handleUpdate}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                >
					{isUpdating ? 'Uppdaterar...' : 'Uppdatera nu'}
                </Button>
            </AlertDescription>
        </Alert>
    );
}

