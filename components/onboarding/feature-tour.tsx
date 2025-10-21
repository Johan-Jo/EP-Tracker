'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';

interface TourStep {
	id: string;
	title: string;
	description: string;
	target?: string; // CSS selector for element to highlight
	position?: 'top' | 'bottom' | 'left' | 'right';
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

export function FeatureTour({ tourId, steps, autoStart = false }: FeatureTourProps) {
	const [isActive, setIsActive] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);
	const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
	const [position, setPosition] = useState({ top: 0, left: 0 });

	const step = steps[currentStep];
	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === steps.length - 1;

	// Check if user has completed this tour
	useEffect(() => {
		const completed = localStorage.getItem(`tour-${tourId}-completed`);
		if (!completed && autoStart) {
			// Auto-start after a delay
			setTimeout(() => setIsActive(true), 1000);
		}
	}, [tourId, autoStart]);

	// Update target element and position when step changes
	useEffect(() => {
		if (!isActive || !step.target) {
			setTargetElement(null);
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
			handleComplete();
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
		localStorage.setItem(`tour-${tourId}-completed`, 'true');
	}, [tourId]);

	const handleSkip = useCallback(() => {
		handleComplete();
	}, [handleComplete]);

	if (!isActive) {
		return null;
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
					transform: 'translate(-50%, 0)',
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
	position: 'top' | 'bottom' | 'left' | 'right'
): { top: number; left: number } {
	const offset = 16; // Gap between target and tooltip

	switch (position) {
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

