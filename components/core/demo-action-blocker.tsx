'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDemoMode } from '@/lib/demo/demo-context';
import { ReactNode } from 'react';

interface DemoActionBlockerProps {
	children: ReactNode;
	action?: string;
}

/**
 * Wrapper component that disables actions in demo mode and shows a tooltip
 */
export function DemoActionBlocker({ children, action }: DemoActionBlockerProps) {
	const { isDemoMode } = useDemoMode();

	if (!isDemoMode) {
		return <>{children}</>;
	}

	const tooltipText =
		action ||
		'Den här åtgärden är avstängd i demo. Skapa ett riktigt konto för att använda funktionen.';

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="cursor-not-allowed opacity-50 pointer-events-none">
						{children}
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>{tooltipText}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

