'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	CheckCircle2,
	Clock,
	XCircle,
	FileText,
	Calendar,
	User,
	MapPin,
	Edit,
	Trash2,
	Save,
	X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { WorkOrderWithRelations } from '@/lib/schemas/work-order';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkOrderTimeTab } from './work-order-time-tab';
import { WorkOrderCompletionTab } from './work-order-completion-tab';
import { WorkOrderDiaryTab } from './work-order-diary-tab';
import { getWorkOrderMapUrl } from '@/lib/work-orders/map';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { TimePickerInput } from '@/components/ui/time-picker-input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AddressAutocomplete } from '@/components/address/address-autocomplete';

interface WorkOrderDetailClientProps {
	workOrderId: string;
	canEdit: boolean;
	canDelete: boolean;
}

const statusConfig = {
	PLANERAD: {
		icon: Clock,
		label: 'Planerad',
		color: 'bg-blue-100 text-blue-700 border-blue-200',
	},
	PÅGÅENDE: {
		icon: Clock,
		label: 'Pågående',
		color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
	},
	KLAR: {
		icon: CheckCircle2,
		label: 'Klar',
		color: 'bg-green-100 text-green-700 border-green-200',
	},
	FAKTURERAD: {
		icon: CheckCircle2,
		label: 'Fakturerad',
		color: 'bg-gray-100 text-gray-700 border-gray-200',
	},
	AVBOKAD: {
		icon: XCircle,
		label: 'Avbokad',
		color: 'bg-red-100 text-red-700 border-red-200',
	},
};

const priorityConfig = {
	LOW: { label: 'Låg', color: 'outline' },
	NORMAL: { label: 'Normal', color: 'default' },
	HIGH: { label: 'Hög', color: 'bg-orange-100 text-orange-700' },
	AKUT: { label: 'Akut', color: 'bg-red-100 text-red-700' },
};

