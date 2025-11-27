'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkOrderTodayCard } from './work-order-today-card';
import { Loader2, Wrench, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

export function WorkOrderTodayScreen() {
	const queryClient = useQueryClient();

	// Fetch today's work orders
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ['work-orders-today'],
		queryFn: async () => {
			const response = await fetch('/api/mobile/work-orders/today');
			
			if (!response.ok) {
				throw new Error('Failed to fetch today work orders');
			}
			
			return response.json();
		},
		staleTime: 30000, // 30 seconds
	});

	// Start work mutation
	const startWorkMutation = useMutation({
		mutationFn: async (workOrderId: string) => {
			const response = await fetch(`/api/work-orders/${workOrderId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					actual_start_at: new Date().toISOString(),
					status: 'in_progress',
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to start work');
			}

			return response.json();
		},
		onSuccess: () => {
			toast.success('Arbete startat!');
			queryClient.invalidateQueries({ queryKey: ['work-orders-today'] });
			refetch();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte starta arbete');
		},
	});

	// End work mutation
	const endWorkMutation = useMutation({
		mutationFn: async (workOrderId: string) => {
			const response = await fetch(`/api/work-orders/${workOrderId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					actual_end_at: new Date().toISOString(),
					status: 'completed',
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to end work');
			}

			return response.json();
		},
		onSuccess: () => {
			toast.success('Arbete avslutat!');
			queryClient.invalidateQueries({ queryKey: ['work-orders-today'] });
			refetch();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte avsluta arbete');
		},
	});

	const handleStartWork = (workOrderId: string) => {
		startWorkMutation.mutate(workOrderId);
	};

	const handleEndWork = (workOrderId: string) => {
		endWorkMutation.mutate(workOrderId);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background p-6 flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-background p-6">
				<div className="max-w-2xl mx-auto text-center py-12">
					<p className="text-destructive mb-4">Kunde inte ladda arbetsorder</p>
					<Button onClick={() => refetch()} variant="outline">
						Försök igen
					</Button>
				</div>
			</div>
		);
	}

	const workOrders = data?.work_orders || [];
	const today = format(new Date(), 'EEEE d MMMM', { locale: sv });

	return (
		<div className="min-h-screen bg-background p-6">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="mb-6 flex items-center justify-between">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Wrench className="w-6 h-6 text-primary" />
							<h1 className="text-2xl font-bold">Mina arbetsorder idag</h1>
						</div>
						<p className="text-muted-foreground capitalize">{today}</p>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => refetch()}
						className="flex-shrink-0"
					>
						<RefreshCw className="w-5 h-5" />
					</Button>
				</div>

				{/* Work Order Cards */}
				{workOrders.length === 0 ? (
					<div className="text-center py-12">
						<Wrench className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
						<p className="text-lg text-muted-foreground">
							Inga arbetsorder idag
						</p>
						<p className="text-sm text-muted-foreground mt-2">
							Du har inga arbetsorder tilldelade för idag 🎉
						</p>
					</div>
				) : (
					<div className="space-y-4" data-tour="work-order-cards">
						{workOrders.map((workOrder: any) => (
							<WorkOrderTodayCard
								key={workOrder.id}
								workOrder={workOrder}
								onStartWork={handleStartWork}
								onEndWork={handleEndWork}
								isStarting={startWorkMutation.isPending}
								isEnding={endWorkMutation.isPending}
							/>
						))}
					</div>
				)}
			</div>
			<PageTourTrigger tourId="work-orders-today" />
		</div>
	);
}

