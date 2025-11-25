'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { AddTimeEntryModal } from './add-time-entry-modal';

interface WorkOrderTimeTabProps {
	workOrderId: string;
	projectId: string;
	orgId: string;
}

export function WorkOrderTimeTab({ workOrderId, projectId, orgId }: WorkOrderTimeTabProps) {
	const queryClient = useQueryClient();
	const [isAddTimeModalOpen, setIsAddTimeModalOpen] = useState(false);

	// Fetch time entries for this specific work order only
	const { data: timeEntries, isLoading } = useQuery({
		queryKey: ['work-order-time-entries', workOrderId],
		queryFn: async () => {
			const response = await fetch(`/api/time/entries?work_order_id=${workOrderId}`);
			if (!response.ok) {
				throw new Error('Kunde inte hämta tidrapporter');
			}
			const data = await response.json();
			return data.entries || [];
		},
	});

	// Calculate summary statistics
	const summary = timeEntries
		? timeEntries.reduce(
				(acc: any, entry: any) => {
					const minutes = entry.duration_min || 0;
					acc.totalMinutes += minutes;
					const userId = entry.user_id;
					if (!acc.byUser[userId]) {
						acc.byUser[userId] = {
							user: entry.user,
							minutes: 0,
						};
					}
					acc.byUser[userId].minutes += minutes;
					return acc;
				},
				{ totalMinutes: 0, byUser: {} as Record<string, { user: any; minutes: number }> }
			)
		: { totalMinutes: 0, byUser: {} };

	const formatDuration = (minutes: number): string => {
		const hours = Math.floor(minutes / 60);
		const mins = Math.round(minutes % 60);
		if (hours === 0) return `${mins} min`;
		if (mins === 0) return `${hours} h`;
		return `${hours} h ${mins} min`;
	};

	const getStatusBadge = (status: string) => {
		const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
			draft: { label: 'Utkast', variant: 'outline' },
			submitted: { label: 'Inskickad', variant: 'default' },
			approved: { label: 'Godkänd', variant: 'default' },
			rejected: { label: 'Avvisad', variant: 'destructive' },
		};
		const config = variants[status] || { label: status, variant: 'outline' as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-muted-foreground">Laddar tidrapporter...</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Summary Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Tidssammanfattning
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="text-sm text-muted-foreground">Total tid</p>
							<p className="text-2xl font-bold">
								{formatDuration(summary.totalMinutes)}
							</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Antal tidrapporter</p>
							<p className="text-2xl font-bold">{timeEntries?.length || 0}</p>
						</div>
					</div>

					{Object.keys(summary.byUser).length > 0 && (
						<div>
							<p className="text-sm text-muted-foreground mb-2">Tid per användare</p>
							<div className="space-y-2">
								{Object.values(summary.byUser).map((userData: any) => (
									<div key={userData.user?.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
										<div className="flex items-center gap-2">
											<User className="h-4 w-4 text-muted-foreground" />
											<span className="font-medium">
												{userData.user?.full_name || userData.user?.email || 'Okänd användare'}
											</span>
										</div>
										<span className="font-semibold">{formatDuration(userData.minutes)}</span>
									</div>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Actions */}
			<div className="flex justify-end">
				<Button onClick={() => setIsAddTimeModalOpen(true)}>
					<Plus className="h-4 w-4 mr-2" />
					Lägg till tid
				</Button>
			</div>

			{/* Add Time Modal */}
			<AddTimeEntryModal
				open={isAddTimeModalOpen}
				onOpenChange={setIsAddTimeModalOpen}
				orgId={orgId}
				projectId={projectId}
				workOrderId={workOrderId}
				onSuccess={() => {
					// Invalidate and refetch time entries
					queryClient.invalidateQueries({ queryKey: ['work-order-time-entries', workOrderId] });
				}}
			/>

			{/* Time Entries List */}
			{timeEntries && timeEntries.length > 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>Tidrapporter</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{timeEntries.map((entry: any) => (
								<Card key={entry.id} className="border-border">
									<CardContent className="p-4">
										<div className="flex items-start justify-between">
											<div className="flex-1 space-y-2">
												<div className="flex items-center gap-2 flex-wrap">
													<Calendar className="h-4 w-4 text-muted-foreground" />
													<span className="font-medium">
														{format(new Date(entry.start_at), 'yyyy-MM-dd HH:mm', { locale: sv })}
													</span>
													{entry.stop_at && (
														<>
															<span className="text-muted-foreground">-</span>
															<span>
																{format(new Date(entry.stop_at), 'HH:mm', { locale: sv })}
															</span>
														</>
													)}
													{getStatusBadge(entry.status)}
												</div>
												{entry.user && (
													<div className="flex items-center gap-2">
														<User className="h-4 w-4 text-muted-foreground" />
														<span className="text-sm text-muted-foreground">
															{entry.user.full_name || entry.user.email}
														</span>
													</div>
												)}
												{entry.task_label && (
													<p className="text-sm">{entry.task_label}</p>
												)}
												{entry.notes && (
													<p className="text-sm text-muted-foreground">{entry.notes}</p>
												)}
											</div>
											<div className="text-right">
												<p className="font-semibold">
													{formatDuration(entry.duration_min || 0)}
												</p>
												{entry.billing_type && (
													<Badge variant="outline" className="mt-1">
														{entry.billing_type}
													</Badge>
												)}
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="py-12 text-center">
						<Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
						<p className="text-muted-foreground">Inga tidrapporter registrerade ännu</p>
						<p className="text-sm text-muted-foreground mt-2">
							Klicka på "Lägg till tid" för att börja registrera tid på denna arbetsorder
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