export function WorkOrderDetailClient({
	workOrderId,
	canEdit,
	canDelete,
}: WorkOrderDetailClientProps) {
	const queryClient = useQueryClient();
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const { data: workOrder, isLoading } = useQuery({
		queryKey: ['work-order', workOrderId],
		queryFn: async () => {
			const response = await fetch(`/api/work-orders/${workOrderId}`);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte hämta arbetsorder');
			}
			const data = await response.json();
			return data.workOrder as WorkOrderWithRelations;
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: Partial<WorkOrderWithRelations>) => {
			const response = await fetch(`/api/work-orders/${workOrderId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte uppdatera arbetsorder');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
			queryClient.invalidateQueries({ queryKey: ['work-orders'] });
			setIsEditing(false);
			toast.success('Arbetsorder uppdaterad');
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch(`/api/work-orders/${workOrderId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte ta bort arbetsorder');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['work-orders'] });
			toast.success('Arbetsorder borttagen');
			window.location.href = '/dashboard/work-orders';
		},
		onError: (error: Error) => {
			toast.error(error.message);
			setIsDeleting(false);
		},
	});

	const [formData, setFormData] = useState<Partial<WorkOrderWithRelations>>({});

	// Initialize form data when work order loads
	useEffect(() => {
		if (workOrder) {
			setFormData(workOrder);
		}
	}, [workOrder]);

	const handleEdit = () => {
		setFormData(workOrder || {});
		setIsEditing(true);
	};

	const handleCancel = () => {
		setFormData(workOrder || {});
		setIsEditing(false);
	};

	const handleSave = () => {
		updateMutation.mutate(formData);
	};

	const handleDelete = () => {
		if (!confirm('Är du säker på att du vill ta bort denna arbetsorder?')) {
			return;
		}
		setIsDeleting(true);
		deleteMutation.mutate();
	};

	const formatDateTime = (dateString: string | null | undefined) => {
		if (!dateString) return '-';
		try {
			return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: sv });
		} catch {
			return '-';
		}
	};

	const formatDate = (dateString: string | null | undefined) => {
		if (!dateString) return '-';
		try {
			return format(new Date(dateString), 'yyyy-MM-dd', { locale: sv });
		} catch {
			return '-';
		}
	};

	const getCustomerName = (customer: WorkOrderWithRelations['customer']) => {
		if (!customer) return '-';
		if (customer.type === 'COMPANY') {
			return customer.company_name || '-';
		}
		return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '-';
	};

	if (isLoading) {
		return (
			<div className='flex items-center justify-center py-12'>
				<div className='text-muted-foreground'>Laddar arbetsorder...</div>
			</div>
		);
	}

	if (!workOrder) {
		return (
			<Card>
				<CardContent className='py-12 text-center'>
					<p className='text-muted-foreground'>Arbetsorder hittades inte</p>
				</CardContent>
			</Card>
		);
	}

	const statusInfo = statusConfig[workOrder.status as keyof typeof statusConfig] || statusConfig.PLANERAD;
	const priorityInfo = priorityConfig[workOrder.priority as keyof typeof priorityConfig] || priorityConfig.NORMAL;

	return (
		<div className='space-y-6'>
			{/* Header Actions */}
			<div className='flex items-center justify-between'>
				<div>
					<div className='flex items-center gap-3'>
						<Badge className={statusInfo.color}>{statusInfo.label}</Badge>
						<Badge variant={priorityInfo.color as any} className={priorityInfo.color}>
							{priorityInfo.label}
						</Badge>
					</div>
					<h2 className='text-2xl font-bold mt-2'>{workOrder.title}</h2>
					<p className='text-muted-foreground mt-1'>
						{workOrder.work_order_number}
					</p>
				</div>
				{canEdit && !isEditing && (
					<div className='flex gap-2'>
						<Button variant='outline' onClick={handleEdit}>
							<Edit className='w-4 h-4 mr-2' />
							Redigera
						</Button>
						{canDelete && (
							<Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
								<Trash2 className='w-4 h-4 mr-2' />
								Ta bort
							</Button>
						)}
					</div>
				)}
				{isEditing && (
					<div className='flex gap-2'>
						<Button variant='outline' onClick={handleCancel} disabled={updateMutation.isPending}>
							<X className='w-4 h-4 mr-2' />
							Avbryt
						</Button>
						<Button onClick={handleSave} disabled={updateMutation.isPending}>
							<Save className='w-4 h-4 mr-2' />
							Spara
						</Button>
					</div>
				)}
			</div>

			{/* Main Content */}
			<Tabs defaultValue='overview' className='w-full'>
				<TabsList>
					<TabsTrigger value='overview'>Översikt</TabsTrigger>
					<TabsTrigger value='time'>Tid</TabsTrigger>
					<TabsTrigger value='diary'>Dagbok</TabsTrigger>
					<TabsTrigger value='completion'>Genomförande</TabsTrigger>
				</TabsList>

				<TabsContent value='overview' className='space-y-4'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{/* Basic Info */}
						<Card>
							<CardHeader>
								<CardTitle>Grundinformation</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								{isEditing ? (
									<>
										<div className='space-y-2'>
											<Label htmlFor='title'>Titel</Label>
											<Input
												id='title'
												value={formData.title || ''}
												onChange={(e) => setFormData({ ...formData, title: e.target.value })}
											/>
										</div>
										<div className='space-y-2'>
											<Label htmlFor='description'>Beskrivning</Label>
											<Textarea
												id='description'
												value={formData.description || ''}
												onChange={(e) => setFormData({ ...formData, description: e.target.value })}
												rows={4}
											/>
										</div>
										<div className='space-y-2'>
											<Label htmlFor='status'>Status</Label>
											<Select
												value={formData.status || 'PLANERAD'}
												onValueChange={(value) => setFormData({ ...formData, status: value as any })}
											>
												<SelectTrigger id='status'>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='PLANERAD'>Planerad</SelectItem>
													<SelectItem value='PÅGÅENDE'>Pågående</SelectItem>
													<SelectItem value='KLAR'>Klar</SelectItem>
													<SelectItem value='FAKTURERAD'>Fakturerad</SelectItem>
													<SelectItem value='AVBOKAD'>Avbokad</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div className='space-y-2'>
											<Label htmlFor='priority'>Prioritet</Label>
											<Select
												value={formData.priority || 'NORMAL'}
												onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
											>
												<SelectTrigger id='priority'>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value='LOW'>Låg</SelectItem>
													<SelectItem value='NORMAL'>Normal</SelectItem>
													<SelectItem value='HIGH'>Hög</SelectItem>
													<SelectItem value='AKUT'>Akut</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</>
								) : (
									<>
										<div>
											<Label className='text-muted-foreground'>Beskrivning</Label>
											<p className='mt-1'>{workOrder.description || '-'}</p>
										</div>
									</>
								)}
							</CardContent>
						</Card>

						{/* Project & Customer */}
						<Card>
							<CardHeader>
								<CardTitle>Projekt & Kund</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div>
									<Label className='text-muted-foreground'>Projekt</Label>
									<p className='mt-1 font-medium'>
										{workOrder.project?.name || '-'}
										{workOrder.project?.project_number && (
											<span className='text-muted-foreground ml-2'>
												({workOrder.project.project_number})
											</span>
										)}
									</p>
								</div>
								<div>
									<Label className='text-muted-foreground'>Kund</Label>
									<p className='mt-1'>{getCustomerName(workOrder.customer)}</p>
								</div>
							</CardContent>
						</Card>

						{/* Planning */}
						<Card>
							<CardHeader>
								<CardTitle>Planering</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								{isEditing ? (
									<>
										<div className="space-y-2">
											<Label>Planerat start</Label>
											<div className="grid grid-cols-2 gap-4">
												<DatePickerInput
													id="planned_start_date"
													label="Datum"
													value={formData.planned_start_at ? new Date(formData.planned_start_at).toISOString().split('T')[0] : ''}
													onChange={(date) => {
														const currentTime = formData.planned_start_at 
															? new Date(formData.planned_start_at).toTimeString().slice(0, 5)
															: '07:00';
														setFormData({
															...formData,
															planned_start_at: `${date}T${currentTime}:00`,
														});
													}}
												/>
												<TimePickerInput
													id="planned_start_time"
													label="Tid"
													value={formData.planned_start_at 
														? new Date(formData.planned_start_at).toTimeString().slice(0, 5)
														: '07:00'}
													onChange={(time) => {
														const currentDate = formData.planned_start_at 
															? new Date(formData.planned_start_at).toISOString().split('T')[0]
															: new Date().toISOString().split('T')[0];
														setFormData({
															...formData,
															planned_start_at: `${currentDate}T${time}:00`,
														});
													}}
												/>
											</div>
										</div>
										<div className="space-y-2">
											<Label>Planerat slut</Label>
											<div className="grid grid-cols-2 gap-4">
												<DatePickerInput
													id="planned_end_date"
													label="Datum"
													value={formData.planned_end_at ? new Date(formData.planned_end_at).toISOString().split('T')[0] : ''}
													onChange={(date) => {
														const currentTime = formData.planned_end_at 
															? new Date(formData.planned_end_at).toTimeString().slice(0, 5)
															: '16:00';
														setFormData({
															...formData,
															planned_end_at: `${date}T${currentTime}:00`,
														});
													}}
												/>
												<TimePickerInput
													id="planned_end_time"
													label="Tid"
													value={formData.planned_end_at 
														? new Date(formData.planned_end_at).toTimeString().slice(0, 5)
														: '16:00'}
													onChange={(time) => {
														const currentDate = formData.planned_end_at 
															? new Date(formData.planned_end_at).toISOString().split('T')[0]
															: new Date().toISOString().split('T')[0];
														setFormData({
															...formData,
															planned_end_at: `${currentDate}T${time}:00`,
														});
													}}
												/>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<Checkbox
												id="all_day"
												checked={formData.all_day || false}
												onCheckedChange={(checked) => {
													setFormData({ ...formData, all_day: checked === true });
												}}
											/>
											<Label htmlFor="all_day" className="cursor-pointer">
												Heldag
											</Label>
										</div>
									</>
								) : (
									<>
										<div>
											<Label className='text-muted-foreground flex items-center gap-2'>
												<Calendar className='w-4 h-4' />
												Planerat start
											</Label>
											<p className='mt-1'>{formatDateTime(workOrder.planned_start_at)}</p>
										</div>
										<div>
											<Label className='text-muted-foreground flex items-center gap-2'>
												<Calendar className='w-4 h-4' />
												Planerat slut
											</Label>
											<p className='mt-1'>{formatDateTime(workOrder.planned_end_at)}</p>
										</div>
										{workOrder.all_day && (
											<div>
												<Label className='text-muted-foreground'>Heldag</Label>
												<p className='mt-1'>Ja</p>
											</div>
										)}
										{workOrder.actual_start_at && (
											<div>
												<Label className='text-muted-foreground'>Faktiskt start</Label>
												<p className='mt-1'>{formatDateTime(workOrder.actual_start_at)}</p>
											</div>
										)}
										{workOrder.actual_end_at && (
											<div>
												<Label className='text-muted-foreground'>Faktiskt slut</Label>
												<p className='mt-1'>{formatDateTime(workOrder.actual_end_at)}</p>
											</div>
										)}
									</>
								)}
							</CardContent>
						</Card>

						{/* Location */}
						<Card>
							<CardHeader>
								<CardTitle>Plats</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								{isEditing ? (
									<>
										<div className="space-y-2">
											<Label htmlFor="location_address">Adress</Label>
											<AddressAutocomplete
												id="location_address"
												name="location_address"
												autoComplete="street-address"
												value={
													formData.location_address ||
													(formData.location_city && formData.location_zip
														? `${formData.location_address || ''}, ${formData.location_zip} ${formData.location_city}`.trim()
														: '')
												}
												onChange={(val) => {
													setFormData({ ...formData, location_address: val || null });
												}}
												onSelect={(addr) => {
													const formatted = `${addr.address_line1}, ${addr.postal_code} ${addr.city}`.trim();
													setFormData({
														...formData,
														location_address: formatted,
														location_city: addr.city || null,
														location_zip: addr.postal_code || null,
														location_lat: addr.lat || null,
														location_lng: addr.lon || null,
													});
												}}
												placeholder="Ex: Observatoriegatan 13, 113 29 Stockholm"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="door_code">Portkod</Label>
											<Input
												id="door_code"
												value={formData.door_code || ''}
												onChange={(e) => setFormData({ ...formData, door_code: e.target.value })}
												placeholder="Portkod"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="location_notes">Platsanteckningar</Label>
											<Textarea
												id="location_notes"
												value={formData.location_notes || ''}
												onChange={(e) => setFormData({ ...formData, location_notes: e.target.value })}
												placeholder="Ytterligare information om platsen"
												rows={3}
											/>
										</div>
									</>
								) : (
									<>
										{workOrder.location_address && (
											<div className='space-y-2'>
												<div>
													<Label className='text-muted-foreground flex items-center gap-2'>
														<MapPin className='w-4 h-4' />
														Adress
													</Label>
													<p className='mt-1'>{workOrder.location_address}</p>
												</div>
												{(() => {
													const mapUrl = getWorkOrderMapUrl({
														location_address: workOrder.location_address,
														location_city: workOrder.location_city,
														location_zip: workOrder.location_zip,
														location_lat: workOrder.location_lat,
														location_lng: workOrder.location_lng,
													});
													return mapUrl ? (
														<div className='mt-2 rounded-lg overflow-hidden border border-border/50'>
															<img
																src={mapUrl}
																alt='Karta över arbetsplatsen'
																className='w-full h-auto'
																loading='lazy'
																onError={(e) => {
																	console.error('[WorkOrderMap] Failed to load map image:', mapUrl);
																	// Hide image if it fails to load
																	const img = e.target as HTMLImageElement;
																	img.style.display = 'none';
																	// Optionally show error message
																	const container = img.parentElement;
																	if (container) {
																		container.innerHTML = '<p class="text-sm text-muted-foreground p-4 text-center">Kartan kunde inte laddas</p>';
																	}
																}}
															/>
														</div>
													) : null;
												})()}
											</div>
										)}
										{workOrder.door_code && (
											<div>
												<Label className='text-muted-foreground'>Portkod</Label>
												<p className='mt-1'>{workOrder.door_code}</p>
											</div>
										)}
										{workOrder.location_notes && (
											<div>
												<Label className='text-muted-foreground'>Platsanteckningar</Label>
												<p className='mt-1'>{workOrder.location_notes}</p>
											</div>
										)}
									</>
								)}
							</CardContent>
						</Card>

						{/* Assignments */}
						<Card>
							<CardHeader>
								<CardTitle>Tilldelningar</CardTitle>
							</CardHeader>
							<CardContent>
								{workOrder.assignments && workOrder.assignments.length > 0 ? (
									<div className='space-y-2'>
										{workOrder.assignments.map((assignment) => (
											<div key={assignment.id} className='flex items-center justify-between'>
												<div className='flex items-center gap-2'>
													<User className='w-4 h-4 text-muted-foreground' />
													<span>{assignment.user?.full_name || assignment.user?.email || '-'}</span>
													{assignment.is_responsible && (
														<Badge variant='outline' className='text-xs'>
															Ansvarig
														</Badge>
													)}
												</div>
												<Badge variant='outline' className='text-xs'>
													{assignment.assignment_status === 'TILLDELAD' ? 'Tilldelad' : 'Klarmarkerad'}
												</Badge>
											</div>
										))}
									</div>
								) : (
									<p className='text-muted-foreground'>Inga tilldelningar</p>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Notes */}
					<Card>
						<CardHeader>
							<CardTitle>Anteckningar</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							{isEditing ? (
								<>
									<div className="space-y-2">
										<Label htmlFor="internal_notes">Interna anteckningar</Label>
										<Textarea
											id="internal_notes"
											value={formData.internal_notes || ''}
											onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
											placeholder="Interna anteckningar (syns inte för kunden)"
											rows={4}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="external_summary">Extern sammanfattning (för fakturering)</Label>
										<Textarea
											id="external_summary"
											value={formData.external_summary || ''}
											onChange={(e) => setFormData({ ...formData, external_summary: e.target.value })}
											placeholder="Beskrivning för fakturering"
											rows={4}
										/>
									</div>
								</>
							) : (
								<>
									{workOrder.internal_notes && (
										<div>
											<Label className='text-muted-foreground'>Interna anteckningar</Label>
											<p className='mt-1 whitespace-pre-wrap'>{workOrder.internal_notes}</p>
										</div>
									)}
									{workOrder.external_summary && (
										<div>
											<Label className='text-muted-foreground'>Extern sammanfattning (för fakturering)</Label>
											<p className='mt-1 whitespace-pre-wrap'>{workOrder.external_summary}</p>
										</div>
									)}
									{!workOrder.internal_notes && !workOrder.external_summary && (
										<p className='text-muted-foreground'>Inga anteckningar</p>
									)}
								</>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value='time'>
					{workOrder && (
						<WorkOrderTimeTab
							workOrderId={workOrder.id}
							projectId={workOrder.project_id}
							orgId={workOrder.organization_id}
							plannedStartAt={workOrder.planned_start_at}
							plannedEndAt={workOrder.planned_end_at}
						/>
					)}
				</TabsContent>

				<TabsContent value='diary'>
					{workOrder && (
						<WorkOrderDiaryTab
							workOrderId={workOrder.id}
							projectId={workOrder.project_id}
							orgId={workOrder.organization_id}
						/>
					)}
				</TabsContent>

				<TabsContent value='completion'>
					{workOrder && <WorkOrderCompletionTab workOrder={workOrder} canEdit={canEdit} />}
				</TabsContent>
			</Tabs>
		</div>
	);
}

