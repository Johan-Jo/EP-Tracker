'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';

interface CheckInTabProps {
	project: {
		id: string;
		name: string;
		worksite_code?: string | null;
		address_line1?: string | null;
		address_line2?: string | null;
		city?: string | null;
	};
	userId: string;
}

export function CheckInTab({ project, userId }: CheckInTabProps) {
	const [isCheckingIn, setIsCheckingIn] = useState(false);
	const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);

	const handleCheckIn = async () => {
		setIsCheckingIn(true);
		
		try {
			const response = await fetch('/api/worksites/checkin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					project_id: project.id,
					user_id: userId,
					check_in_ts: new Date().toISOString(),
					source: 'qr_scan',
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte checka in');
			}

			const data = await response.json();
			setLastCheckIn(data.check_in_ts);
			toast.success('Incheckad!');
		} catch (error) {
			console.error('Check-in error:', error);
			toast.error(error instanceof Error ? error.message : 'Kunde inte checka in');
		} finally {
			setIsCheckingIn(false);
		}
	};

	const address = [
		project.address_line1,
		project.address_line2,
		project.city
	].filter(Boolean).join(', ');

	return (
		<div className='space-y-6'>
			{/* Header */}
			<div className='text-center'>
				<h2 className='text-2xl font-bold text-gray-900 mb-2'>Check-in</h2>
				<Badge variant='outline' className='text-lg px-4 py-1'>
					{project.worksite_code || project.name}
				</Badge>
			</div>

			{/* Project Card */}
			<Card>
				<CardHeader>
					<CardTitle className='text-xl'>{project.name}</CardTitle>
					{address && (
						<CardDescription className='flex items-center gap-2 pt-2'>
							<MapPin className='w-4 h-4' />
							{address}
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					{lastCheckIn ? (
						<div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-4'>
							<div className='flex items-center gap-2 text-green-700'>
								<CheckCircle className='w-5 h-5' />
								<span className='font-medium'>Senast incheckad:</span>
							</div>
							<p className='text-green-600 mt-1'>
								{format(new Date(lastCheckIn), 'PPP HH:mm', { locale: sv })}
							</p>
						</div>
					) : (
						<>
							<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
								<div className='flex items-center gap-2 text-blue-700'>
									<AlertCircle className='w-5 h-5' />
									<span className='font-medium'>Välkommen till arbetsplatsen</span>
								</div>
								<p className='text-blue-600 mt-1'>
									Tryck på knappen nedan för att checka in
								</p>
							</div>
							
							{/* Show QR code for sharing this check-in page */}
							<div className='bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4'>
								<p className='text-center text-sm font-medium text-gray-700 mb-3'>
									QR-kod för att dela denna check-in sida
								</p>
								<div className='flex justify-center'>
									<div className='bg-white p-3 rounded-lg'>
										<QRCode 
											value={typeof window !== 'undefined' ? `${window.location.origin}/worksites/${project.id}/checkin` : ''} 
											size={200}
										/>
									</div>
								</div>
							</div>
						</>
					)}

					<Button
						onClick={handleCheckIn}
						disabled={isCheckingIn}
						size='lg'
						className='w-full h-14 text-lg'
					>
						{isCheckingIn ? (
							<>
								<Loader2 className='w-5 h-5 mr-2 animate-spin' />
								Checkar in...
							</>
						) : (
							<>
								<CheckCircle className='w-5 h-5 mr-2' />
								Checka in
							</>
						)}
					</Button>

					<div className='mt-6 flex items-center justify-center gap-2 text-sm text-gray-500'>
						<Clock className='w-4 h-4' />
						<span>{format(new Date(), 'PPP HH:mm', { locale: sv })}</span>
					</div>
				</CardContent>
			</Card>

			{/* Info */}
			<Card className='bg-orange-50 border-orange-200'>
				<CardContent className='pt-6'>
					<p className='text-sm text-orange-800'>
						💡 <strong>Tips:</strong> Tryck på "Checka in" för att registrera närvaro. Dela QR-koden ovan för att andra ska kunna checka in på samma sätt.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

