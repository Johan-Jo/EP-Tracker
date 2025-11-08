'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QrCode, MapPin } from 'lucide-react';
import { QRDialog } from './qr-dialog';
import { cn } from '@/lib/utils';

interface WorksiteCardProps {
	worksite: {
		id: string;
		name: string;
		project_number?: string | null;
		worksite_code?: string | null;
		worksite_enabled?: boolean | null;
		address_line1?: string | null;
		address_line2?: string | null;
		city?: string | null;
		country?: string | null;
		status?: string;
	};
	canEdit: boolean;
	onSelect?: () => void;
	isSelected?: boolean;
}

export function WorksiteCard({ worksite, canEdit, onSelect, isSelected }: WorksiteCardProps) {
	const [showPlatsQR, setShowPlatsQR] = useState(false);
	const [showKontrollQR, setShowKontrollQR] = useState(false);
	const [controlQRToken, setControlQRToken] = useState<string | null>(null);
	const [controlQRExpiresAt, setControlQRExpiresAt] = useState<Date | null>(null);
	const [isGeneratingToken, setIsGeneratingToken] = useState(false);

	const handleGeneratePlatsQR = () => {
		setShowPlatsQR(true);
	};

	const handleGenerateKontrollQR = async () => {
		setIsGeneratingToken(true);
		try {
			if (!worksite.worksite_enabled) {
				alert('Aktivera personalliggare för projektet innan du genererar Kontroll-QR.');
				return;
			}
			const response = await fetch(`/api/worksites/${worksite.id}/control-token`, {
				method: 'POST',
			});
			if (!response.ok) {
				const j = await response.json().catch(() => ({}));
				throw new Error(j.error || 'Failed to generate control token');
			}
			const data = await response.json();
			setControlQRToken(data.token);
			setControlQRExpiresAt(data.expiresAt ? new Date(data.expiresAt) : null);
			setShowKontrollQR(true);
		} catch (err) {
			console.error('Error generating control QR:', err);
			alert(`Kunde inte generera Kontroll-QR${(err as Error)?.message ? `: ${(err as Error).message}` : ''}`);
		} finally {
			setIsGeneratingToken(false);
		}
	};

	return (
		<>
			<Card
				className={cn(
					'cursor-pointer rounded-2xl border border-border/60 bg-[var(--color-card)] transition-all duration-200 hover:border-orange-400/40 hover:shadow-lg dark:border-[#2d1b15] dark:bg-[#19100d]',
					isSelected && 'border-orange-500 ring-2 ring-orange-500/30 dark:border-orange-400 dark:ring-orange-400/30'
				)}
				onClick={onSelect}
			>
				<CardHeader className='pb-4'>
					<div className='flex items-start justify-between gap-4'>
						<div className='flex-1 space-y-1'>
							<CardTitle className='flex items-center gap-2 text-foreground dark:text-white'>
								{worksite.name}
								{worksite.status === 'active' && (
									<Badge className='bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-200'>
										Aktiv
									</Badge>
								)}
							</CardTitle>
							<CardDescription className='flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground dark:text-white/70'>
								{worksite.project_number && <span>Projekt: {worksite.project_number}</span>}
								{worksite.worksite_code && <span>Plats-ID: {worksite.worksite_code}</span>}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className='border-t border-border/40 pt-4 text-sm dark:border-[#2d1b15]'>
					<div className='grid gap-6 md:grid-cols-2'>
						{/* Address */}
						<div className='space-y-3'>
							<div className='flex items-center gap-2 text-sm font-semibold text-foreground dark:text-white'>
								<MapPin className='h-4 w-4 text-muted-foreground dark:text-white/60' />
								Adress
							</div>
							<div className='space-y-1 pl-6 text-sm text-muted-foreground dark:text-white/70'>
								{worksite.address_line1 && <div>{worksite.address_line1}</div>}
								{worksite.address_line2 && <div>{worksite.address_line2}</div>}
								{(worksite.city || worksite.country) && (
									<div>{[worksite.city, worksite.country].filter(Boolean).join(', ')}</div>
								)}
							</div>
						</div>

						{/* Actions */}
						<div className='space-y-3'>
							<div className='flex items-center gap-2 text-sm font-semibold text-foreground dark:text-white'>
								<QrCode className='h-4 w-4 text-muted-foreground dark:text-white/60' />
								Snabbåtgärder
							</div>
							<div className='flex flex-wrap gap-2 pl-6'>
								<Button
									variant='outline'
									size='sm'
									onClick={(e) => {
										e.stopPropagation();
										if (onSelect) onSelect();
									}}
									className='border-border/60 text-foreground hover:border-orange-400 hover:text-orange-500 dark:border-[#3a251d] dark:text-white dark:hover:border-orange-400 dark:hover:text-orange-200'
								>
									Välj projekt
								</Button>
								{canEdit && (
									<>
										<Button
											variant='outline'
											size='sm'
											onClick={(e) => {
												e.stopPropagation();
												handleGeneratePlatsQR();
											}}
											className='border-border/60 text-foreground hover:border-orange-400 hover:text-orange-500 dark:border-[#3a251d] dark:text-white dark:hover:border-orange-400 dark:hover:text-orange-200'
										>
											<QrCode className='mr-1 h-4 w-4' />
											Plats-QR
										</Button>
										<Button
											variant='outline'
											size='sm'
											onClick={(e) => {
												e.stopPropagation();
												handleGenerateKontrollQR();
											}}
											disabled={isGeneratingToken}
											className='border-border/60 text-foreground hover:border-orange-400 hover:text-orange-500 disabled:opacity-60 dark:border-[#3a251d] dark:text-white dark:hover:border-orange-400 dark:hover:text-orange-200'
										>
											<QrCode className='mr-1 h-4 w-4' />
											{isGeneratingToken ? 'Genererar...' : 'Kontroll-QR'}
										</Button>
									</>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* QR Dialogs */}
			{showPlatsQR && (
				<QRDialog
					open={showPlatsQR}
					onOpenChange={setShowPlatsQR}
					title='Plats-QR'
					description='Använd denna QR-kod för att tillåta incheckning på platsen'
					value={`${window.location.origin}/worksites/${worksite.id}/checkin`}
				/>
			)}
			{showKontrollQR && controlQRToken && (
				<QRDialog
					open={showKontrollQR}
					onOpenChange={setShowKontrollQR}
					title='Kontroll-QR'
					description='Använd denna QR-kod för att visa kontrollvyn (engångstoken)'
					value={`${window.location.origin}/worksites/${worksite.id}/control?token=${controlQRToken}`}
					expiresAt={controlQRExpiresAt || undefined}
				/>
			)}
		</>
	);
}

