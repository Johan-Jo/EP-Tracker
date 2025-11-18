'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InvoiceStep = 'select' | 'approvals' | 'preview' | 'lock' | 'completed';

interface InvoiceStepIndicatorProps {
	currentStep: InvoiceStep;
}

const steps: Array<{ id: InvoiceStep; label: string }> = [
	{ id: 'select', label: 'Välj projekt & period' },
	{ id: 'approvals', label: 'Kontrollera godkännanden' },
	{ id: 'preview', label: 'Fakturaunderlag' },
	{ id: 'lock', label: 'Lås & exportera' },
];

export function InvoiceStepIndicator({ currentStep }: InvoiceStepIndicatorProps) {
	const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

	return (
		<div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<div className="mx-auto flex max-w-5xl items-center px-3 py-3 md:px-6">
				<ol className="flex w-full flex-col gap-3 text-xs md:flex-row md:items-center md:gap-0 md:text-sm">
					{steps.map((step, index) => {
						const isCompleted = index < currentStepIndex;
						const isCurrent = index === currentStepIndex;

						return (
							<li
								key={step.id}
								className={cn(
									'flex items-center md:flex-1',
									index > 0 && 'md:pl-4'
								)}
							>
								{/* Circle + label */}
								<div className="flex items-center gap-2">
									<div
										className={cn(
											'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-medium md:h-8 md:w-8 md:text-sm transition-colors',
											isCompleted &&
												'border-primary bg-primary text-primary-foreground',
											isCurrent &&
												!isCompleted &&
												'border-primary/80 bg-primary/10 text-primary',
											!isCompleted &&
												!isCurrent &&
												'border-border/70 bg-background text-muted-foreground'
										)}
									>
										{isCompleted ? (
											<Check className="h-3 w-3 md:h-4 md:w-4" />
										) : (
											<span>{index + 1}</span>
										)}
									</div>

									<span
										className={cn(
											'whitespace-nowrap',
											isCurrent
												? 'font-semibold text-foreground'
												: 'font-medium text-muted-foreground'
										)}
									>
										{step.label}
									</span>
								</div>

								{/* Connector line (desktop only) */}
								{index < steps.length - 1 && (
									<div className="hidden flex-1 items-center md:flex">
										<div
											className={cn(
												'mx-2 h-px w-full rounded-full bg-border/60',
												isCompleted && 'bg-primary'
											)}
										/>
									</div>
								)}
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}

