'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { Plug, CheckCircle2, Info, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export interface FortnoxBannerProps {
	/** Titel för banner (t.ex. "Fortnox-integration för fakturor") */
	title: string;
	/** Beskrivning/underrubrik för banner */
	description: string;
	/** Har orgen en aktiv Fortnox-anslutning? */
	hasFortnoxConnection: boolean;
	/** Har tokenet rätt scope? (t.ex. 'salary' för löneunderlag, 'invoice' för fakturor) */
	hasRequiredScope?: boolean;
	/** Vilket scope behövs för denna integration? */
	requiredScope?: string;
	/** Scope-namn att visa (t.ex. "Fakturor" eller "Lön") */
	requiredScopeName?: string;
	/** Innehåll som visas när banner är expanderad och Fortnox är anslutet */
	connectedContent?: ReactNode;
	/** Innehåll som visas när banner är expanderad och Fortnox inte är anslutet */
	notConnectedContent?: ReactNode;
	/** URL till Fortnox-inställningar */
	settingsHref?: string;
	/** Klick-handler för att öppna Fortnox-inställningar */
	onSettingsClick?: () => void;
}

/**
 * Återanvändbar kollapsbar banner för Fortnox-integration
 * Visar status och guide för olika Fortnox-integrationer
 */
export function FortnoxBanner({
	title,
	description,
	hasFortnoxConnection,
	hasRequiredScope,
	requiredScope,
	requiredScopeName,
	connectedContent,
	notConnectedContent,
	settingsHref = '/dashboard/settings/fortnox',
	onSettingsClick,
}: FortnoxBannerProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	const settingsButton: ReactNode = onSettingsClick ? (
		<Button asChild size='sm' variant='outline' className='gap-1'>
			<button onClick={onSettingsClick}>
				<Settings className='h-4 w-4' />
				Fortnox-inställningar
			</button>
		</Button>
	) : (
		<Button asChild size='sm' variant='outline' className='gap-1'>
			<Link href={settingsHref}>
				<Settings className='h-4 w-4' />
				Fortnox-inställningar
			</Link>
		</Button>
	);

	const connectButton: ReactNode = onSettingsClick ? (
		<Button variant='default' size='sm' onClick={onSettingsClick}>
			<Plug className='mr-2 h-4 w-4' />
			Koppla Fortnox
		</Button>
	) : (
		<Button asChild size='sm' variant='default'>
			<Link href={settingsHref}>
				<Plug className='mr-2 h-4 w-4' />
				Koppla Fortnox
			</Link>
		</Button>
	);

	// Bestäm statusbadge
	const getStatusBadge = () => {
		if (hasFortnoxConnection && hasRequiredScope !== false) {
			return (
				<Badge variant='outline' className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
					<CheckCircle2 className='h-3 w-3 text-emerald-500' />
					Fortnox anslutet
				</Badge>
			);
		} else if (hasFortnoxConnection && hasRequiredScope === false) {
			return (
				<Badge variant='outline' className='flex items-center gap-1 text-amber-600 border-amber-300' onClick={(e) => e.stopPropagation()}>
					<Info className='h-3 w-3' />
					Saknar behörighet
				</Badge>
			);
		} else {
			return (
				<Badge variant='outline' className='flex items-center gap-1 text-amber-600 border-amber-300' onClick={(e) => e.stopPropagation()}>
					<Info className='h-3 w-3' />
					Ej anslutet
				</Badge>
			);
		}
	};

	return (
		<Card className='border border-dashed'>
			<CardHeader 
				className='flex flex-row items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors'
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className='space-y-1 flex-1'>
					<CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
						<Plug className='h-5 w-5 text-emerald-500' />
						{title}
					</CardTitle>
					<p className='text-xs sm:text-sm text-muted-foreground max-w-2xl'>
						{description}
					</p>
				</div>
				<div className='flex items-center gap-3'>
					{getStatusBadge()}
					<Button
						variant='ghost'
						size='icon'
						className='h-8 w-8 shrink-0'
						onClick={(e) => {
							e.stopPropagation();
							setIsExpanded(!isExpanded);
						}}
					>
						{isExpanded ? (
							<ChevronUp className='h-4 w-4' />
						) : (
							<ChevronDown className='h-4 w-4' />
						)}
					</Button>
				</div>
			</CardHeader>

			{isExpanded && (
				<CardContent className='space-y-4'>
					{/* Innehåll när Fortnox inte är anslutet */}
					{!hasFortnoxConnection ? (
						<>
							{notConnectedContent || (
								<Alert variant='default' className='border-amber-300 bg-amber-50/80'>
									<AlertTitle className='flex items-center gap-2'>
										<Info className='h-4 w-4 text-amber-600' />
										Steg 1: Koppla Fortnox
									</AlertTitle>
									<AlertDescription className='mt-1 text-xs sm:text-sm'>
										För att kunna exportera till Fortnox måste du först koppla ditt
										Fortnox-konto och ge EP-Tracker behörighet till <span className='font-medium'>{requiredScopeName || requiredScope || 'Fortnox'}</span>.
										Gå till integrationsinställningarna och följ guiden där.
									</AlertDescription>
								</Alert>
							)}
							<div className='flex flex-wrap items-center justify-between gap-3'>
								<p className='text-[11px] sm:text-xs text-muted-foreground max-w-xl'>
									När Fortnox är kopplat kan du exportera direkt till Fortnox.
								</p>
								<div className='flex gap-2'>{connectButton}</div>
							</div>
						</>
					) : hasRequiredScope === false ? (
						// Fortnox är ansluten men saknar rätt scope
						<>
							<Alert variant='default' className='border-amber-300 bg-amber-50/80'>
								<AlertTitle className='flex items-center gap-2'>
									<Info className='h-4 w-4 text-amber-600' />
									Saknar behörighet
								</AlertTitle>
								<AlertDescription className='mt-1 text-xs sm:text-sm'>
									Fortnox är anslutet men saknar behörighet för <span className='font-medium'>{requiredScopeName || requiredScope || 'denna funktion'}</span>.
									Gå till Fortnox-inställningar och uppdatera behörigheterna.
								</AlertDescription>
							</Alert>
							<div className='flex flex-wrap items-center justify-between gap-3'>
								<p className='text-[11px] sm:text-xs text-muted-foreground max-w-xl'>
									När behörigheterna är uppdaterade kan du exportera direkt till Fortnox.
								</p>
								<div className='flex gap-2'>{settingsButton}</div>
							</div>
						</>
					) : (
						// Fortnox är ansluten och har rätt scope
						connectedContent || (
							<div className='space-y-3'>
								<p className='text-xs sm:text-sm text-muted-foreground'>
									Fortnox är kopplat och redo att användas. Du kan exportera direkt till Fortnox.
								</p>
								<div className='flex flex-wrap items-center gap-2'>
									{settingsButton}
								</div>
							</div>
						)
					)}
				</CardContent>
			)}
		</Card>
	);
}

