'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QrCode, MapPin } from 'lucide-react';
import { QRDialog } from './qr-dialog';

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
			<Card className={`border-2 transition-colors cursor-pointer ${isSelected ? 'border-orange-500 bg-orange-50/50' : 'hover:border-gray-300'}`} onClick={onSelect}>
				<CardHeader>
					<div className='flex items-start justify-between'>
						<div className='flex-1'>
							<CardTitle className='flex items-center gap-2 mb-1'>
								{worksite.name}
								{worksite.status === 'active' && (
									<Badge className='bg-green-500 hover:bg-green-600'>Aktiv</Badge>
								)}
							</CardTitle>
							<CardDescription>
								{worksite.project_number && (
									<span>Projekt: {worksite.project_number}</span>
								)}
								{worksite.worksite_code && (
									<span className='ml-4'>Plats-ID: {worksite.worksite_code}</span>
								)}
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className='grid gap-4 md:grid-cols-2'>
						{/* Address */}
						<div className='space-y-2'>
							<div className='flex items-center gap-2 text-sm font-medium'>
								<MapPin className='w-4 h-4 text-muted-foreground' />
								Adress
							</div>
							<div className='text-sm text-muted-foreground pl-6'>
								{worksite.address_line1 && <div>{worksite.address_line1}</div>}
								{worksite.address_line2 && <div>{worksite.address_line2}</div>}
								{(worksite.city || worksite.country) && (
									<div>{[worksite.city, worksite.country].filter(Boolean).join(', ')}</div>
								)}
							</div>
						</div>

						{/* Actions */}
						<div className='space-y-2'>
							<div className='flex items-center gap-2 text-sm font-medium'>
								<QrCode className='w-4 h-4 text-muted-foreground' />
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
										>
											<QrCode className='w-4 h-4 mr-1' />
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
										>
											<QrCode className='w-4 h-4 mr-1' />
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

