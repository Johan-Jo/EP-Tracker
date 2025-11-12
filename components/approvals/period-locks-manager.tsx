'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPeriodLockSchema, type CreatePeriodLockInput, type PeriodLockWithUser } from '@/lib/schemas/period-lock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatPeriod } from '@/lib/utils/period-format';

interface PeriodLocksManagerProps {
	orgId: string;
	userRole: 'admin' | 'foreman' | 'worker' | 'finance' | 'ue';
}

export function PeriodLocksManager({ orgId, userRole }: PeriodLocksManagerProps) {
	const [periodLocks, setPeriodLocks] = useState<PeriodLockWithUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [showForm, setShowForm] = useState(false);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<CreatePeriodLockInput>({
		resolver: zodResolver(createPeriodLockSchema),
	});

	// Fetch period locks
	useEffect(() => {
		fetchPeriodLocks();
	}, [orgId]);

	async function fetchPeriodLocks() {
		try {
			setLoading(true);
			const response = await fetch('/api/approvals/period-locks');
			if (!response.ok) throw new Error('Failed to fetch period locks');
			const data = await response.json();
			setPeriodLocks(data.periodLocks || []);
		} catch (error) {
			console.error('Error fetching period locks:', error);
			toast.error('Kunde inte ladda låsta perioder');
		} finally {
			setLoading(false);
		}
	}

	async function onSubmit(data: CreatePeriodLockInput) {
		try {
			setSubmitting(true);
			const response = await fetch('/api/approvals/period-locks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to lock period');
			}

			toast.success('Period låst!');
			reset();
			setShowForm(false);
			fetchPeriodLocks();
		} catch (error) {
			console.error('Error locking period:', error);
			toast.error(error instanceof Error ? error.message : 'Kunde inte låsa period');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleUnlock(lockId: string) {
		if (!confirm('Är du säker på att du vill låsa upp denna period?')) {
			return;
		}

		try {
			const response = await fetch(`/api/approvals/period-locks/${lockId}`, {
				method: 'DELETE',
			});

			if (!response.ok) throw new Error('Failed to unlock period');

			toast.success('Period upplåst!');
			fetchPeriodLocks();
		} catch (error) {
			console.error('Error unlocking period:', error);
			toast.error('Kunde inte låsa upp period');
		}
	}

	// Quick lock current week
	function setCurrentWeek() {
		const today = new Date();
		const dayOfWeek = today.getDay();
		const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday is first day
		const monday = new Date(today);
		monday.setDate(today.getDate() + diff);
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);

		const mondayStr = monday.toISOString().split('T')[0];
		const sundayStr = sunday.toISOString().split('T')[0];

		reset({
			period_start: mondayStr,
			period_end: sundayStr,
		});
	}

	if (userRole !== 'admin') {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Lock className="h-5 w-5" />
						Låsta perioder
					</CardTitle>
					<CardDescription>
						Endast administratörer kan låsa perioder
					</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<p className="text-sm text-muted-foreground">Laddar...</p>
					) : periodLocks.length === 0 ? (
						<p className="text-sm text-muted-foreground">Inga låsta perioder</p>
					) : (
						<div className="space-y-2">
							{periodLocks.map((lock) => (
								<div
									key={lock.id}
									className="flex items-center justify-between p-3 border rounded-lg"
								>
									<div className="flex items-center gap-3">
										<Lock className="h-4 w-4 text-orange-600" />
										<div>
											<p className="font-medium">
												{formatPeriod(lock.period_start, lock.period_end)}
											</p>
											{lock.reason && (
												<p className="text-sm text-muted-foreground">{lock.reason}</p>
											)}
										</div>
									</div>
									<Badge variant="secondary">Låst</Badge>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5" />
							Periodlås
						</CardTitle>
						<CardDescription>
							Lås perioder för att förhindra ändringar efter godkännande
						</CardDescription>
					</div>
					<Button
						onClick={() => setShowForm(!showForm)}
						variant={showForm ? 'outline' : 'default'}
						size="sm"
					>
						{showForm ? 'Avbryt' : 'Lås period'}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{showForm && (
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-muted/50">
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={setCurrentWeek}
								className="whitespace-nowrap"
							>
								<Calendar className="h-4 w-4 mr-2" />
								Denna vecka
							</Button>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="period_start">Startdatum</Label>
								<Input
									id="period_start"
									type="date"
									{...register('period_start')}
								/>
								{errors.period_start && (
									<p className="text-sm text-destructive mt-1">
										{errors.period_start.message}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="period_end">Slutdatum</Label>
								<Input
									id="period_end"
									type="date"
									{...register('period_end')}
								/>
								{errors.period_end && (
									<p className="text-sm text-destructive mt-1">
										{errors.period_end.message}
									</p>
								)}
							</div>
						</div>

						<div>
							<Label htmlFor="reason">Anledning (valfritt)</Label>
							<Textarea
								id="reason"
								placeholder="T.ex: Vecka 42 godkänd och exporterad till lön"
								{...register('reason')}
							/>
						</div>

						<Button type="submit" disabled={submitting}>
							{submitting ? 'Låser...' : 'Lås period'}
						</Button>
					</form>
				)}

				<div className="space-y-2">
					{loading ? (
						<p className="text-sm text-muted-foreground">Laddar...</p>
					) : periodLocks.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Inga låsta perioder. Lås en period för att förhindra ändringar.
						</p>
					) : (
						periodLocks.map((lock) => (
							<div
								key={lock.id}
								className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<Lock className="h-4 w-4 text-orange-600" />
									<div>
										<p className="font-medium">
											{formatPeriod(lock.period_start, lock.period_end)}
										</p>
										{lock.reason && (
											<p className="text-sm text-muted-foreground">{lock.reason}</p>
										)}
										<p className="text-xs text-muted-foreground mt-1">
											Låst av {lock.locked_by_user?.full_name || 'Okänd'} •{' '}
											{new Date(lock.locked_at).toLocaleDateString('sv-SE')}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant="secondary">Låst</Badge>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleUnlock(lock.id)}
										className="text-destructive hover:text-destructive"
									>
										<Unlock className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))
					)}
				</div>
			</CardContent>
		</Card>
	);
}

