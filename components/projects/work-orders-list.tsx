'use client';

import { useState } from 'react';
import { Phase, WorkOrder } from '@/lib/schemas/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Plus, MoreVertical } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WorkOrdersListProps {
	projectId: string;
	phases: Phase[];
	workOrders: WorkOrder[];
	canEdit: boolean;
}

export function WorkOrdersList({
	projectId,
	phases,
	workOrders,
	canEdit,
}: WorkOrdersListProps) {
	const [isAdding, setIsAdding] = useState(false);
	const [newWorkOrder, setNewWorkOrder] = useState({
		name: '',
		description: '',
		phase_id: '',
		status: 'pending' as const,
	});

	const handleAdd = async () => {
		if (!newWorkOrder.name.trim()) return;

		// TODO: Add API call to create work order
		console.log('Creating work order:', newWorkOrder);
		setNewWorkOrder({
			name: '',
			description: '',
			phase_id: '',
			status: 'pending',
		});
		setIsAdding(false);
	};

	const handleStatusChange = async (workOrderId: string, status: string) => {
		// TODO: Add API call to update work order status
		console.log('Updating work order status:', workOrderId, status);
	};

	const handleDelete = async (workOrderId: string) => {
		if (!confirm('Är du säker på att du vill radera denna arbetsorder?')) return;

		// TODO: Add API call to delete work order
		console.log('Deleting work order:', workOrderId);
	};

	const getStatusBadge = (status: string) => {
		const variants = {
			pending: 'outline',
			in_progress: 'default',
			completed: 'secondary',
			cancelled: 'destructive',
		} as const;

		const labels = {
			pending: 'Väntande',
			in_progress: 'Pågående',
			completed: 'Klar',
			cancelled: 'Avbruten',
		};

		return (
			<Badge variant={variants[status as keyof typeof variants] || 'outline'}>
				{labels[status as keyof typeof labels] || status}
			</Badge>
		);
	};

	return (
		<div className='space-y-4'>
			<Card>
				<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
					<CardTitle>Arbetsorder</CardTitle>
					{canEdit && !isAdding && (
						<Button size='sm' onClick={() => setIsAdding(true)}>
							<Plus className='w-4 h-4 mr-2' />
							Lägg till arbetsorder
						</Button>
					)}
				</CardHeader>
				<CardContent>
					{isAdding && (
						<Card className='mb-4 border-primary'>
							<CardContent className='pt-6 space-y-4'>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>Namn *</label>
									<Input
										placeholder='Ex: Installera el i källare'
										value={newWorkOrder.name}
										onChange={(e) =>
											setNewWorkOrder({ ...newWorkOrder, name: e.target.value })
										}
									/>
								</div>

								<div className='space-y-2'>
									<label className='text-sm font-medium'>Beskrivning</label>
									<Textarea
										placeholder='Beskriv arbetsuppgiften...'
										value={newWorkOrder.description}
										onChange={(e) =>
											setNewWorkOrder({ ...newWorkOrder, description: e.target.value })
										}
										rows={3}
									/>
								</div>

								<div className='grid gap-4 md:grid-cols-2'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>Fas</label>
										<Select
											value={newWorkOrder.phase_id}
											onValueChange={(value) =>
												setNewWorkOrder({ ...newWorkOrder, phase_id: value })
											}
										>
											<SelectTrigger>
												<SelectValue placeholder='Välj fas (valfritt)' />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='none'>Ingen fas</SelectItem>
												{phases.map((phase) => (
													<SelectItem key={phase.id} value={phase.id}>
														{phase.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className='space-y-2'>
										<label className='text-sm font-medium'>Status</label>
										<Select
											value={newWorkOrder.status}
											onValueChange={(value) =>
												setNewWorkOrder({
													...newWorkOrder,
													status: value as any,
												})
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='pending'>Väntande</SelectItem>
												<SelectItem value='in_progress'>Pågående</SelectItem>
												<SelectItem value='completed'>Klar</SelectItem>
												<SelectItem value='cancelled'>Avbruten</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className='flex gap-2 justify-end'>
									<Button
										variant='outline'
										onClick={() => {
											setIsAdding(false);
											setNewWorkOrder({
												name: '',
												description: '',
												phase_id: '',
												status: 'pending',
											});
										}}
									>
										Avbryt
									</Button>
									<Button onClick={handleAdd}>Skapa arbetsorder</Button>
								</div>
							</CardContent>
						</Card>
					)}

					{workOrders.length === 0 && !isAdding && (
						<p className='text-sm text-muted-foreground text-center py-8'>
							Inga arbetsorder har skapats ännu
						</p>
					)}

					<div className='space-y-3'>
						{workOrders.map((workOrder) => {
							const phase = phases.find((p) => p.id === workOrder.phase_id);
							return (
								<Card key={workOrder.id}>
									<CardContent className='pt-6'>
										<div className='flex items-start justify-between mb-2'>
											<div className='flex-1'>
												<h4 className='font-semibold mb-1'>{workOrder.name}</h4>
												{workOrder.description && (
													<p className='text-sm text-muted-foreground mb-2'>
														{workOrder.description}
													</p>
												)}
												<div className='flex flex-wrap items-center gap-2'>
													{getStatusBadge(workOrder.status)}
													{phase && (
														<Badge variant='outline' className='text-xs'>
															{phase.name}
														</Badge>
													)}
												</div>
											</div>
											{canEdit && (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant='ghost' size='icon'>
															<MoreVertical className='w-4 h-4' />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align='end'>
														<DropdownMenuItem
															onClick={() =>
																handleStatusChange(workOrder.id, 'in_progress')
															}
														>
															Markera som pågående
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() =>
																handleStatusChange(workOrder.id, 'completed')
															}
														>
															Markera som klar
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => handleDelete(workOrder.id)}
															className='text-destructive'
														>
															Radera
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											)}
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

