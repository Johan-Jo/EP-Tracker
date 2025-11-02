'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

interface CheckInPageClientProps {
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

export function CheckInPageClient({ project, userId }: CheckInPageClientProps) {
	const [isCheckingIn, setIsCheckingIn] = useState(false);
	const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);

	const handleCheckIn = async () => {
		setIsCheckingIn(true);
		
		try {
			// Record check-in event to time_entries
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
		<div className='min-h-screen bg-gray-50 p-4 md:p-8'>
			<div className='max-w-2xl mx-auto space-y-6'>
				{/* Header */}
				<div className='text-center'>
					<h1 className='text-3xl font-bold text-gray-900 mb-2'>Personalliggare</h1>
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
							<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
								<div className='flex items-center gap-2 text-blue-700'>
									<AlertCircle className='w-5 h-5' />
									<span className='font-medium'>Välkommen till arbetsplatsen</span>
								</div>
								<p className='text-blue-600 mt-1'>
									Scanna QR-koden eller tryck på knappen nedan för att checka in
								</p>
							</div>
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
							💡 <strong>Tips:</strong> Scanna QR-koden på arbetsplatsen eller tryck på "Checka in" för att registrera närvaro.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

