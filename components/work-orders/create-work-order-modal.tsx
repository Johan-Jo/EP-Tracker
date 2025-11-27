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
import { Loader2, Plus, Mic, MicOff } from 'lucide-react';

import { toast } from 'sonner';

// Speech Recognition types
declare global {
	interface Window {
		SpeechRecognition: new () => SpeechRecognition;
		webkitSpeechRecognition: new () => SpeechRecognition;
	}
}

interface SpeechRecognition extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	start(): void;
	stop(): void;
	abort(): void;
	onresult: (event: SpeechRecognitionEvent) => void;
	onerror: (event: SpeechRecognitionErrorEvent) => void;
	onend: () => void;
}

interface SpeechRecognitionEvent {
	resultIndex: number;
	results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
	length: number;
	item(index: number): SpeechRecognitionResult;
	[index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
	length: number;
	item(index: number): SpeechRecognitionAlternative;
	[index: number]: SpeechRecognitionAlternative;
	isFinal: boolean;
}

interface SpeechRecognitionAlternative {
	transcript: string;
	confidence: number;
}

interface SpeechRecognitionErrorEvent {
	error: string;
	message: string;
}
import { CustomerForm } from '@/components/customers/customer-form';
import { useCreateCustomer } from '@/lib/hooks/use-customers';
import type { CustomerPayload } from '@/lib/schemas/customer';
import { ProjectForm } from '@/components/projects/project-form';
import { createProject } from '@/app/actions/create-project';
import { AddressAutocomplete } from '@/components/address/address-autocomplete';

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
	orgId: string; // Organization ID for creating projects
}

type CreateWorkOrderModalProps = CreateWorkOrderBaseProps & CreateWorkOrderSource;

interface Project {
	id: string;
	name: string;
	project_number: string | null;
	customer_id: string | null;
	site_address?: string | null;
}

interface Customer {
	id: string;
	type: 'COMPANY' | 'PRIVATE';
	company_name: string | null;
	first_name: string | null;
	last_name: string | null;
}

