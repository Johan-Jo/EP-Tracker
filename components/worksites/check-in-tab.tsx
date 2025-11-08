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
		<div className='space-y-6 text-[var(--color-gray-900)] dark:text-[#f5eee6]'>
			{/* Header */}
			<div className='space-y-2 text-center'>
				<h2 className='text-2xl font-semibold text-[var(--color-gray-900)] dark:text-[#f7e3c8]'>Check-in</h2>
				<Badge variant='outline' className='rounded-full border border-[var(--color-gray-300)] bg-[var(--color-gray-100)] px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-gray-600)] dark:border-[#4a2f21] dark:bg-[#2a1b15] dark:text-[#f1e2d4]'>
					{project.worksite_code || project.name}
				</Badge>
			</div>

			{/* Project Card */}
			<Card className='rounded-3xl border border-[var(--color-gray-200)] bg-white shadow-[0_18px_34px_-24px_rgba(0,0,0,0.15)] dark:border-[#3b291d] dark:bg-[#201e1d] dark:shadow-[0_24px_48px_-26px_rgba(0,0,0,0.85)]'>
				<CardHeader className='pb-3'>
					<CardTitle className='text-xl font-semibold text-[var(--color-gray-900)] dark:text-[#f7e3c8]'>{project.name}</CardTitle>
					{address && (
						<CardDescription className='flex items-center gap-2 pt-2 text-sm text-[var(--color-gray-600)] dark:text-[#cdbfb0]'>
							<MapPin className='h-4 w-4 text-[var(--color-gray-500)] dark:text-[#f2d6bd]' />
							{address}
						</CardDescription>
					)}
				</CardHeader>
				<CardContent className='space-y-4 pt-2 text-[var(--color-gray-700)] dark:text-[#e7ddd0]'>
					{lastCheckIn ? (
						<div className='rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 dark:border-emerald-500/35 dark:bg-emerald-500/12'>
							<div className='flex items-center gap-2 text-emerald-600 dark:text-emerald-200'>
								<CheckCircle className='w-5 h-5' />
								<span className='font-medium'>Senast incheckad:</span>
							</div>
							<p className='mt-1 text-emerald-600 dark:text-emerald-200'>
								{format(new Date(lastCheckIn), 'PPP HH:mm', { locale: sv })}
							</p>
						</div>
					) : (
						<>
							<div className='rounded-xl border border-blue-500/25 bg-blue-500/10 p-4 dark:border-blue-500/35 dark:bg-blue-500/12'>
								<div className='flex items-center gap-2 text-blue-700 dark:text-blue-200'>
									<AlertCircle className='w-5 h-5' />
									<span className='font-medium'>Välkommen till arbetsplatsen</span>
								</div>
								<p className='mt-1 text-blue-600 dark:text-blue-200'>
									Tryck på knappen nedan för att checka in
								</p>
							</div>
							
							{/* Show QR code for sharing this check-in page */}
							<div className='rounded-xl border border-[var(--color-gray-200)] bg-white p-6 dark:border-[#3b291d] dark:bg-[#26201b]'>
								<p className='mb-3 text-center text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--color-gray-500)] dark:text-[#c6af96]'>
									QR-kod för att dela denna check-in sida
								</p>
								<div className='flex justify-center'>
									<div className='rounded-lg bg-white p-3 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.25)] dark:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.55)]'>
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
						className='h-14 w-full rounded-full bg-[var(--color-orange-500)] text-lg font-semibold text-white transition-colors hover:bg-[var(--color-orange-600)] dark:bg-[#f3c089] dark:text-[#2f1b0f] dark:hover:bg-[#f5c99a]'
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

					<div className='mt-6 flex items-center justify-center gap-2 text-sm text-[var(--color-gray-500)] dark:text-[#cdbfb0]'>
						<Clock className='h-4 w-4 text-[var(--color-gray-500)] dark:text-[#cdbfb0]' />
						<span>{format(new Date(), 'PPP HH:mm', { locale: sv })}</span>
					</div>
				</CardContent>
			</Card>

			{/* Info */}
			<Card className='rounded-3xl border border-[var(--color-orange-200)] bg-[var(--color-orange-50)] shadow-[0_18px_34px_-24px_rgba(0,0,0,0.12)] dark:border-[#4a2f21] dark:bg-[#2a1b15] dark:text-[#f0d5b5] dark:shadow-[0_24px_48px_-26px_rgba(0,0,0,0.75)]'>
				<CardContent className='pt-6 text-sm text-[var(--color-orange-700)] dark:text-[#f0d5b5]'>
					<p>
						💡 <strong className='text-[var(--color-orange-800)] dark:text-[#ffd9a8]'>Tips:</strong> Tryck på "Checka in" för att registrera närvaro och dela QR-koden ovan för kollegor som saknar åtkomst.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

