'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { Plug, Download, CheckCircle2, Info, Loader2, RefreshCcw, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ImportSummary {
	created: number;
	updated: number;
	conflicts: number;
}

export interface FortnoxIntegrationStepsProps {
	/** Har orgen en aktiv Fortnox-anslutning? */
	hasFortnoxConnection: boolean;
	/** Har tokenet salary/employees-scope (om du kan avgöra det)? */
	hasPayrollScope?: boolean;
	/** ISO-string för senaste import från Fortnox, t.ex. "2025-11-18T10:23:00Z" */
	lastImportAt?: string | null;
	/** Enkel sammanfattning från senaste import */
	lastImportSummary?: ImportSummary | null;
	/** True om import just nu pågår */
	isImporting?: boolean;
	/** Klick-handler för att öppna Fortnox-inställningar (alt. länka via href) */
	onConnectClick?: () => void;
	/** Klick-handler för att trigga import från Fortnox */
	onImportClick?: () => void;
	/** URL till Fortnox-inställningar, om du vill använda <Link> istället för onConnectClick */
	settingsHref?: string;
}

function formatDateTime(value?: string | null): string | null {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleString('sv-SE', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function FortnoxIntegrationSteps(props: FortnoxIntegrationStepsProps) {
	const {
		hasFortnoxConnection,
		hasPayrollScope,
		lastImportAt,
		lastImportSummary,
		isImporting,
		onConnectClick,
		onImportClick,
		settingsHref = '/dashboard/settings/fortnox',
	} = props;

	const [isExpanded, setIsExpanded] = useState(false);
	const lastImportFormatted = formatDateTime(lastImportAt);

	const connectButton: ReactNode = onConnectClick ? (
		<Button variant='default' size='sm' onClick={onConnectClick}>
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

	const importButton: ReactNode = (
		<Button
			size='sm'
			variant='default'
			onClick={onImportClick}
			disabled={isImporting || !hasFortnoxConnection}
		>
			{isImporting ? (
				<>
					<Loader2 className='mr-2 h-4 w-4 animate-spin' />
					Importerar...
				</>
			) : (
				<>
					<Download className='mr-2 h-4 w-4' />
					Importera från Fortnox
				</>
			)}
		</Button>
	);

	return (
		<Card className='mb-6 border border-dashed'>
			<CardHeader 
				className='flex flex-row items-center justify-between gap-3 cursor-pointer hover:bg-muted/50 transition-colors'
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className='space-y-1 flex-1'>
					<CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
						<Plug className='h-5 w-5 text-emerald-500' />
						Fortnox-integration för anställda & lön
					</CardTitle>
					<p className='text-xs sm:text-sm text-muted-foreground max-w-2xl'>
						Koppla EP-Tracker till Fortnox för att importera alla anställda och kunna
						exportera löneunderlag direkt till Fortnox Lön utan dubbelarbete.
					</p>
				</div>
				<div className='flex items-center gap-3'>
					{hasFortnoxConnection ? (
						<Badge variant='outline' className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
							<CheckCircle2 className='h-3 w-3 text-emerald-500' />
							Fortnox anslutet
						</Badge>
					) : (
						<Badge variant='outline' className='flex items-center gap-1 text-amber-600 border-amber-300' onClick={(e) => e.stopPropagation()}>
							<Info className='h-3 w-3' />
							Ej anslutet
						</Badge>
					)}
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
				{/* Steg-för-steg */}
				{!hasFortnoxConnection ? (
					<Alert variant='default' className='border-amber-300 bg-amber-50/80'>
						<AlertTitle className='flex items-center gap-2'>
							<Info className='h-4 w-4 text-amber-600' />
							Steg 1: Koppla Fortnox
						</AlertTitle>
						<AlertDescription className='mt-1 text-xs sm:text-sm'>
							För att kunna importera anställda och skicka löneunderlag måste du först koppla ditt
							Fortnox-konto och ge EP-Tracker behörighet till <span className='font-medium'>Lön</span>{' '}
							och <span className='font-medium'>Personal</span>. Gå till integrationsinställningarna
							och följ guiden där.
						</AlertDescription>
					</Alert>
				) : (
					<div className='grid gap-4 md:grid-cols-[2fr,3fr]'>
						<div className='space-y-3'>
							<h3 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
								Steg-för-steg
							</h3>
							<ol className='space-y-2 text-xs sm:text-sm text-muted-foreground'>
								<li className='flex gap-2'>
									<span className='mt-[2px] h-5 w-5 shrink-0 rounded-full border text-[11px] flex items-center justify-center'>
										1
									</span>
									<div>
										<span className='font-medium'>Kontrollera anställda i Fortnox</span>
										<div className='text-xs sm:text-[13px]'>
											Säkerställ att alla anställda finns upplagda i Fortnox med korrekt
											personnummer och anställningsstatus.
										</div>
									</div>
								</li>
								<li className='flex gap-2'>
									<span className='mt-[2px] h-5 w-5 shrink-0 rounded-full border text-[11px] flex items-center justify-center'>
										2
									</span>
									<div>
										<span className='font-medium'>Importera anställda till EP-Tracker</span>
										<div className='text-xs sm:text-[13px]'>
											Klicka på &quot;Importera från Fortnox&quot; så hämtas alla anställda.
											EP-Tracker matchar på personnummer/e-post och skapar nya poster där det
											behövs.
										</div>
									</div>
								</li>
								<li className='flex gap-2'>
									<span className='mt-[2px] h-5 w-5 shrink-0 rounded-full border text-[11px] flex items-center justify-center'>
										3
									</span>
									<div>
										<span className='font-medium'>Kör löneunderlag och exportera till Fortnox Lön</span>
										<div className='text-xs sm:text-[13px]'>
											När alla anställda är på plats kan du registrera tid, låsa löneunderlag och
											exportera dem direkt till Fortnox Lön via API.
										</div>
									</div>
								</li>
							</ol>
						</div>

						<div className='space-y-3'>
							<h3 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
								Status & åtgärder
							</h3>

							<div className='flex flex-wrap items-center gap-2'>
								{importButton}
								<Button asChild size='sm' variant='outline' className='gap-1'>
									<Link href={settingsHref}>
										<Settings className='h-4 w-4' />
										Fortnox-inställningar
									</Link>
								</Button>
								<Button
									size='icon'
									variant='ghost'
									className='h-8 w-8'
									type='button'
									onClick={onImportClick}
									disabled={isImporting}
									aria-label='Kör om import'
								>
									<RefreshCcw className='h-4 w-4' />
								</Button>
							</div>

							<Separator />

							<div className='space-y-2 text-xs sm:text-sm text-muted-foreground'>
								<div className='flex items-center justify-between'>
									<span>Senaste Fortnox-import:</span>
									<span className='font-medium'>{lastImportFormatted ?? 'Ingen import ännu'}</span>
								</div>
								{lastImportSummary && (
									<div className='flex flex-wrap gap-2'>
										<Badge variant='outline' className='gap-1'>
											<CheckCircle2 className='h-3 w-3' />
											Nya: {lastImportSummary.created}
										</Badge>
										<Badge variant='outline' className='gap-1'>
											<Info className='h-3 w-3' />
											Uppdaterade: {lastImportSummary.updated}
										</Badge>
										{lastImportSummary.conflicts > 0 && (
											<Badge variant='outline' className='gap-1 text-amber-700 border-amber-300'>
												<Info className='h-3 w-3' />
												Konflikter: {lastImportSummary.conflicts}
											</Badge>
										)}
									</div>
								)}
								{!lastImportSummary && (
									<p className='text-[11px] sm:text-xs text-muted-foreground'>
										När du har kört första importen visas en sammanfattning här.
									</p>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Call-to-action-rad när Fortnox inte är kopplat */}
				{!hasFortnoxConnection && (
					<div className='flex flex-wrap items-center justify-between gap-3'>
						<p className='text-[11px] sm:text-xs text-muted-foreground max-w-xl'>
							När Fortnox är kopplat kan du importera alla anställda med ett klick och sedan skicka
							löneunderlag direkt till Fortnox Lön.
						</p>
						<div className='flex gap-2'>{connectButton}</div>
					</div>
				)}
			</CardContent>
			)}
		</Card>
	);
}

