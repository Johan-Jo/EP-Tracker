'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MobileJobCard } from './mobile-job-card';
import { Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

export function MobileTodayScreen() {
	const queryClient = useQueryClient();

	// Fetch today's assignments
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['mobile-today'],
		queryFn: async () => {
			const response = await fetch('/api/mobile/today');
			
			if (!response.ok) {
				throw new Error('Failed to fetch today assignments');
			}
			
			return response.json();
		},
		staleTime: 30000, // 30 seconds
	});

	// Check-in mutation
	const checkInMutation = useMutation({
		mutationFn: async (assignmentId: string) => {
			const response = await fetch('/api/mobile/checkins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					assignment_id: assignmentId,
					event: 'check_in',
					ts: new Date().toISOString(),
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to check in');
			}

			return response.json();
		},
		onSuccess: () => {
			toast.success('Incheckad!');
			queryClient.invalidateQueries({ queryKey: ['mobile-today'] });
			refetch();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte checka in');
		},
	});

	// Check-out mutation
	const checkOutMutation = useMutation({
		mutationFn: async (assignmentId: string) => {
			const response = await fetch('/api/mobile/checkins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					assignment_id: assignmentId,
					event: 'check_out',
					ts: new Date().toISOString(),
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to check out');
			}

			return response.json();
		},
		onSuccess: () => {
			toast.success('Utcheckad!');
			queryClient.invalidateQueries({ queryKey: ['mobile-today'] });
			refetch();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte checka ut');
		},
	});

	const handleCheckIn = (assignmentId: string) => {
		checkInMutation.mutate(assignmentId);
	};

	const handleCheckOut = (assignmentId: string) => {
		checkOutMutation.mutate(assignmentId);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen p-6">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen p-6">
				<div className="text-center">
					<p className="text-destructive mb-4">
						Kunde inte ladda dagens uppdrag
					</p>
					<button
						onClick={() => refetch()}
						className="text-primary underline"
					>
						Försök igen
					</button>
				</div>
			</div>
		);
	}

	const assignments = data?.assignments || [];
	const today = format(new Date(), 'EEEE d MMMM', { locale: sv });

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="mb-6">
					<div className="flex items-center gap-2 mb-2">
						<Calendar className="w-6 h-6 text-primary" />
						<h1 className="text-2xl font-bold">Dagens uppdrag</h1>
					</div>
					<p className="text-muted-foreground capitalize">{today}</p>
				</div>

				{/* Job Cards */}
				{assignments.length === 0 ? (
					<div className="text-center py-12">
						<Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
						<p className="text-lg text-muted-foreground">
							Inga uppdrag idag
						</p>
						<p className="text-sm text-muted-foreground mt-2">
							Njut av din lediga dag! 🎉
						</p>
					</div>
				) : (
					<div className="space-y-4" data-tour="job-cards">
						{assignments.map((assignment: any) => (
							<MobileJobCard
								key={assignment.id}
								assignment={assignment}
								onCheckIn={handleCheckIn}
								onCheckOut={handleCheckOut}
								isCheckingIn={checkInMutation.isPending}
								isCheckingOut={checkOutMutation.isPending}
							/>
						))}
					</div>
				)}
			</div>
			<PageTourTrigger tourId="planning-today" />
		</div>
	);
}

