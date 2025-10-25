'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, RotateCcw } from 'lucide-react';

interface TourInfo {
	id: string;
	title: string;
	description: string;
	page: string;
}

const availableTours: TourInfo[] = [
	{
		id: 'dashboard',
		title: 'Översikt',
		description: 'Lär dig använda översiktssidan, snabbåtgärder och statistik',
		page: '/dashboard',
	},
	{
		id: 'projects',
		title: 'Projekt',
		description: 'Hur du skapar och hanterar projekt',
		page: '/dashboard/projects',
	},
	{
		id: 'time',
		title: 'Tidrapportering',
		description: 'Rapportera tid med timer eller manuellt',
		page: '/dashboard/time',
	},
	{
		id: 'materials',
		title: 'Material & Utlägg',
		description: 'Lägg till material, utlägg och miltal',
		page: '/dashboard/materials',
	},
	{
		id: 'planning',
		title: 'Planering',
		description: 'Schemalägg uppdrag och tilldela personal',
		page: '/dashboard/planning',
	},
	{
		id: 'planning-today',
		title: 'Dagens uppdrag',
		description: 'Checka in/ut och navigera till arbetsplatser',
		page: '/dashboard/planning/today',
	},
	{
		id: 'approvals',
		title: 'Godkännanden',
		description: 'Granska och godkänn tidrapporter, exportera till lön',
		page: '/dashboard/approvals',
	},
];

export function TourLauncher() {
	const router = useRouter(); // PERFORMANCE OPTIMIZATION (Story 26.3)

	// PERFORMANCE OPTIMIZATION (Story 26.3): Use router for instant navigation
	function handleResetTour(tourId: string) {
		localStorage.removeItem(`tour-${tourId}-completed`);
		// Navigate to the appropriate page with tour trigger
		const tour = availableTours.find(t => t.id === tourId);
		if (tour) {
			router.push(`${tour.page}?tour=${tourId}`);
		}
	}

	// PERFORMANCE OPTIMIZATION (Story 26.3): Use router for instant navigation
	function handleResetAll() {
		// Reset all tours
		availableTours.forEach((tour) => {
			localStorage.removeItem(`tour-${tour.id}-completed`);
		});
		localStorage.removeItem('onboarding-completed');
		localStorage.removeItem('quick-start-dismissed');
		localStorage.removeItem('quick-start-checklist');
		// Redirect to dashboard
		router.push('/dashboard');
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Interaktiva guider</CardTitle>
					<CardDescription>
						Starta om guiderna för att lära dig funktionerna igen
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					{availableTours.map((tour) => (
						<div
							key={tour.id}
							className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
						>
							<div className="flex-1">
								<p className="font-medium">{tour.title}</p>
								<p className="text-sm text-muted-foreground">{tour.description}</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleResetTour(tour.id)}
							>
								<Play className="h-4 w-4 mr-2" />
								Starta
							</Button>
						</div>
					))}
				</CardContent>
			</Card>

			<Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
				<CardHeader>
					<CardTitle className="text-orange-900 dark:text-orange-100">
						Starta om från början
					</CardTitle>
					<CardDescription className="text-orange-700 dark:text-orange-300">
						Återställ alla guider och checklistan. Du kommer att se välkomstskärmen igen.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="outline"
						onClick={handleResetAll}
						className="border-orange-300 text-orange-900 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-100 dark:hover:bg-orange-900"
					>
						<RotateCcw className="h-4 w-4 mr-2" />
						Återställ allt
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