export function CreateWorkOrderModal(props: CreateWorkOrderModalProps) {
	const { source, open, onOpenChange, onSuccess, users, orgId } = props;
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoadingData, setIsLoadingData] = useState(false);
	const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
	const [showConfirmClose, setShowConfirmClose] = useState(false);
	const [pendingClose, setPendingClose] = useState(false);
	const [justSaved, setJustSaved] = useState(false);

	// Data fetching states
	const [projects, setProjects] = useState<Project[]>([]);
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);
	const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
	const [showCreateCustomer, setShowCreateCustomer] = useState(false);
	const [showCreateProject, setShowCreateProject] = useState(false);
	const [isLoadingProjects, setIsLoadingProjects] = useState(false);
	const [isCreatingProject, setIsCreatingProject] = useState(false);
	const createCustomerMutation = useCreateCustomer();

	// Form state
	const [plannedDate, setPlannedDate] = useState<string>('');
	const [plannedStartTime, setPlannedStartTime] = useState<string>('');
	const [plannedEndTime, setPlannedEndTime] = useState<string>('');
	const [allDay, setAllDay] = useState(false);
	const [sendTimeApprovalEmail, setSendTimeApprovalEmail] = useState(true);
	const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
	const [isListening, setIsListening] = useState(false);
	const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
	const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false);
	const [useProjectAddress, setUseProjectAddress] = useState(true);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		reset,
		clearErrors,
	} = useForm<CreateWorkOrder>({
		resolver: zodResolver(createWorkOrderSchema),
		defaultValues: {
			status: 'PLANERAD',
			priority: 'NORMAL',
			all_day: false,
			work_order_type: 'PROJEKTBUNDEN',
			send_time_approval_email: true, // Default: send email
		},
	});

	const watchedProjectId = watch('project_id');
	const watchedCustomerId = watch('customer_id');
	const watchedDescription = watch('description');

	// Check for Speech Recognition support
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
			setHasSpeechRecognition(!!SpeechRecognition);
		}
	}, []);

	// Initialize Speech Recognition
	useEffect(() => {
		if (!hasSpeechRecognition || !open) return;

		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		if (SpeechRecognition) {
			const recognitionInstance = new SpeechRecognition() as SpeechRecognition;
			recognitionInstance.continuous = true;
			recognitionInstance.interimResults = true;
			recognitionInstance.lang = 'sv-SE'; // Swedish

			recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
				// Ta bara "final" resultat (mindre brus)
				const result = event.results[event.resultIndex];
				if (!result || !result.isFinal) return;

				const transcript = (result[0].transcript || '').trim();
				if (!transcript) return;

				const currentDescription = watch('description') || '';

				// Om det senaste transkriptet redan finns i slutet av texten – lägg inte till igen
				if (
					currentDescription.endsWith(transcript) ||
					(transcript.length > 10 && currentDescription.includes(transcript))
				) {
					return;
				}

				const separator = currentDescription ? ' ' : '';
				setValue('description', `${currentDescription}${separator}${transcript}`, {
					shouldValidate: false,
				});
			};

			recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
				console.error('Speech recognition error:', event.error);
				if (event.error === 'no-speech' || event.error === 'aborted') {
					setIsListening(false);
				} else {
					toast.error('Röstigenkänning misslyckades: ' + event.error);
					setIsListening(false);
				}
			};

			recognitionInstance.onend = () => {
				setIsListening(false);
			};

			setRecognition(recognitionInstance);

			return () => {
				if (recognitionInstance) {
					try {
						recognitionInstance.stop();
					} catch (e) {
						// Ignore errors when stopping
					}
				}
			};
		}
	}, [hasSpeechRecognition, open, setValue, watch]);

	// Fetch projects and customers in parallel when modal opens
	useEffect(() => {
		if (!open) {
			// Reset loading state when modal closes
			setIsLoadingData(false);
			// Rensa projektlistan när modalen stängs
			setProjects([]);
			setSelectedCustomerId('');
			setSelectedProject(null);
			return;
		}

		console.log('[CreateWorkOrderModal] Modal opened, checking data state');
		console.log('[CreateWorkOrderModal] hasLoadedInitialData:', hasLoadedInitialData);
		console.log('[CreateWorkOrderModal] projects.length:', projects.length);
		console.log('[CreateWorkOrderModal] customers.length:', customers.length);

		// Om vi redan har laddat grunddatan en gång, återanvänd den direkt
		// så att formuläret visas omedelbart och vi slipper lång skeleton varje öppning.
		// OBS: Vi laddar inte projekt här - de laddas när kund väljs
		if (hasLoadedInitialData && customers.length > 0) {
			console.log('[CreateWorkOrderModal] Using cached data, showing form immediately');
			setIsLoadingData(false);
			// Rensa projektlistan när modalen öppnas (om ingen kund är vald)
			if (!selectedCustomerId) {
				setProjects([]);
			}
			return;
		}

		// Första gången (eller om listorna är tomma) visar vi skeleton medan vi hämtar.
		console.log('[CreateWorkOrderModal] Loading data...');
		setIsLoadingData(true);

		// Fetch customers (projects will be loaded when customer is selected)
		const fetchData = async () => {
			try {
				const customersResponse = await fetch('/api/customers?pageSize=1000').catch(() => null);

				// Handle customers
				if (customersResponse && customersResponse.ok) {
					const data = await customersResponse.json();
					// Customers API returns { items: [...], page, pageSize, total }
					setCustomers(data.items || []);
					if (data.items && data.items.length > 0) {
						console.log(`Loaded ${data.items.length} customers`);
					}
				} else if (customersResponse && !customersResponse.ok) {
					console.error('Error fetching customers:', customersResponse.status, customersResponse.statusText);
				} else if (!customersResponse) {
					console.error('Failed to fetch customers - no response');
				}

				// If source is 'project', fetch that specific project and its customer
				if (source.source === 'project') {
					const projectsResponse = await fetch('/api/projects').catch(() => null);
					if (projectsResponse && projectsResponse.ok) {
						const data = await projectsResponse.json();
						if (data && data.projects) {
							const project = data.projects?.find((p: Project) => p.id === source.projectId);
							if (project) {
								setSelectedProject(project);
								setValue('project_id', project.id);
								if (project.customer_id) {
									setValue('customer_id', project.customer_id);
									setSelectedCustomerId(project.customer_id);
									// Fetch projects for this customer
									const customerProjectsResponse = await fetch(`/api/projects?customer_id=${project.customer_id}`).catch(() => null);
									if (customerProjectsResponse && customerProjectsResponse.ok) {
										const customerProjectsData = await customerProjectsResponse.json();
										setProjects(customerProjectsData.projects || []);
									}
								}
							}
						}
					}
				}

				// Markera att vi har grunddata laddad så vi kan återanvända den nästa gång.
				setHasLoadedInitialData(true);
			} catch (err) {
				console.error('Error fetching data:', err);
				const error = err as Error;
				setError(error.message || 'Kunde inte hämta data');
			} finally {
				setIsLoadingData(false);
			}
		};

		fetchData();
	}, [open, source, setValue, hasLoadedInitialData, projects.length, customers.length]);

	// Set default date/time from calendar source or today's date
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
		} else if (open && !plannedDate) {
			// Set today's date as default when modal opens (if not from calendar)
			// This matches what DatePickerInput shows by default
			const today = new Date();
			const todayStr = today.toISOString().split('T')[0];
			setPlannedDate(todayStr);
		}
	}, [source, open]);

	// Handle customer selection - fetch projects for customer
	const handleCustomerChange = async (customerId: string) => {
		setSelectedCustomerId(customerId);
		setValue('customer_id', customerId || null, { shouldValidate: true });
		
		// Clear project selection when customer changes
		setSelectedProject(null);
		// Clear project_id and its errors when customer changes
		setValue('project_id', undefined as any, { shouldValidate: false });
		clearErrors('project_id');
		setProjects([]);

		if (!customerId) {
			return;
		}

		// Fetch projects for this customer
		setIsLoadingProjects(true);
		try {
			const response = await fetch(`/api/projects?customer_id=${customerId}`);
			if (response.ok) {
				const data = await response.json();
				const customerProjects = data.projects || [];
				setProjects(customerProjects);
				
				if (customerProjects.length === 0) {
					// No projects for this customer - user needs to create one
					toast.info('Kunden har inga projekt. Skapa ett nytt projekt.');
				}
			} else {
				console.error('Error fetching projects for customer');
				setProjects([]);
			}
		} catch (err) {
			console.error('Error fetching projects:', err);
			setProjects([]);
		} finally {
			setIsLoadingProjects(false);
		}
	};

	// Handle project selection
	const handleProjectChange = (projectId: string) => {
		if (projectId === '__create_project__') {
			setShowCreateProject(true);
			return;
		}
		const project = projects.find((p) => p.id === projectId);
		setSelectedProject(project || null);
		setValue('project_id', projectId, { shouldValidate: true });

		// Om användaren valt "Huvudprojektets adress" och projektet har en platsadress – fyll i den.
		if (useProjectAddress && project?.site_address) {
			setValue('location_address', project.site_address, { shouldValidate: false });
		}
	};

	// Handle form submission
	const onSubmit = async (data: CreateWorkOrder) => {
		console.log('[CreateWorkOrderModal] onSubmit called with data:', data);
		setIsSubmitting(true);
		setError(null);

		try {
			console.log('[CreateWorkOrderModal] Submitting work order with data:', data);
			console.log('[CreateWorkOrderModal] plannedDate state:', plannedDate);
			console.log('[CreateWorkOrderModal] selectedCustomerId:', selectedCustomerId);
			console.log('[CreateWorkOrderModal] watchedProjectId:', watchedProjectId);
			console.log('[CreateWorkOrderModal] selectedAssignments:', selectedAssignments);
			
			// Validate project_id - must be set if customer is selected
			if (selectedCustomerId && !data.project_id) {
				console.error('[CreateWorkOrderModal] Validation failed: project_id missing');
				if (projects.length === 0) {
					const errorMsg = 'Du måste skapa ett projekt först. Klicka på "Skapa nytt projekt".';
					setError(errorMsg);
					toast.error(errorMsg);
				} else {
					const errorMsg = 'Projekt är obligatoriskt';
					setError(errorMsg);
					toast.error(errorMsg);
				}
				setIsSubmitting(false);
				return;
			}

			// Validate project_id is a valid UUID
			if (data.project_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.project_id)) {
				const errorMsg = 'Ogiltigt projekt-ID. Välj eller skapa ett projekt.';
				console.error('[CreateWorkOrderModal] Validation failed: invalid project_id:', data.project_id);
				setError(errorMsg);
				toast.error(errorMsg);
				setIsSubmitting(false);
				return;
			}

			// Validate date - check both state and if we can construct a date
			// The date picker might have set the value but state hasn't updated yet
			const hasDate = plannedDate && plannedDate.trim().length > 0;
			// Also validate that the date string is in the correct format (YYYY-MM-DD)
			const isValidDate = hasDate && /^\d{4}-\d{2}-\d{2}$/.test(plannedDate.trim());
			if (!hasDate || !isValidDate) {
				const errorMsg = 'Datum är obligatoriskt. Välj ett datum från kalendern.';
				console.error('[CreateWorkOrderModal] Validation failed: invalid date:', plannedDate);
				setError(errorMsg);
				toast.error(errorMsg);
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
					// role is optional, so we don't include it if it's null/undefined
					is_responsible: true,
					assignment_status: 'TILLDELAD' as const,
				}));
			}

			// Add email setting
			submitData.send_time_approval_email = sendTimeApprovalEmail;

			console.log('Sending request with submitData:', submitData);

			const response = await fetch('/api/work-orders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(submitData),
			});

			console.log('Response status:', response.status);

			if (!response.ok) {
				const errorData = await response.json();
				const errorMessage = errorData.details
					? `${errorData.error || 'Kunde inte skapa arbetsorder'}: ${JSON.stringify(errorData.details)}`
					: errorData.error || 'Kunde inte skapa arbetsorder';
				throw new Error(errorMessage);
			}

			const result = await response.json();
			console.log('[CreateWorkOrderModal] Work order created successfully:', result);
			toast.success('Arbetsorder skapad');
			// API returns work order directly, not wrapped in work_order property
			try {
				await onSuccess(result);
				console.log('[CreateWorkOrderModal] onSuccess callback completed');
			} catch (onSuccessError) {
				console.error('[CreateWorkOrderModal] Error in onSuccess callback:', onSuccessError);
				// Don't throw - work order was created successfully
			}
			
			// Mark as just saved to avoid "unsaved changes" dialog
			setJustSaved(true);
			
			// Reset form before closing to avoid "unsaved changes" dialog
			reset();
			setPlannedDate('');
			setPlannedStartTime('');
			setPlannedEndTime('');
			setAllDay(false);
			setSendTimeApprovalEmail(true);
			setSelectedAssignments([]);
			setSelectedProject(null);
			setSelectedCustomerId('');
			setError(null);
			
			// Close modal - handleClose will see justSaved flag and skip the dialog
			onOpenChange(false);
		} catch (err) {
			console.error('[CreateWorkOrderModal] Error creating work order:', err);
			const error = err as Error;
			const errorMessage = error.message || 'Kunde inte skapa arbetsorder';
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle close with unsaved changes check
	const handleClose = useCallback(() => {
		// If we just saved successfully, don't show unsaved changes dialog
		if (justSaved) {
			setJustSaved(false);
			reset();
			setPlannedDate('');
			setPlannedStartTime('');
			setPlannedEndTime('');
			setAllDay(false);
			setSendTimeApprovalEmail(true);
			setSelectedAssignments([]);
			setSelectedProject(null);
			setSelectedCustomerId('');
			setError(null);
			onOpenChange(false);
			return;
		}

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
			setSendTimeApprovalEmail(true);
			setSelectedAssignments([]);
			setSelectedProject(null);
			setSelectedCustomerId('');
			setError(null);
			onOpenChange(false);
		}
	}, [plannedDate, plannedStartTime, plannedEndTime, watchedProjectId, watch, isSubmitting, reset, onOpenChange, justSaved]);

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
						<div className="space-y-4">
							{/* Show form skeleton while loading */}
							<div className="space-y-2">
								<div className="h-4 w-20 bg-muted rounded animate-pulse" />
								<div className="h-10 w-full bg-muted rounded animate-pulse" />
							</div>
							<div className="space-y-2">
								<div className="h-4 w-16 bg-muted rounded animate-pulse" />
								<div className="h-10 w-full bg-muted rounded animate-pulse" />
							</div>
							<div className="space-y-2">
								<div className="h-4 w-12 bg-muted rounded animate-pulse" />
								<div className="h-24 w-full bg-muted rounded animate-pulse" />
							</div>
							<div className="flex items-center justify-center py-4">
								<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
								<span className="ml-2 text-sm text-muted-foreground">Laddar data...</span>
							</div>
						</div>
					) : error && !isLoadingData ? (
						<div className="space-y-4">
							<div className="rounded-lg bg-destructive/10 border border-destructive p-4 text-sm text-destructive">
								<p className="font-medium">Kunde inte ladda data</p>
								<p className="mt-2">{error}</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="mt-4"
									onClick={() => {
										setError(null);
										setIsLoadingData(true);
										setHasLoadedInitialData(false);
									}}
								>
									Försök igen
								</Button>
							</div>
						</div>
					) : (
						<form 
							onSubmit={(e) => {
								console.log('[CreateWorkOrderModal] Form onSubmit event fired');
								e.preventDefault();
								console.log('[CreateWorkOrderModal] Calling handleSubmit');
								handleSubmit(
									(data) => {
										console.log('[CreateWorkOrderModal] Validation passed, calling onSubmit with data:', data);
										onSubmit(data);
									},
									(errors) => {
										console.error('[CreateWorkOrderModal] Validation failed:', errors);
										console.error('[CreateWorkOrderModal] Error details:', JSON.stringify(errors, null, 2));
										// Show specific validation errors
										const errorMessages = Object.entries(errors).map(([key, error]: [string, any]) => {
											return `${key}: ${error?.message || 'Ogiltigt värde'}`;
										});
										toast.error(`Valideringsfel: ${errorMessages.join(', ')}`);
									}
								)(e);
							}} 
							className="space-y-4"
						>
							{error && (
								<div className="rounded-lg bg-destructive/10 border border-destructive p-3 text-sm text-destructive">
									{error}
								</div>
							)}
							{Object.keys(errors).length > 0 && (
								<div className="rounded-lg bg-destructive/10 border border-destructive p-3 text-sm text-destructive">
									<p>Valideringsfel:</p>
									<ul className="list-disc list-inside mt-2 space-y-1">
										{Object.entries(errors).map(([key, error]) => (
											<li key={key}>
												<strong>{key}:</strong> {error?.message || 'Okänt fel'}
											</li>
										))}
									</ul>
								</div>
							)}

							{/* Customer selection - FIRST, always show */}
							<div className="space-y-2">
								<Label htmlFor="customer_id">
									Kund <span className="text-destructive">*</span>
								</Label>
								<Select
									value={selectedCustomerId || ''}
									onValueChange={(value) => {
										if (value === '__create_customer__') {
											setShowCreateCustomer(true);
											return;
										}
										handleCustomerChange(value);
									}}
								>
									<SelectTrigger id="customer_id">
										<SelectValue placeholder="Välj kund" />
									</SelectTrigger>
									<SelectContent>
										{customers.length > 0 ? (
											customers.map((customer) => {
												const name = customer.type === 'COMPANY'
													? customer.company_name || 'Okänt företag'
													: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Okänd person';
												return (
													<SelectItem key={customer.id} value={customer.id}>
														{name}
													</SelectItem>
												);
											})
										) : (
											<SelectItem value="__loading__" disabled>
												Laddar kunder...
											</SelectItem>
										)}
										<SelectItem value="__create_customer__" className="text-orange-600 dark:text-orange-400">
											<div className="flex items-center gap-2">
												<Plus className="w-4 h-4" />
												<span className="font-medium">Skapa ny kund</span>
											</div>
										</SelectItem>
									</SelectContent>
								</Select>
								<input type="hidden" {...register('customer_id')} value={selectedCustomerId || ''} />
								{errors.customer_id && (
									<p className="text-sm text-destructive">{errors.customer_id.message}</p>
								)}
							</div>

							{/* Project selection - ONLY shown after customer is selected */}
							{source.source === 'project' ? (
								<div className="space-y-2">
									<Label>Projekt</Label>
									<Input
										value={selectedProject?.name || ''}
										disabled
										className="bg-muted"
									/>
									<input type="hidden" {...register('project_id')} value={watchedProjectId || ''} />
								</div>
							) : selectedCustomerId ? (
								isLoadingProjects ? (
									<div className="space-y-2">
										<Label htmlFor="project_id">
											Projekt <span className="text-destructive">*</span>
										</Label>
										<div className="h-10 w-full bg-muted rounded-md animate-pulse" />
									</div>
								) : projects.length > 0 ? (
									<div className="space-y-2">
										<Label htmlFor="project_id">
											Projekt <span className="text-destructive">*</span>
										</Label>
										<Select
											value={watchedProjectId || ''}
											onValueChange={(value) => {
												if (value === '__create_project__') {
													setShowCreateProject(true);
													return;
												}
												handleProjectChange(value);
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
												<SelectItem value="__create_project__" className="text-orange-600 dark:text-orange-400">
													<div className="flex items-center gap-2">
														<Plus className="w-4 h-4" />
														<span className="font-medium">Skapa nytt projekt</span>
													</div>
												</SelectItem>
											</SelectContent>
										</Select>
										<input type="hidden" {...register('project_id')} value={watchedProjectId || ''} />
										{errors.project_id && (
											<p className="text-sm text-destructive">{errors.project_id.message}</p>
										)}
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="w-full mt-2"
											onClick={() => setShowCreateProject(true)}
										>
											<Plus className="w-4 h-4 mr-2" />
											Skapa nytt projekt
										</Button>
									</div>
								) : (
									<div className="space-y-2">
										<Label htmlFor="project_id">
											Projekt <span className="text-destructive">*</span>
										</Label>
										<Button
											type="button"
											variant="outline"
											className="w-full"
											onClick={() => setShowCreateProject(true)}
										>
											<Plus className="w-4 h-4 mr-2" />
											Skapa nytt projekt
										</Button>
										<p className="text-sm text-muted-foreground">
											Kunden har inga projekt. Klicka för att skapa ett nytt projekt.
										</p>
										{/* Don't register project_id when no projects exist - it will be set when project is created */}
										{watchedProjectId && (
											<input type="hidden" {...register('project_id')} value={watchedProjectId} />
										)}
										{errors.project_id && (
											<p className="text-sm text-destructive">{errors.project_id.message}</p>
										)}
									</div>
								)
							) : null}

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

							{/* Description - Larger with voice-to-text */}
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="description">Beskrivning</Label>
									{hasSpeechRecognition && (
										<Button
											type="button"
											variant={isListening ? 'destructive' : 'outline'}
											size="sm"
											onClick={() => {
												if (!recognition) {
													toast.error('Röstigenkänning är inte tillgänglig');
													return;
												}
												if (isListening) {
													recognition.stop();
													setIsListening(false);
													toast.info('Röstigenkänning stoppad');
												} else {
													try {
														recognition.start();
														setIsListening(true);
														toast.success('Röstigenkänning startad - tala nu');
													} catch (err) {
														console.error('Error starting recognition:', err);
														toast.error('Kunde inte starta röstigenkänning');
													}
												}
											}}
											className="h-8 gap-2"
										>
											{isListening ? (
												<>
													<MicOff className="h-4 w-4" />
													<span className="hidden sm:inline">Stoppa</span>
												</>
											) : (
												<>
													<Mic className="h-4 w-4" />
													<span className="hidden sm:inline">Röst</span>
												</>
											)}
										</Button>
									)}
								</div>
								<Textarea
									id="description"
									{...register('description')}
									placeholder="Beskriv arbetsordern... (eller använd röstigenkänning)"
									rows={6}
									className="min-h-[150px] resize-y"
								/>
								{isListening && (
									<div className="flex items-center gap-2 text-sm text-orange-500 dark:text-orange-400">
										<div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
										<span>Lyssnar... Tala nu</span>
									</div>
								)}
							</div>

							{/* Date and Time */}
							<div className="space-y-4">
								<DatePickerInput
									id="planned_date"
									label="Datum"
									value={plannedDate}
									onChange={(dateStr) => {
										console.log('DatePicker onChange called with:', dateStr);
										setPlannedDate(dateStr);
									}}
									required
								/>

								{/* Heldag - Mobile-friendly */}
								<div className="space-y-2">
									<Label htmlFor="all_day">Heldag</Label>
									<label
										htmlFor="all_day"
										className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/50 cursor-pointer transition-all active:scale-[0.98]"
									>
										<Checkbox
											id="all_day"
											checked={allDay}
											onCheckedChange={(checked) => {
												setAllDay(checked === true);
												setValue('all_day', checked === true);
											}}
											className="h-5 w-5"
										/>
										<span className="text-sm sm:text-base font-normal flex-1">
											Heldag
										</span>
									</label>
									<p className="text-xs text-muted-foreground ml-1">
										Om valt, ignoreras start- och sluttider
									</p>
								</div>

								{/* Send Time Approval Email */}
								<div className="space-y-2">
									<Label htmlFor="send_time_approval_email">E-postinställningar</Label>
									<label
										htmlFor="send_time_approval_email"
										className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/50 cursor-pointer transition-all active:scale-[0.98]"
									>
										<Checkbox
											id="send_time_approval_email"
											checked={sendTimeApprovalEmail}
											onCheckedChange={(checked) => {
												setSendTimeApprovalEmail(checked === true);
												setValue('send_time_approval_email', checked === true);
											}}
											className="h-5 w-5"
										/>
										<span className="text-sm sm:text-base font-normal flex-1">
											Skicka e-post för godkännande av registrerad tid
										</span>
									</label>
									<p className="text-xs text-muted-foreground ml-1">
										Arbetare får ett e-post med registrerad tid att godkänna eller justera
									</p>
								</div>
							</div>

							{/* Location */}
							<div className="space-y-3">
								<Label>Plats</Label>
								<p className="text-xs text-muted-foreground">
									Välj om arbetet ska utföras på projektets adress eller ange en annan adress.
								</p>
								<div className="space-y-2">
									<div className="flex flex-col sm:flex-row gap-2">
										<Button
											type="button"
											variant={useProjectAddress ? 'default' : 'outline'}
											className="flex-1"
											onClick={() => {
												setUseProjectAddress(true);
												// Nollställ egna adressfält
												setValue('location_address', null as any);
											}}
										>
											Huvudprojektets adress
										</Button>
										<Button
											type="button"
											variant={!useProjectAddress ? 'default' : 'outline'}
											className="flex-1"
											onClick={() => {
												setUseProjectAddress(false);
											}}
										>
											Annan adress
										</Button>
									</div>

									{/* Egna adressfält med Geoapify-autocomplete - bara visa när "Annan adress" är valt */}
									{!useProjectAddress && (
										<div className="space-y-1 mt-2">
											<Label htmlFor="location_address">Adress</Label>
											<AddressAutocomplete
												id="location_address"
												name="location_address"
												autoComplete="street-address"
												value={watch('location_address') || ''}
												onChange={(val) => {
													setValue('location_address', val || null, { shouldValidate: false });
												}}
												onSelect={(addr) => {
													const formatted = `${addr.address_line1}, ${addr.postal_code} ${addr.city}`.trim();
													setValue('location_address', formatted, { shouldValidate: true });
													// Spara koordinater för bättre kartvisning
													if (addr.lat && addr.lon) {
														setValue('location_lat', addr.lat, { shouldValidate: false });
														setValue('location_lng', addr.lon, { shouldValidate: false });
													}
												}}
												placeholder="Ex: Observatoriegatan 13, 113 29 Stockholm"
											/>
										</div>
									)}
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


							{/* Assignments - Mobile-friendly with compact layout */}
							<div className="space-y-2">
								<Label>Tilldelningar</Label>
								{users.length === 0 ? (
									<p className="text-sm text-muted-foreground">Inga användare tillgängliga</p>
								) : (
									<>
										<div className="space-y-1 max-h-[240px] overflow-y-auto pr-1 -mr-1">
											{/* Mobile: Compact cards, Desktop: Spacious list */}
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
												{users.map((user) => (
													<label
														key={user.id}
														htmlFor={`assign-${user.id}`}
														className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-lg border border-border/50 hover:border-border hover:bg-muted/50 cursor-pointer transition-all active:scale-[0.98]"
													>
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
															className="flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5"
														/>
														<span className="text-sm sm:text-base font-normal flex-1 min-w-0 truncate">
															{user.full_name || user.email}
														</span>
													</label>
												))}
											</div>
										</div>
										{selectedAssignments.length > 0 && (
											<div className="flex items-center justify-between pt-1.5 border-t border-border/50">
												<p className="text-xs sm:text-sm text-muted-foreground">
													{selectedAssignments.length} {selectedAssignments.length === 1 ? 'person tilldelad' : 'personer tilldelade'}
												</p>
												{selectedAssignments.length > 0 && (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="h-6 text-xs"
														onClick={() => setSelectedAssignments([])}
													>
														Rensa alla
													</Button>
												)}
											</div>
										)}
									</>
								)}
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

			{/* Create Customer Dialog */}
			<Dialog open={showCreateCustomer} onOpenChange={setShowCreateCustomer}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Skapa ny kund</DialogTitle>
					</DialogHeader>
					<CustomerForm
						onSubmit={async (payload: CustomerPayload) => {
							try {
								const newCustomer = await createCustomerMutation.mutateAsync(payload);
								setCustomers([newCustomer, ...customers]);
								setSelectedCustomerId(newCustomer.id);
								setValue('customer_id', newCustomer.id, { shouldValidate: true });
								setShowCreateCustomer(false);
								toast.success('Kund skapad');
								// Fetch projects for the new customer
								await handleCustomerChange(newCustomer.id);
							} catch (error) {
								console.error('Error creating customer:', error);
								
								// Extract detailed error message
								let errorMessage = 'Kunde inte skapa kund';
								if (error instanceof Error) {
									const errorWithIssues = error as Error & {
										issues?: Array<{ path: string; message: string }>;
									};
									
									if (errorWithIssues.issues && errorWithIssues.issues.length > 0) {
										// Format validation errors
										const fieldErrors = errorWithIssues.issues.map(issue => {
											const fieldName = issue.path.split('.').pop() || issue.path;
											const fieldLabels: Record<string, string> = {
												'company_name': 'Företagsnamn',
												'org_no': 'Organisationsnummer',
												'invoice_email': 'Fakturamejl',
												'invoice_address_street': 'Fakturaadress',
												'first_name': 'Förnamn',
												'last_name': 'Efternamn',
												'personal_identity_no': 'Personnummer',
											};
											const label = fieldLabels[fieldName] || fieldName;
											return `${label}: ${issue.message}`;
										});
										errorMessage = `Valideringsfel:\n${fieldErrors.join('\n')}`;
									} else {
										errorMessage = error.message;
									}
								}
								
								// Show error in toast with better formatting
								if (errorMessage.includes('\n')) {
									// For multi-line errors, show first line in toast and log full error
									const firstLine = errorMessage.split('\n')[0];
									toast.error(firstLine, {
										description: errorMessage.split('\n').slice(1).join('\n'),
										duration: 10000, // Show longer for validation errors
									});
								} else {
									toast.error(errorMessage, {
										duration: 5000,
									});
								}
								// Don't close the dialog on error so user can try again
							}
						}}
						onCancel={() => setShowCreateCustomer(false)}
						submitLabel="Skapa kund"
					/>
				</DialogContent>
			</Dialog>

			{/* Create Project Dialog */}
			<Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Skapa nytt projekt</DialogTitle>
					</DialogHeader>
					<ProjectForm
						orgId={orgId}
						project={selectedCustomerId ? { customer_id: selectedCustomerId } as any : undefined}
						onSubmit={async (data) => {
							setIsCreatingProject(true);
							try {
								const result = await createProject({
									...data,
									customer_id: selectedCustomerId || null,
								});
								if (result.success && result.project) {
									// Add new project to the list
									const newProject: Project = {
										id: result.project.id,
										name: result.project.name,
										project_number: result.project.project_number,
										customer_id: result.project.customer_id,
									};
									setProjects([newProject, ...projects]);
									setSelectedProject(newProject);
									// Set project_id in form - this will trigger validation
									setValue('project_id', newProject.id, { shouldValidate: true });
									clearErrors('project_id');
									setShowCreateProject(false);
									toast.success('Projekt skapad');
									// Clear any previous errors
									setError(null);
									// Return result so ProjectForm can handle it
									return result;
								} else {
									throw new Error('Kunde inte skapa projekt');
								}
							} catch (error) {
								console.error('Error creating project:', error);
								toast.error(error instanceof Error ? error.message : 'Kunde inte skapa projekt');
								// Return error result
								return {
									success: false,
									project: null,
								};
							} finally {
								setIsCreatingProject(false);
							}
						}}
					/>
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
