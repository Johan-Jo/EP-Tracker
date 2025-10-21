'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
	const [showPrompt, setShowPrompt] = useState(false);
	const [isIOS, setIsIOS] = useState(false);
	const [isStandalone, setIsStandalone] = useState(false);

	useEffect(() => {
		// Check if already installed
		const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as any).standalone ||
			document.referrer.includes('android-app://');

		setIsStandalone(isInStandaloneMode);

		// Check if iOS
		const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
		setIsIOS(isIOSDevice);

		// Listen for beforeinstallprompt event (Android/Desktop)
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			const promptEvent = e as BeforeInstallPromptEvent;
			setDeferredPrompt(promptEvent);

			// Check if user has dismissed the prompt before
			const dismissed = localStorage.getItem('pwa-install-dismissed');
			const dismissedDate = dismissed ? new Date(dismissed) : null;
			const daysSinceDismiss = dismissedDate
				? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
				: 999;

			// Show prompt if not dismissed, or if dismissed more than 7 days ago
			if (!dismissed || daysSinceDismiss > 7) {
				setTimeout(() => setShowPrompt(true), 5000); // Show after 5 seconds
			}
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		// For iOS, show prompt after 5 seconds if not installed
		if (isIOSDevice && !isInStandaloneMode) {
			const dismissed = localStorage.getItem('pwa-install-dismissed-ios');
			const dismissedDate = dismissed ? new Date(dismissed) : null;
			const daysSinceDismiss = dismissedDate
				? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
				: 999;

			if (!dismissed || daysSinceDismiss > 7) {
				setTimeout(() => setShowPrompt(true), 5000);
			}
		}

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		};
	}, []);

	async function handleInstall() {
		if (!deferredPrompt) {
			return;
		}

		// Show the install prompt
		deferredPrompt.prompt();

		// Wait for the user to respond
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === 'accepted') {
			console.log('✅ User accepted PWA install');
			// Track installation
			try {
				await fetch('/api/analytics/pwa-install', {
					method: 'POST',
					body: JSON.stringify({ platform: 'android' }),
				});
			} catch (error) {
				// Silent fail
			}
		}

		// Clear the deferred prompt
		setDeferredPrompt(null);
		setShowPrompt(false);
	}

	function handleDismiss() {
		const key = isIOS ? 'pwa-install-dismissed-ios' : 'pwa-install-dismissed';
		localStorage.setItem(key, new Date().toISOString());
		setShowPrompt(false);
	}

	// Don't show if already installed
	if (isStandalone) {
		return null;
	}

	// Don't show if dismissed
	if (!showPrompt) {
		return null;
	}

	// iOS Install Instructions
	if (isIOS && !deferredPrompt) {
		return (
			<Card className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-4 shadow-lg border-2 border-primary">
				<div className="flex items-start gap-3">
					<div className="bg-primary/10 p-2 rounded-lg">
						<Share className="h-5 w-5 text-primary" />
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-sm mb-1">
							Installera EP Tracker
						</h3>
						<p className="text-sm text-muted-foreground mb-3">
							Lägg till på hemskärmen för snabbare åtkomst och offline-stöd
						</p>
						<ol className="text-xs text-muted-foreground space-y-1 mb-3">
							<li>1. Tryck på <Share className="inline h-3 w-3" /> (Dela) i Safari</li>
							<li>2. Välj &quot;Lägg till på hemskärmen&quot;</li>
							<li>3. Tryck på &quot;Lägg till&quot;</li>
						</ol>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleDismiss}
							className="text-xs"
						>
							Avvisa
						</Button>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={handleDismiss}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</Card>
		);
	}

	// Android/Desktop Install Prompt
	if (deferredPrompt) {
		return (
			<Card className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-4 shadow-lg border-2 border-primary">
				<div className="flex items-start gap-3">
					<div className="bg-primary/10 p-2 rounded-lg">
						<Download className="h-5 w-5 text-primary" />
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-sm mb-1">
							Installera EP Tracker
						</h3>
						<p className="text-sm text-muted-foreground mb-3">
							Installera appen för snabbare åtkomst och offline-stöd
						</p>
						<div className="flex gap-2">
							<Button
								size="sm"
								onClick={handleInstall}
								className="flex-1"
							>
								Installera
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleDismiss}
							>
								Senare
							</Button>
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={handleDismiss}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</Card>
		);
	}

	return null;
}

