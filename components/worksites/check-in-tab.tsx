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
			<div className='space-y-2 text-center'>
				<h2 className='text-2xl font-bold text-foreground dark:text-white'>Check-in</h2>
				<Badge variant='outline' className='px-4 py-1 text-lg border border-border/60 bg-[var(--color-card)] dark:border-[#3a251d] dark:bg-[#20130e] dark:text-white'>
					{project.worksite_code || project.name}
				</Badge>
			</div>

			{/* Project Card */}
			<Card className='rounded-2xl border border-border/60 bg-[var(--color-card)] shadow-sm dark:border-[#2d1b15] dark:bg-[#1b120d]'>
				<CardHeader className='pb-4'>
					<CardTitle className='text-xl text-foreground dark:text-white'>{project.name}</CardTitle>
					{address && (
						<CardDescription className='flex items-center gap-2 pt-2 text-muted-foreground dark:text-white/70'>
							<MapPin className='w-4 h-4 text-muted-foreground dark:text-white/60' />
							{address}
						</CardDescription>
					)}
				</CardHeader>
				<CardContent className='space-y-4 pt-0'>
					{lastCheckIn ? (
						<div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4'>
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
							<div className='rounded-xl border border-blue-500/30 bg-blue-500/10 p-4'>
								<div className='flex items-center gap-2 text-blue-700 dark:text-blue-200'>
									<AlertCircle className='w-5 h-5' />
									<span className='font-medium'>Välkommen till arbetsplatsen</span>
								</div>
								<p className='mt-1 text-blue-600 dark:text-blue-200'>
									Tryck på knappen nedan för att checka in
								</p>
							</div>
							
							{/* Show QR code for sharing this check-in page */}
							<div className='rounded-xl border border-border/60 bg-[var(--color-card)]/70 p-6 dark:border-[#2d1b15] dark:bg-[#21140f]'>
								<p className='mb-3 text-center text-sm font-medium text-muted-foreground dark:text-white/70'>
									QR-kod för att dela denna check-in sida
								</p>
								<div className='flex justify-center'>
									<div className='rounded-lg bg-white p-3 shadow-sm'>
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
						className='h-14 w-full text-lg'
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

					<div className='mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground dark:text-white/60'>
						<Clock className='w-4 h-4 text-muted-foreground dark:text-white/50' />
						<span>{format(new Date(), 'PPP HH:mm', { locale: sv })}</span>
					</div>
				</CardContent>
			</Card>

			{/* Info */}
			<Card className='rounded-2xl border border-orange-500/30 bg-orange-500/10 shadow-sm dark:border-orange-400/40 dark:bg-orange-500/15'>
				<CardContent className='pt-6'>
					<p className='text-sm text-orange-700 dark:text-orange-200'>
						💡 <strong>Tips:</strong> Tryck på "Checka in" för att registrera närvaro. Dela QR-koden ovan för att andra ska kunna checka in på samma sätt.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

