'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWorkOrderSchema, type CreateWorkOrder, type WorkOrderWithRelations } from '@/lib/schemas/work-order';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { TimePickerInput } from '@/components/ui/time-picker-input';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Discriminated union type for source
type CreateWorkOrderSource =
	| { source: 'project'; projectId: string }
	| {
			source: 'calendar';
			slotStart?: string; // ISO string
			slotEnd?: string; // ISO string
			defaultAssigneeId?: string;
	  };

interface CreateWorkOrderBaseProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: (workOrder: WorkOrderWithRelations) => void;
	users: Array<{ id: string; full_name: string | null; email: string }>; // For assignments
}

type CreateWorkOrderModalProps = CreateWorkOrderBaseProps & CreateWorkOrderSource;

interface Project {
	id: string;
	name: string;
	project_number: string | null;
	customer_id: string | null;
}

interface Customer {
	id: string;
	type: 'COMPANY' | 'PRIVATE';
	company_name: string | null;
	first_name: string | null;
	last_name: string | null;
}

export function CreateWorkOrderModal(props: CreateWorkOrderModalProps) {
	const { source, open, onOpenChange, onSuccess, users } = props;
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoadingData, setIsLoadingData] = useState(false);
	const [showConfirmClose, setShowConfirmClose] = useState(false);
	const [pendingClose, setPendingClose] = useState(false);

	// Data fetching states
	const [projects, setProjects] = useState<Project[]>([]);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);
	const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

	// Form state
	const [plannedDate, setPlannedDate] = useState<string>('');
	const [plannedStartTime, setPlannedStartTime] = useState<string>('');
	const [plannedEndTime, setPlannedEndTime] = useState<string>('');
	const [allDay, setAllDay] = useState(false);
	const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		reset,
	} = useForm<CreateWorkOrder>({
		resolver: zodResolver(createWorkOrderSchema),
		defaultValues: {
			status: 'PLANERAD',
			priority: 'NORMAL',
			all_day: false,
			work_order_type: 'PROJEKTBUNDEN',
		},
	});

	const watchedProjectId = watch('project_id');
	const watchedCustomerId = watch('customer_id');

	// Fetch projects
	useEffect(() => {
		if (!open) return;

		const fetchProjects = async () => {
			setIsLoadingData(true);
			try {
				const response = await fetch('/api/projects');
				if (!response.ok) {
					let errorMessage = 'Kunde inte hämta projekt';
					try {
						const errorData = await response.json();
						errorMessage = errorData.error || errorMessage;
					} catch {
						const errorText = await response.text();
						console.error('Error fetching projects:', errorText);
					}
					throw new Error(errorMessage);
				}
				const data = await response.json();
				if (!data || !data.projects) {
					console.error('Invalid response format:', data);
					throw new Error('Ogiltigt svar från servern');
				}
				setProjects(data.projects || []);

				// If source is 'project', set the project
				if (source.source === 'project') {
					const project = data.projects?.find((p: Project) => p.id === source.projectId);
					if (project) {
						setSelectedProject(project);
						setValue('project_id', project.id);
						if (project.customer_id) {
							setValue('customer_id', project.customer_id);
							setSelectedCustomerId(project.customer_id);
						}
					}
				}
			} catch (err) {
				console.error('Error fetching projects:', err);
				const error = err as Error;
				setError(error.message || 'Kunde inte hämta projekt');
			} finally {
				setIsLoadingData(false);
			}
		};

		fetchProjects();
	}, [open, source, setValue]);

	// Fetch customers
	useEffect(() => {
		if (!open || source.source === 'project') return;

		const fetchCustomers = async () => {
			try {
				const response = await fetch('/api/customers');
				if (!response.ok) {
					const errorText = await response.text();
					console.error('Error fetching customers:', errorText);
					throw new Error('Kunde inte hämta kunder');
				}
				const data = await response.json();
				setCustomers(data.customers || []);
			} catch (err) {
				console.error('Error fetching customers:', err);
			}
		};

		fetchCustomers();
	}, [open, source]);

	// Set default date/time from calendar source
	useEffect(() => {
		if (source.source === 'calendar' && source.slotStart) {
			const startDate = new Date(source.slotStart);
			const dateStr = startDate.toISOString().split('T')[0];
			setPlannedDate(dateStr);
			if (!source.slotStart.includes('T00:00:00')) {
				const timeStr = startDate.toTimeString().slice(0, 5);
				setPlannedStartTime(timeStr);
			}
			if (source.slotEnd) {
				const endDate = new Date(source.slotEnd);
				if (!source.slotEnd.includes('T23:59:59')) {
					const timeStr = endDate.toTimeString().slice(0, 5);
					setPlannedEndTime(timeStr);
				}
			}
		}
	}, [source]);

	// Handle project selection
	const handleProjectChange = (projectId: string) => {
		const project = projects.find((p) => p.id === projectId);
		setSelectedProject(project || null);
		setValue('project_id', projectId);
		if (project?.customer_id) {
			setValue('customer_id', project.customer_id);
			setSelectedCustomerId(project.customer_id);
		} else {
			setValue('customer_id', null);
			setSelectedCustomerId('__no_customer__');
		}
	};

	// Handle service project creation
	const handleCreateServiceProject = async (customerId: string, customerName: string) => {
		if (!customerId || customerId === '__create_service_project__' || customerId === '__no_customer__') {
			throw new Error('Ogiltigt kund-ID');
		}

		const projectName = `Service - ${customerName}`;
		try {
			const response = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: projectName,
					customer_id: customerId,
					status: 'active',
					project_hourly_rate_sek: null,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				const errorMessage = errorData.details
					? `${errorData.error || 'Kunde inte skapa serviceprojekt'}: ${JSON.stringify(errorData.details)}`
					: errorData.error || 'Kunde inte skapa serviceprojekt';
				throw new Error(errorMessage);
			}

			const data = await response.json();
			const newProject = data.project;

			// Add to projects list
			setProjects((prev) => [newProject, ...prev]);
			setSelectedProject(newProject);
			setValue('project_id', newProject.id);
			setValue('customer_id', customerId);
			setSelectedCustomerId(customerId);

			toast.success('Serviceprojekt skapat');
		} catch (err) {
			console.error('Error creating service project:', err);
			const error = err as Error;
			toast.error(error.message || 'Kunde inte skapa serviceprojekt');
			throw err;
		}
	};

	// Handle form submission
	const onSubmit = async (data: CreateWorkOrder) => {
		setIsSubmitting(true);
		setError(null);

		try {
			if (!data.project_id) {
				setError('Projekt är obligatoriskt');
				setIsSubmitting(false);
				return;
			}

			if (!plannedDate) {
				setError('Datum är obligatoriskt');
				setIsSubmitting(false);
				return;
			}

			// Combine date and time for planned_start_at and planned_end_at
			const submitData: any = { ...data };

			if (plannedDate) {
				if (allDay) {
					submitData.planned_start_at = `${plannedDate}T00:00:00`;
					submitData.planned_end_at = `${plannedDate}T23:59:59`;
				} else {
					if (plannedStartTime) {
						submitData.planned_start_at = `${plannedDate}T${plannedStartTime}:00`;
					} else {
						submitData.planned_start_at = `${plannedDate}T08:00:00`;
					}
					if (plannedEndTime) {
						submitData.planned_end_at = `${plannedDate}T${plannedEndTime}:00`;
					} else {
						submitData.planned_end_at = `${plannedDate}T17:00:00`;
					}
				}
			}

			// Add assignments if any
			if (selectedAssignments.length > 0) {
				submitData.assignments = selectedAssignments.map((userId) => ({
					user_id: userId,
					role: null,
					is_responsible: true,
					assignment_status: 'TILLDELAD' as const,
				}));
			}

			const response = await fetch('/api/work-orders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(submitData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				const errorMessage = errorData.details
					? `${errorData.error || 'Kunde inte skapa arbetsorder'}: ${JSON.stringify(errorData.details)}`
					: errorData.error || 'Kunde inte skapa arbetsorder';
				throw new Error(errorMessage);
			}

			const result = await response.json();
			toast.success('Arbetsorder skapad');
			onSuccess(result.work_order);
			handleClose();
		} catch (err) {
			console.error('Error creating work order:', err);
			const error = err as Error;
			setError(error.message || 'Kunde inte skapa arbetsorder');
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle close with unsaved changes check
	const handleClose = useCallback(() => {
		const hasChanges = plannedDate || plannedStartTime || plannedEndTime || watchedProjectId || watch('title');
		if (hasChanges && !isSubmitting) {
			setPendingClose(true);
			setShowConfirmClose(true);
		} else {
			reset();
			setPlannedDate('');
			setPlannedStartTime('');
			setPlannedEndTime('');
			setAllDay(false);
			setSelectedAssignments([]);
			setSelectedProject(null);
			setSelectedCustomerId('');
			setError(null);
			onOpenChange(false);
		}
	}, [plannedDate, plannedStartTime, plannedEndTime, watchedProjectId, watch, isSubmitting, reset, onOpenChange]);

	const handleConfirmClose = () => {
		reset();
		setPlannedDate('');
		setPlannedStartTime('');
		setPlannedEndTime('');
		setAllDay(false);
		setSelectedAssignments([]);
		setSelectedProject(null);
		setSelectedCustomerId('');
		setError(null);
		setShowConfirmClose(false);
		setPendingClose(false);
		onOpenChange(false);
	};

	const handleCancelClose = () => {
		setShowConfirmClose(false);
		setPendingClose(false);
	};

	return (
		<>
			<Dialog open={open} onOpenChange={handleClose}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto">
					<DialogHeader>
						<DialogTitle>Skapa ny arbetsorder</DialogTitle>
					</DialogHeader>

					{isLoadingData ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					) : (
						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
							{error && (
								<div className="rounded-lg bg-destructive/10 border border-destructive p-3 text-sm text-destructive">
									{error}
								</div>
							)}

							{/* Project selection - read-only for 'project' source, dropdown for 'calendar' */}
							{source.source === 'project' ? (
								<div className="space-y-2">
									<Label>Projekt</Label>
									<Input
										value={selectedProject?.name || ''}
										disabled
										className="bg-muted"
									/>
								</div>
							) : (
								<div className="space-y-2">
									<Label htmlFor="project_id">
										Projekt <span className="text-destructive">*</span>
									</Label>
									<Select
										value={watchedProjectId || ''}
										onValueChange={(value) => {
											if (value === '__create_service_project__') {
												if (!selectedCustomerId || selectedCustomerId === '__no_customer__') {
													toast.error('Välj kund först');
													return;
												}
												const customer = customers.find((c) => c.id === selectedCustomerId);
												if (customer) {
													const customerName = customer.type === 'COMPANY'
														? customer.company_name || 'Okänt företag'
														: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Okänd person';
													handleCreateServiceProject(selectedCustomerId, customerName);
												}
											} else {
												handleProjectChange(value);
											}
										}}
									>
										<SelectTrigger id="project_id">
											<SelectValue placeholder="Välj projekt" />
										</SelectTrigger>
										<SelectContent>
											{projects.map((project) => (
												<SelectItem key={project.id} value={project.id}>
													{project.project_number ? `${project.project_number} - ` : ''}{project.name}
												</SelectItem>
											))}
											{selectedCustomerId && selectedCustomerId !== '__no_customer__' && (
												<SelectItem value="__create_service_project__">
													+ Skapa serviceprojekt
												</SelectItem>
											)}
										</SelectContent>
									</Select>
									{errors.project_id && (
										<p className="text-sm text-destructive">{errors.project_id.message}</p>
									)}
								</div>
							)}

							{/* Customer selection - only for 'calendar' source */}
							{source.source === 'calendar' && (
								<div className="space-y-2">
									<Label htmlFor="customer_id">Kund</Label>
									<Select
										value={selectedCustomerId || '__no_customer__'}
										onValueChange={(value) => {
											setSelectedCustomerId(value);
											setValue('customer_id', value === '__no_customer__' ? null : value);
										}}
									>
										<SelectTrigger id="customer_id">
											<SelectValue placeholder="Välj kund" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="__no_customer__">Ingen kund</SelectItem>
											{customers.map((customer) => {
												const name = customer.type === 'COMPANY'
													? customer.company_name || 'Okänt företag'
													: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Okänd person';
												return (
													<SelectItem key={customer.id} value={customer.id}>
														{name}
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
								</div>
							)}

							{/* Title */}
							<div className="space-y-2">
								<Label htmlFor="title">
									Titel <span className="text-destructive">*</span>
								</Label>
								<Input
									id="title"
									{...register('title')}
									placeholder="Ex: Servicebesök"
								/>
								{errors.title && (
									<p className="text-sm text-destructive">{errors.title.message}</p>
								)}
							</div>

							{/* Description */}
							<div className="space-y-2">
								<Label htmlFor="description">Beskrivning</Label>
								<Textarea
									id="description"
									{...register('description')}
									placeholder="Beskriv arbetsordern..."
									rows={3}
								/>
							</div>

							{/* Date and Time */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<DatePickerInput
									id="planned_date"
									label="Datum"
									value={plannedDate}
									onChange={setPlannedDate}
									required
								/>

								<div className="space-y-2">
									<Label>Heldag</Label>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="all_day"
											checked={allDay}
											onCheckedChange={(checked) => {
												setAllDay(checked === true);
												setValue('all_day', checked === true);
											}}
										/>
										<Label htmlFor="all_day" className="font-normal cursor-pointer">
											Heldag
										</Label>
									</div>
								</div>
							</div>

							{!allDay && (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<TimePickerInput
										id="planned_start_time"
										label="Starttid"
										value={plannedStartTime}
										onChange={setPlannedStartTime}
									/>

									<TimePickerInput
										id="planned_end_time"
										label="Sluttid"
										value={plannedEndTime}
										onChange={setPlannedEndTime}
									/>
								</div>
							)}

							{/* Status and Priority */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="status">Status</Label>
									<Select
										value={watch('status')}
										onValueChange={(value) => setValue('status', value as any)}
									>
										<SelectTrigger id="status">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="PLANERAD">Planerad</SelectItem>
											<SelectItem value="PÅGÅENDE">Pågående</SelectItem>
											<SelectItem value="KLAR">Klar</SelectItem>
											<SelectItem value="FAKTURERAD">Fakturerad</SelectItem>
											<SelectItem value="AVBOKAD">Avbokad</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="priority">Prioritet</Label>
									<Select
										value={watch('priority')}
										onValueChange={(value) => setValue('priority', value as any)}
									>
										<SelectTrigger id="priority">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="LOW">Låg</SelectItem>
											<SelectItem value="NORMAL">Normal</SelectItem>
											<SelectItem value="HIGH">Hög</SelectItem>
											<SelectItem value="AKUT">Akut</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							{/* Work Order Type */}
							<div className="space-y-2">
								<Label htmlFor="work_order_type">Typ</Label>
								<Select
									value={watch('work_order_type')}
									onValueChange={(value) => setValue('work_order_type', value as any)}
								>
									<SelectTrigger id="work_order_type">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="PROJEKTBUNDEN">Projektbunden</SelectItem>
										<SelectItem value="FRISTÅENDE">Fristående</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Assignments */}
							<div className="space-y-2">
								<Label>Tilldelningar</Label>
								<div className="space-y-2">
									{users.map((user) => (
										<div key={user.id} className="flex items-center space-x-2">
											<Checkbox
												id={`assign-${user.id}`}
												checked={selectedAssignments.includes(user.id)}
												onCheckedChange={(checked) => {
													if (checked) {
														setSelectedAssignments([...selectedAssignments, user.id]);
													} else {
														setSelectedAssignments(selectedAssignments.filter((id) => id !== user.id));
													}
												}}
											/>
											<Label htmlFor={`assign-${user.id}`} className="font-normal cursor-pointer">
												{user.full_name || user.email}
											</Label>
										</div>
									))}
								</div>
							</div>

							<DialogFooter>
								<Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
									Avbryt
								</Button>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Skapar...
										</>
									) : (
										'Skapa arbetsorder'
									)}
								</Button>
							</DialogFooter>
						</form>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Osparad data</AlertDialogTitle>
						<AlertDialogDescription>
							Du har osparad data i formuläret. Är du säker på att du vill stänga? All data kommer att gå förlorad.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancelClose}>Avbryt</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmClose}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Stäng ändå
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
