'use client';

import { useEffect, useState } from 'react';
import { preloadUserData, type PreloadStats } from '@/lib/sync/data-preloader';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Download, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataPreloaderProps {
	userId: string;
	orgId: string;
	autoStart?: boolean;
}

export function DataPreloader({ userId, orgId, autoStart = true }: DataPreloaderProps) {
	const [loading, setLoading] = useState(false);
	const [stats, setStats] = useState<PreloadStats | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);
	const [showPrompt, setShowPrompt] = useState(false);

	useEffect(() => {
		// Check if we should show the preload prompt
		const lastPreload = localStorage.getItem('last-data-preload');
		const lastPreloadDate = lastPreload ? new Date(lastPreload) : null;
		const daysSincePreload = lastPreloadDate
			? (Date.now() - lastPreloadDate.getTime()) / (1000 * 60 * 60 * 24)
			: 999;

		// Show prompt if no preload, or if more than 7 days old
		if (!lastPreload || daysSincePreload > 7) {
			setShowPrompt(true);

			// Auto-start if enabled
			if (autoStart) {
				startPreload();
			}
		}
	}, [userId, orgId, autoStart]);

	async function startPreload() {
		setLoading(true);
		setError(null);
		setProgress(10);
		setShowPrompt(false);

		try {
			// Simulate progress
			const progressInterval = setInterval(() => {
				setProgress((prev) => Math.min(prev + 10, 90));
			}, 200);

			const result = await preloadUserData({ userId, orgId, daysBack: 30 });

			clearInterval(progressInterval);
			setProgress(100);
			setStats(result);

			// Save last preload time
			localStorage.setItem('last-data-preload', new Date().toISOString());

			// Hide after 3 seconds
			setTimeout(() => {
				setLoading(false);
				setStats(null);
			}, 3000);
		} catch (err) {
			console.error('Preload error:', err);
			
			// Categorize error for better user feedback
			let errorMessage = 'Kunde inte ladda offline-data';
			
			if (err instanceof Error) {
				// Network error
				if (err.message.includes('fetch') || err.message.includes('network')) {
					errorMessage = 'Ingen internetanslutning. Försök igen när du är online.';
				}
				// Storage quota error
				else if (err.message.includes('quota') || err.message.includes('storage')) {
					errorMessage = 'Inte tillräckligt med lagringsutrymme. Rensa webbläsardata och försök igen.';
				}
				// Permission error
				else if (err.message.includes('permission') || err.message.includes('denied')) {
					errorMessage = 'Ingen behörighet att spara data lokalt.';
				}
				// Timeout error
				else if (err.message.includes('timeout')) {
					errorMessage = 'Tog för lång tid. Försök igen med bättre internetanslutning.';
				}
				// Generic error with message
				else if (err.message) {
					errorMessage = `Fel: ${err.message}`;
				}
			}
			
			setError(errorMessage);
			setLoading(false);
			
			// Clear progress
			setProgress(0);
			
			// Don't auto-hide error - let user dismiss it
		}
	}

	function dismissPrompt() {
		setShowPrompt(false);
		// Mark as dismissed for 7 days
		const dismissedUntil = new Date();
		dismissedUntil.setDate(dismissedUntil.getDate() + 7);
		localStorage.setItem('last-data-preload', dismissedUntil.toISOString());
	}

	// Show prompt
	if (showPrompt && !loading && !stats && !error) {
		return (
			<Card className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40 p-4 shadow-lg border-2 border-blue-500">
				<div className="flex items-start gap-3">
					<div className="bg-blue-50 p-2 rounded-lg">
						<Download className="h-5 w-5 text-blue-600" />
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-sm mb-1">
							Ladda ner offline-data
						</h3>
						<p className="text-sm text-muted-foreground mb-3">
							Ladda ner dina senaste projekt och tidrapporter för offline-åtkomst
						</p>
						<div className="flex gap-2">
							<Button
								size="sm"
								onClick={startPreload}
								className="flex-1"
							>
								Ladda ner
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={dismissPrompt}
							>
								Senare
							</Button>
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={dismissPrompt}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</Card>
		);
	}

	// Show loading
	if (loading) {
		return (
			<Card className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40 p-4 shadow-lg">
				<div className="flex items-start gap-3">
					<div className="bg-blue-50 p-2 rounded-lg">
						<Download className="h-5 w-5 text-blue-600 animate-pulse" />
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-sm mb-2">
							Laddar offline-data...
						</h3>
						<Progress value={progress} className="h-2" />
						<p className="text-xs text-muted-foreground mt-2">
							{progress < 90 ? 'Hämtar data...' : 'Sparar lokalt...'}
						</p>
					</div>
				</div>
			</Card>
		);
	}

	// Show success
	if (stats) {
		return (
			<Card className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40 p-4 shadow-lg border-2 border-green-500">
				<div className="flex items-start gap-3">
					<div className="bg-green-50 p-2 rounded-lg">
						<CheckCircle2 className="h-5 w-5 text-green-600" />
					</div>
					<div className="flex-1">
						<h3 className="font-semibold text-sm mb-1 text-green-900">
							Data nedladdad!
						</h3>
						<p className="text-sm text-muted-foreground">
							{stats.projects} projekt • {stats.timeEntries} tidrapporter •{' '}
							{stats.materials} material • {stats.expenses} utlägg
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							Du kan nu arbeta offline
						</p>
					</div>
				</div>
			</Card>
		);
	}

	// Show error
	if (error) {
		return (
			<Card className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-40 p-4 shadow-lg border-2 border-red-500">
				<div className="flex items-start gap-3">
					<div className="flex-1">
						<h3 className="font-semibold text-sm mb-1 text-red-900">
							{error}
						</h3>
						<Button
							size="sm"
							variant="outline"
							onClick={startPreload}
							className="mt-2"
						>
							Försök igen
						</Button>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={() => setError(null)}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</Card>
		);
	}

	return null;
}

