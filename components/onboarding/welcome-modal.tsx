'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Clock, FolderKanban, Users, Zap, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
	open: boolean;
	onComplete: () => void;
	userName?: string;
	organizationName?: string;
}

const steps = [
	{
		id: 1,
		title: 'Välkommen till EP Tracker!',
		description: 'Ditt nya verktyg för tidrapportering och projekthantering',
		icon: Zap,
		content: (
			<div className="space-y-4">
				<p className="text-muted-foreground">
					EP Tracker hjälper dig och ditt team att:
				</p>
				<div className="grid gap-3">
					<div className="flex items-start gap-3">
						<CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
						<div>
							<p className="font-medium">Rapportera tid enkelt</p>
							<p className="text-sm text-muted-foreground">
								Starta timer eller lägg till tid manuellt
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
						<div>
							<p className="font-medium">Hantera material och kostnader</p>
							<p className="text-sm text-muted-foreground">
								Fota kvitton och registrera utlägg direkt
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
						<div>
							<p className="font-medium">Arbeta offline</p>
							<p className="text-sm text-muted-foreground">
								Ingen internet? Inga problem - allt synkas automatiskt
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
						<div>
							<p className="font-medium">Godkänn och exportera</p>
							<p className="text-sm text-muted-foreground">
								Granska, godkänn och exportera till lön med ett klick
							</p>
						</div>
					</div>
				</div>
			</div>
		),
	},
	{
		id: 2,
		title: 'Skapa ditt första projekt',
		description: 'Projekt är grunden för all tidrapportering',
		icon: FolderKanban,
		content: (
			<div className="space-y-4">
				<Card className="p-4 bg-muted/50">
					<div className="flex items-start gap-3 mb-3">
						<div className="bg-primary/10 p-2 rounded-lg">
							<FolderKanban className="h-5 w-5 text-primary" />
						</div>
						<div className="flex-1">
							<p className="font-medium mb-1">Varför projekt?</p>
							<p className="text-sm text-muted-foreground">
								Alla tidrapporter, material och kostnader kopplas till ett projekt. 
								Detta gör det enkelt att hålla ordning och exportera data per projekt.
							</p>
						</div>
					</div>
				</Card>
				<div className="space-y-2">
					<p className="font-medium">Vad behöver du?</p>
					<ul className="space-y-2 text-sm text-muted-foreground">
						<li className="flex items-start gap-2">
							<span className="text-primary">•</span>
							<span>Projektnamn (t.ex. &quot;Villa Rosendal&quot;)</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary">•</span>
							<span>Projektnummer (valfritt, t.ex. &quot;2025-001&quot;)</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary">•</span>
							<span>Kund (t.ex. &quot;Anders Andersson AB&quot;)</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary">•</span>
							<span>Adress till byggplatsen</span>
						</li>
					</ul>
				</div>
			</div>
		),
	},
	{
		id: 3,
		title: 'Starta tidrapportering',
		description: 'Rapportera tid på två sätt',
		icon: Clock,
		content: (
			<div className="space-y-4">
				<div className="grid gap-3">
					<Card className="p-4">
						<div className="flex items-start gap-3">
							<div className="bg-blue-50 p-2 rounded-lg">
								<Clock className="h-5 w-5 text-blue-600" />
							</div>
							<div>
								<p className="font-medium mb-1">1. Starta Timer</p>
								<p className="text-sm text-muted-foreground">
									Klicka på timer-widgeten (nedre högra hörnet), välj projekt och tryck &quot;Starta tid&quot;. 
									Perfekt för kontinuerligt arbete.
								</p>
							</div>
						</div>
					</Card>
					<Card className="p-4">
						<div className="flex items-start gap-3">
							<div className="bg-green-50 p-2 rounded-lg">
								<Clock className="h-5 w-5 text-green-600" />
							</div>
							<div>
								<p className="font-medium mb-1">2. Lägg till manuellt</p>
								<p className="text-sm text-muted-foreground">
									Gå till &quot;Tid&quot; → &quot;Lägg till tid&quot; och fyll i start- och sluttid. 
									Perfekt för att rapportera i efterhand.
								</p>
							</div>
						</div>
					</Card>
				</div>
				<Card className="p-3 bg-orange-50 border-orange-200">
					<p className="text-sm text-orange-900">
						<span className="font-medium">Tips:</span> Timern syns på alla sidor och fortsätter räkna även om du stänger appen!
					</p>
				</Card>
			</div>
		),
	},
	{
		id: 4,
		title: 'Bjud in ditt team',
		description: 'Samarbeta med kolleger',
		icon: Users,
		content: (
			<div className="space-y-4">
				<p className="text-muted-foreground">
					Du kan bjuda in kolleger till din organisation. Varje person får en roll:
				</p>
				<div className="space-y-3">
					<Card className="p-3">
						<p className="font-medium">👑 Admin</p>
						<p className="text-sm text-muted-foreground">
							Full åtkomst - kan hantera projekt, godkänna tidrapporter och bjuda in användare
						</p>
					</Card>
					<Card className="p-3">
						<p className="font-medium">👷 Arbetsledare</p>
						<p className="text-sm text-muted-foreground">
							Kan godkänna tidrapporter och exportera data
						</p>
					</Card>
					<Card className="p-3">
						<p className="font-medium">🔨 Arbetare</p>
						<p className="text-sm text-muted-foreground">
							Kan rapportera sin egen tid, material och kostnader
						</p>
					</Card>
				</div>
				<Card className="p-3 bg-blue-50 border-blue-200">
					<p className="text-sm text-blue-900">
						<span className="font-medium">Hitta här:</span> Gå till Inställningar → Användare för att bjuda in
					</p>
				</Card>
			</div>
		),
	},
];

