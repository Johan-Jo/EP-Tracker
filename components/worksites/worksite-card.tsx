'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QrCode, MapPin, Eye } from 'lucide-react';
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
					'cursor-pointer rounded-3xl bg-white p-6 text-left text-[var(--color-gray-700)] shadow-[0_18px_34px_-26px_rgba(0,0,0,0.15)] transition-all duration-200 hover:shadow-[0_24px_44px_-30px_rgba(0,0,0,0.2)]',
					'dark:bg-[#201e1d] dark:text-[#f5eee6] dark:shadow-[0_24px_48px_-26px_rgba(0,0,0,0.85)] dark:hover:shadow-[0_28px_52px_-28px_rgba(0,0,0,0.85)]',
					isSelected && 'ring-2 ring-[var(--color-orange-400)]/20 dark:ring-[#f6cda0]/25'
				)}
				onClick={onSelect}
			>
				<CardHeader className='px-0 pt-0 pb-6'>
					<div className='flex items-start justify-between gap-4'>
						<div className='flex-1 space-y-1'>
							<CardTitle className='flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--color-gray-900)] dark:text-[#f7e3c8]'>
								{worksite.name}
								{worksite.status && (
									<Badge className='rounded-full bg-[var(--color-green-100)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-green-700)] dark:bg-[#164524] dark:text-[#d8f5e0]'>
										{worksite.status === 'active' ? 'Aktiv' : worksite.status}
									</Badge>
								)}
							</CardTitle>
							<CardDescription className='text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-gray-500)] dark:text-[#cbb19e]'>
								{worksite.project_number && <span>Projekt {worksite.project_number}</span>}
								{worksite.worksite_code && (
									<span className='before:mx-3 before:text-[var(--color-gray-400)] before:content-["·"] dark:before:text-[#cbb19e]'>
										Plats-id {worksite.worksite_code}
									</span>
								)}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className='space-y-6 border-t border-[var(--color-gray-200)] pt-6 text-sm dark:border-[#2f1f16] dark:text-[#e3d2c0]'>
					<div className='grid gap-8 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)] md:items-start'>
						{/* Address */}
						<div className='space-y-3'>
							<div className='flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-gray-500)] dark:text-[#c6af96]'>
								<MapPin className='h-4 w-4 text-[var(--color-gray-500)] dark:text-[#f5c888]' />
								Adress
							</div>
							<div className='ml-6 space-y-1 text-[13px] leading-relaxed text-[var(--color-gray-800)] dark:text-[#f5eee6]'>
								{worksite.address_line1 && <div>{worksite.address_line1}</div>}
								{worksite.address_line2 && <div>{worksite.address_line2}</div>}
								{(worksite.city || worksite.country) && (
									<div>{[worksite.city, worksite.country].filter(Boolean).join(', ')}</div>
								)}
							</div>
						</div>

						{/* Actions */}
						<div className='space-y-3 md:pl-4'>
							<div className='flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-gray-500)] dark:text-[#c6af96]'>
								<QrCode className='h-4 w-4 text-[var(--color-gray-500)] dark:text-[#f5c888]' />
								Snabbåtgärder
							</div>
							<div className='ml-1 flex flex-wrap gap-2'>
								<Button
									variant='outline'
									size='sm'
									onClick={(e) => {
										e.stopPropagation();
										if (onSelect) onSelect();
									}}
									className='flex items-center gap-2 rounded-full border border-[var(--color-gray-300)] bg-white px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-gray-800)] transition-colors hover:border-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] dark:border-[#e3d3bf]/70 dark:bg-[#252120] dark:text-[#f5eee6] dark:hover:border-[#f3c089] dark:hover:bg-[#2c2625]'
								>
									<Eye className='h-3.5 w-3.5' />
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
											className='flex items-center gap-2 rounded-full border border-[var(--color-gray-300)] bg-white px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-gray-800)] transition-colors hover:border-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] dark:border-[#e3d3bf]/70 dark:bg-[#252120] dark:text-[#f5eee6] dark:hover:border-[#f3c089] dark:hover:bg-[#2c2625]'
										>
											<QrCode className='h-3.5 w-3.5' />
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
											className='flex items-center gap-2 rounded-full border border-[var(--color-gray-300)] bg-white px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-gray-800)] transition-colors hover:border-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] disabled:opacity-60 dark:border-[#e3d3bf]/70 dark:bg-[#252120] dark:text-[#f5eee6] dark:hover:border-[#f3c089] dark:hover:bg-[#2c2625]'
										>
											<QrCode className='h-3.5 w-3.5' />
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

