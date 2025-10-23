'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WeekScheduleView } from './week-schedule-view';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { WeekPlanningData } from '@/lib/schemas/planning';
import { format, startOfWeek } from 'date-fns';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';

export function PlanningPageClient() {
	const queryClient = useQueryClient();
	const [currentWeek, setCurrentWeek] = useState(() => {
		const now = new Date();
		return startOfWeek(now, { weekStartsOn: 1 });
	});

	// Fetch planning data
	const { data, isLoading, error, refetch } = useQuery<WeekPlanningData>({
		queryKey: ['planning', format(currentWeek, 'yyyy-MM-dd')],
		queryFn: async () => {
			const weekParam = format(currentWeek, 'yyyy-MM-dd');
			const response = await fetch(`/api/planning?week=${weekParam}`, {
				cache: 'no-store', // Never cache at HTTP level
				headers: {
					'Cache-Control': 'no-cache',
				},
			});
			
			if (!response.ok) {
				throw new Error('Failed to fetch planning data');
			}
			
			const json = await response.json();
			return {
				resources: json.resources || [],
				projects: json.projects || [],
				assignments: json.assignments || [],
				absences: json.absences || [],
			};
		},
		staleTime: 0, // Always consider data stale
		gcTime: 0, // Don't keep old data in cache
		refetchOnMount: 'always', // Always refetch when component mounts
	});

	// Drag-and-drop mutation with optimistic updates
	const dragDropMutation = useMutation({
		mutationFn: async ({ assignmentId, payload }: { assignmentId: string; payload: any }) => {
			const response = await fetch(`/api/assignments/${assignmentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte flytta uppdrag');
			}
			
			return response.json();
		},
		onMutate: async ({ assignmentId, payload }) => {
			// Cancel outgoing refetches (so they don't overwrite optimistic update)
			await queryClient.cancelQueries({ queryKey: ['planning'] });
			
			// Snapshot previous value
			const previousData = queryClient.getQueryData<WeekPlanningData>(['planning', format(currentWeek, 'yyyy-MM-dd')]);
			
			// Optimistically update to the new value
			if (previousData) {
				queryClient.setQueryData<WeekPlanningData>(['planning', format(currentWeek, 'yyyy-MM-dd')], {
					...previousData,
					assignments: previousData.assignments.map(a => 
						a.id === assignmentId 
							? { ...a, ...payload } // Apply changes immediately
							: a
					),
				});
			}
			
			// Return context with snapshot for rollback
			return { previousData };
		},
		onError: (err, variables, context) => {
			// Rollback on error
			if (context?.previousData) {
				queryClient.setQueryData(['planning', format(currentWeek, 'yyyy-MM-dd')], context.previousData);
			}
			toast.error(err.message || 'Kunde inte flytta uppdrag');
		},
		onSuccess: () => {
			toast.success('Uppdrag flyttat!');
		},
		onSettled: () => {
			// Always refetch to sync with server state
			queryClient.invalidateQueries({ queryKey: ['planning'] });
		},
	});

	// Create/Update assignment mutation
	const createAssignmentMutation = useMutation({
		mutationFn: async (assignmentData: any) => {
			const isEdit = !!assignmentData.id;
			
			// Transform form data to API format
			// Parse date string as local date (YYYY-MM-DD)
			const [year, month, day] = assignmentData.date.split('-').map(Number);
			const startDate = new Date(year, month - 1, day); // month is 0-indexed
			const endDate = new Date(year, month - 1, day);

			if (assignmentData.all_day) {
				startDate.setHours(0, 0, 0, 0);
				endDate.setHours(23, 59, 59, 999);
			} else {
				const [startHour, startMin] = assignmentData.start_time.split(':');
				const [endHour, endMin] = assignmentData.end_time.split(':');
				startDate.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
				endDate.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
			}

			const payload = isEdit ? {
				// For PATCH, only send the changed fields
				project_id: assignmentData.project_id,
				user_id: assignmentData.user_ids[0], // Single user for edit
				start_ts: startDate.toISOString(),
				end_ts: endDate.toISOString(),
				all_day: assignmentData.all_day,
				address: assignmentData.address,
				note: assignmentData.note,
				sync_to_mobile: assignmentData.sync_to_mobile,
			} : {
				// For POST, support multi-assign
				project_id: assignmentData.project_id,
				user_ids: assignmentData.user_ids,
				start_ts: startDate.toISOString(),
				end_ts: endDate.toISOString(),
				all_day: assignmentData.all_day,
				address: assignmentData.address,
				note: assignmentData.note,
				sync_to_mobile: assignmentData.sync_to_mobile,
			};

			const url = isEdit 
				? `/api/assignments/${assignmentData.id}` 
				: '/api/assignments';

			const response = await fetch(url, {
				method: isEdit ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				if (response.status === 409) {
					// Handle conflicts
					throw new Error(
						`Konflikt: ${error.conflicts?.map((c: any) => c.details).join(', ')}`
					);
				}
				throw new Error(error.error || (isEdit ? 'Failed to update assignment' : 'Failed to create assignment'));
			}

			return response.json();
		},
		onSuccess: async (data, variables) => {
			const isEdit = !!variables.id;
			toast.success(isEdit ? 'Uppdrag uppdaterat!' : 'Uppdrag skapat!');
			queryClient.invalidateQueries({ queryKey: ['planning'] });
			// Wait for DB commit before refetching
			await new Promise(resolve => setTimeout(resolve, 100));
			await refetch();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte spara uppdrag');
		},
	});

	const handleAddAssignment = async (data: any) => {
		await createAssignmentMutation.mutateAsync(data);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center">
					<p className="text-destructive mb-4">
						Kunde inte ladda planeringsdata
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

	if (!data) {
		return null;
	}

	return (
		<>
			<PageTourTrigger tourId="planning" />
			<WeekScheduleView
				data={data}
				onAddAssignment={handleAddAssignment}
				onDragDropUpdate={dragDropMutation.mutate}
				onRefresh={async () => {
					queryClient.invalidateQueries({ queryKey: ['planning'] });
					await new Promise(resolve => setTimeout(resolve, 100));
					await refetch();
				}}
			/>
		</>
	);
}

