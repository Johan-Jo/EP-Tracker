'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, ExternalLink } from 'lucide-react';
import { WorkOrderWithRelations } from '@/lib/schemas/work-order';
import { toast } from 'sonner';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface User {
	id: string;
	full_name?: string;
	email?: string;
}

interface WorkOrderPlanningTabProps {
	workOrder: WorkOrderWithRelations;
	users: User[];
	canEdit: boolean;
	onUpdate: () => void;
}

export function WorkOrderPlanningTab({
	workOrder,
	users,
	canEdit,
	onUpdate,
}: WorkOrderPlanningTabProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedUsers, setSelectedUsers] = useState<string[]>(
		workOrder.assignments?.map((a) => a.user_id) || []
	);
	const [responsibleUserId, setResponsibleUserId] = useState<string>(
		workOrder.assignments?.find((a) => a.is_responsible)?.user_id || ''
	);

	const handleSaveAssignments = async () => {
		setIsSubmitting(true);

		try {
			// Prepare assignments array
			const assignments = selectedUsers.map((userId) => ({
				user_id: userId,
				is_responsible: userId === responsibleUserId,
				assignment_status: 'TILLDELAD' as const,
			}));

			const response = await fetch(`/api/work-orders/${workOrder.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ assignments }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update assignments');
			}

			toast.success('Tilldelningar uppdaterade');
			setIsEditing(false);
			onUpdate();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Ett fel uppstod');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUserToggle = (userId: string) => {
		if (selectedUsers.includes(userId)) {
			setSelectedUsers(selectedUsers.filter((id) => id !== userId));
			if (responsibleUserId === userId) {
				setResponsibleUserId('');
			}
		} else {
			setSelectedUsers([...selectedUsers, userId]);
		}
	};

	const getPlanningCalendarUrl = () => {
		if (!workOrder.planned_start_at) return null;
		const date = new Date(workOrder.planned_start_at);
		return `/dashboard/planning?week=${date.toISOString().split('T')[0]}`;
	};

	const calendarUrl = getPlanningCalendarUrl();

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<CardTitle>Planering & Resurser</CardTitle>
					{canEdit && !isEditing && (
						<Button variant='outline' onClick={() => setIsEditing(true)}>
							Redigera
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				{!isEditing ? (
					<>
						<div>
							<Label>Tilldelade användare</Label>
							<div className='mt-2 space-y-2'>
								{workOrder.assignments && workOrder.assignments.length > 0 ? (
									workOrder.assignments.map((assignment) => (
										<div
											key={assignment.id}
											className='flex items-center justify-between p-2 border rounded'
										>
											<div className='flex items-center gap-2'>
												<Users className='w-4 h-4 text-muted-foreground' />
												<span className='text-sm'>
													{assignment.user?.full_name || assignment.user?.email}
												</span>
												{assignment.is_responsible && (
													<Badge variant='default' className='text-xs'>
														Ansvarig
													</Badge>
												)}
											</div>
											<Badge variant='outline' className='text-xs'>
												{assignment.assignment_status}
											</Badge>
										</div>
									))
								) : (
									<p className='text-sm text-muted-foreground'>
										Inga användare tilldelade
									</p>
								)}
							</div>
						</div>
						{calendarUrl && (
							<div>
								<Button
									variant='outline'
									onClick={() => window.open(calendarUrl, '_blank')}
								>
									<Calendar className='w-4 h-4 mr-2' />
									Visa i planeringskalender
									<ExternalLink className='w-3 h-3 ml-2' />
								</Button>
							</div>
						)}
					</>
				) : (
					<div className='space-y-4'>
						<div>
							<Label>Tilldela användare</Label>
							<div className='mt-2 space-y-2'>
								{users.map((user) => (
									<div
										key={user.id}
										className='flex items-center justify-between p-2 border rounded'
									>
										<label className='flex items-center gap-2 cursor-pointer flex-1'>
											<input
												type='checkbox'
												checked={selectedUsers.includes(user.id)}
												onChange={() => handleUserToggle(user.id)}
												className='rounded'
											/>
											<span className='text-sm'>
												{user.full_name || user.email}
											</span>
										</label>
										{selectedUsers.includes(user.id) && (
											<Select
												value={
													responsibleUserId === user.id ? 'responsible' : 'assigned'
												}
												onValueChange={(value) => {
													if (value === 'responsible') {
														setResponsibleUserId(user.id);
													} else {
														if (responsibleUserId === user.id) {
															setResponsibleUserId('');
														}
													}
												}}
											>
												<SelectTrigger className='w-32'>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='assigned'>Tilldelad</SelectItem>
													<SelectItem value='responsible'>Ansvarig</SelectItem>
												</SelectContent>
											</Select>
										)}
									</div>
								))}
							</div>
						</div>
						<div className='flex gap-2 justify-end'>
							<Button
								variant='outline'
								onClick={() => {
									setIsEditing(false);
									setSelectedUsers(
										workOrder.assignments?.map((a) => a.user_id) || []
									);
									setResponsibleUserId(
										workOrder.assignments?.find((a) => a.is_responsible)?.user_id ||
											''
									);
								}}
							>
								Avbryt
							</Button>
							<Button onClick={handleSaveAssignments} disabled={isSubmitting}>
								{isSubmitting ? 'Sparar...' : 'Spara'}
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