export function WelcomeModal({ open, onComplete, userName, organizationName }: WelcomeModalProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const step = steps[currentStep];
	const Icon = step.icon;

	function handleNext() {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			// Mark onboarding as complete
			localStorage.setItem('onboarding-completed', 'true');
			onComplete();
		}
	}

	function handleSkip() {
		localStorage.setItem('onboarding-completed', 'true');
		onComplete();
	}

	return (
		<Dialog open={open} onOpenChange={(open) => !open && handleSkip()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="bg-primary/10 p-2 rounded-lg">
							<Icon className="h-6 w-6 text-primary" />
						</div>
						<div className="flex-1">
							<DialogTitle className="text-left">{step.title}</DialogTitle>
							<DialogDescription className="text-left">
								{step.description}
							</DialogDescription>
						</div>
					</div>
					{userName && currentStep === 0 && (
						<p className="text-sm text-muted-foreground">
							Hej {userName}! Välkommen till {organizationName || 'EP Tracker'}
						</p>
					)}
				</DialogHeader>

				<div className="py-4">
					{step.content}
				</div>

				{/* Progress dots */}
				<div className="flex items-center justify-center gap-2 py-2">
					{steps.map((_, index) => (
						<div
							key={index}
							className={`h-2 rounded-full transition-all ${
								index === currentStep
									? 'w-8 bg-primary'
									: 'w-2 bg-muted'
							}`}
						/>
					))}
				</div>

				{/* Actions */}
				<div className="flex items-center justify-between pt-4 border-t">
					<Button
						variant="ghost"
						onClick={handleSkip}
					>
						Hoppa över
					</Button>
					<div className="flex items-center gap-2">
						{currentStep > 0 && (
							<Button
								variant="outline"
								onClick={() => setCurrentStep(currentStep - 1)}
							>
								Tillbaka
							</Button>
						)}
						<Button onClick={handleNext}>
							{currentStep < steps.length - 1 ? (
								<>
									Nästa
									<ArrowRight className="h-4 w-4 ml-2" />
								</>
							) : (
								'Kom igång!'
							)}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

