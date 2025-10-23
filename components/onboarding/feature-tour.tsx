'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Lightbulb, CheckCircle2 } from 'lucide-react';

interface TourStep {
	id: string;
	title: string;
	description: string;
	target?: string; // CSS selector for element to highlight
	position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
	action?: {
		label: string;
		onClick: () => void;
	};
}

interface FeatureTourProps {
	tourId: string;
	steps: TourStep[];
	autoStart?: boolean;
}

// Define tour sequence
const tourSequence = [
	{ id: 'dashboard', title: 'Översikt', page: '/dashboard' },
	{ id: 'projects', title: 'Projekt', page: '/dashboard/projects' },
	{ id: 'time', title: 'Tidrapportering', page: '/dashboard/time' },
	{ id: 'materials', title: 'Material & Utlägg', page: '/dashboard/materials' },
	{ id: 'planning', title: 'Planering', page: '/dashboard/planning' },
	{ id: 'planning-today', title: 'Dagens uppdrag', page: '/dashboard/planning/today' },
	{ id: 'approvals', title: 'Godkännanden', page: '/dashboard/approvals' },
];

export function FeatureTour({ tourId, steps, autoStart = false }: FeatureTourProps) {
	const [isActive, setIsActive] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);
	const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
	const [position, setPosition] = useState({ top: 0, left: 0 });
	const [showCompletion, setShowCompletion] = useState(false);

	const step = steps[currentStep];
	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === steps.length - 1;

	// Find next tour in sequence
	const currentIndex = tourSequence.findIndex(t => t.id === tourId);
	const nextTour = currentIndex >= 0 && currentIndex < tourSequence.length - 1 
		? tourSequence[currentIndex + 1] 
		: null;

	// Check if user has completed this tour
	useEffect(() => {
		const completed = localStorage.getItem(`tour-${tourId}-completed`);
		console.log('[FeatureTour] Tour:', tourId, 'Completed:', completed, 'AutoStart:', autoStart);
		if (!completed && autoStart) {
			console.log('[FeatureTour] Starting tour in 1000ms...');
			// Auto-start after a delay
			setTimeout(() => {
				console.log('[FeatureTour] Setting isActive to true');
				setIsActive(true);
			}, 1000);
		}
	}, [tourId, autoStart]);

	// Update target element and position when step changes
	useEffect(() => {
		if (!isActive) {
			setTargetElement(null);
			return;
		}

		// Handle center position (no specific target)
		if (!step.target || step.position === 'center') {
			setTargetElement(null);
			// Center on screen
			setPosition({
				top: window.innerHeight / 2,
				left: window.innerWidth / 2,
			});
			return;
		}

		const element = document.querySelector(step.target) as HTMLElement;
		if (element) {
			setTargetElement(element);

			// Calculate tooltip position
			const rect = element.getBoundingClientRect();
			const tooltipPosition = calculatePosition(rect, step.position || 'bottom');
			setPosition(tooltipPosition);

			// Scroll element into view
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });

			// Highlight the element
			element.style.position = 'relative';
			element.style.zIndex = '1001';
			element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
			element.style.borderRadius = '8px';
		} else {
			// Element not found - center the tooltip as fallback
			console.warn('[FeatureTour] Target element not found:', step.target);
			setTargetElement(null);
			setPosition({
				top: window.innerHeight / 2,
				left: window.innerWidth / 2,
			});
		}

		return () => {
			// Remove highlight
			if (element) {
				element.style.boxShadow = '';
				element.style.zIndex = '';
			}
		};
	}, [isActive, currentStep, step.target, step.position]);

	const handleNext = useCallback(() => {
		if (isLastStep) {
			// Show completion screen instead of closing immediately
			setShowCompletion(true);
		} else {
			setCurrentStep(currentStep + 1);
		}
	}, [currentStep, isLastStep]);

	const handlePrev = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	}, [currentStep]);

	const handleComplete = useCallback(() => {
		setIsActive(false);
		setShowCompletion(false);
		localStorage.setItem(`tour-${tourId}-completed`, 'true');
	}, [tourId]);

	const handleSkip = useCallback(() => {
		handleComplete();
	}, [handleComplete]);

	const handleNextTour = useCallback(() => {
		if (nextTour) {
			// Mark current tour as complete
			localStorage.setItem(`tour-${tourId}-completed`, 'true');
			// Remove completed flag for next tour
			localStorage.removeItem(`tour-${nextTour.id}-completed`);
			// Navigate to next tour
			window.location.href = `${nextTour.page}?tour=${nextTour.id}`;
		}
	}, [tourId, nextTour]);

	if (!isActive) {
		return null;
	}

	// Show completion screen
	if (showCompletion) {
		return (
			<>
				{/* Overlay */}
				<div className="fixed inset-0 bg-black/50 z-[1000]" />

				{/* Completion Card */}
				<Card
					className="fixed z-[9999] max-w-md shadow-xl border-2 border-green-500 bg-white dark:bg-gray-950"
					style={{
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
					}}
				>
					<div className="p-6 text-center">
						<div className="flex justify-center mb-4">
							<div className="bg-green-100 p-3 rounded-full">
								<CheckCircle2 className="h-8 w-8 text-green-600" />
							</div>
						</div>
						<h3 className="font-bold text-xl mb-2">Bra jobbat!</h3>
						<p className="text-sm text-muted-foreground mb-6">
							Du har slutfört guiden. {nextTour ? 'Vill du fortsätta till nästa?' : 'Alla guider är nu genomgångna!'}
						</p>

						<div className="flex flex-col gap-2">
							{nextTour && (
								<Button 
									onClick={handleNextTour}
									className="w-full bg-orange-500 hover:bg-orange-600"
								>
									Fortsätt till: {nextTour.title}
									<ArrowRight className="h-4 w-4 ml-2" />
								</Button>
							)}
							<Button 
								variant={nextTour ? "outline" : "default"}
								onClick={handleComplete}
								className="w-full"
							>
								{nextTour ? 'Stäng' : 'Stäng och slutför'}
							</Button>
						</div>
					</div>
				</Card>
			</>
		);
	}

	return (
		<>
			{/* Overlay */}
			<div
				className="fixed inset-0 bg-black/50 z-[1000]"
				onClick={handleSkip}
			/>

			{/* Tooltip */}
			<Card
				className="fixed z-[9999] max-w-md shadow-xl border-2 border-primary bg-white dark:bg-gray-950"
				style={{
					top: `${position.top}px`,
					left: `${position.left}px`,
					transform: step.position === 'center' ? 'translate(-50%, -50%)' : 'translate(-50%, 0)',
				}}
			>
				<div className="p-4">
					<div className="flex items-start justify-between mb-3">
						<div className="flex items-center gap-2">
							<div className="bg-blue-50 p-1.5 rounded-lg">
								<Lightbulb className="h-4 w-4 text-blue-600" />
							</div>
							<h3 className="font-semibold text-lg">{step.title}</h3>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 -mt-1 -mr-2"
							onClick={handleSkip}
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					<p className="text-sm text-muted-foreground mb-4">{step.description}</p>

					{/* Progress dots */}
					<div className="flex items-center justify-center gap-1.5 mb-4">
						{steps.map((_, index) => (
							<div
								key={index}
								className={`h-1.5 rounded-full transition-all ${
									index === currentStep
										? 'w-6 bg-primary'
										: 'w-1.5 bg-muted'
								}`}
							/>
						))}
					</div>

					{/* Actions */}
					<div className="flex items-center justify-between gap-2">
						<Button variant="ghost" size="sm" onClick={handleSkip}>
							Hoppa över
						</Button>
						<div className="flex items-center gap-2">
							{!isFirstStep && (
								<Button variant="outline" size="sm" onClick={handlePrev}>
									<ArrowLeft className="h-4 w-4 mr-1" />
									Tillbaka
								</Button>
							)}
							{step.action ? (
								<Button
									size="sm"
									onClick={() => {
										step.action?.onClick();
										handleNext();
									}}
								>
									{step.action.label}
									<ArrowRight className="h-4 w-4 ml-1" />
								</Button>
							) : (
								<Button size="sm" onClick={handleNext}>
									{isLastStep ? 'Färdig!' : 'Nästa'}
									{!isLastStep && <ArrowRight className="h-4 w-4 ml-1" />}
								</Button>
							)}
						</div>
					</div>
				</div>
			</Card>
		</>
	);
}

/**
 * Calculate tooltip position relative to target element
 */
function calculatePosition(
	targetRect: DOMRect,
	position: 'top' | 'bottom' | 'left' | 'right' | 'center'
): { top: number; left: number } {
	const offset = 16; // Gap between target and tooltip

	switch (position) {
		case 'center':
			// Center on screen
			return {
				top: window.innerHeight / 2,
				left: window.innerWidth / 2,
			};
		case 'top':
			return {
				top: targetRect.top - offset,
				left: targetRect.left + targetRect.width / 2,
			};
		case 'bottom':
			return {
				top: targetRect.bottom + offset,
				left: targetRect.left + targetRect.width / 2,
			};
		case 'left':
			return {
				top: targetRect.top + targetRect.height / 2,
				left: targetRect.left - offset,
			};
		case 'right':
			return {
				top: targetRect.top + targetRect.height / 2,
				left: targetRect.right + offset,
			};
		default:
			return {
				top: targetRect.bottom + offset,
				left: targetRect.left + targetRect.width / 2,
			};
	}
}

