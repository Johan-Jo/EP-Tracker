'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';
import {
	FileText,
	Calendar,
	RefreshCw,
	CheckCircle2,
	Info,
	Clock,
	Package,
	Receipt,
	BookOpen,
	Lock,
	Download,
	AlertCircle,
	Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
	useInvoiceBasis,
	useLockInvoiceBasis,
	useUnlockInvoiceBasis,
	useUpdateInvoiceHeader,
	useUpdateInvoiceLine,
	InvoiceBasisRecord,
} from '@/lib/hooks/use-invoice-basis';
import { InvoiceBasisLine } from '@/lib/jobs/invoice-basis-refresh';
import { useInvoiceBasisGrouped } from '@/lib/hooks/use-invoice-basis-grouped';
import { InvoiceStepIndicator, InvoiceStep } from './invoice-step-indicator';
import { InvoiceProjectFilter } from './invoice-project-filter';
import { InvoicePendingApprovals } from './invoice-pending-approvals';
import { InvoiceLanding } from '@/components/invoices/invoice-landing';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface InvoiceBasisPageProps {
	orgId: string;
	projects: Array<{ id: string; name: string; projectNumber: string | null }>;
	userRole?: 'admin' | 'foreman' | 'finance';
}

interface LineEditState {
	description: string;
	article_code: string;
	account: string;
	unit: string;
	quantity: string;
	unit_price: string;
	discount: string;
	vat_rate: string;
	vat_code: string;
}

function formatDefaultPeriodStart(): string {
	const now = new Date();
	const day = now.getDay();
	const diff = now.getDate() - day + (day === 0 ? -6 : 1);
	const monday = new Date(now.setDate(diff));
	return format(monday, 'yyyy-MM-dd');
}

function formatDefaultPeriodEnd(): string {
	const start = new Date(formatDefaultPeriodStart());
	const sunday = new Date(start);
	sunday.setDate(start.getDate() + 6);
	return format(sunday, 'yyyy-MM-dd');
}

type Step = 'select' | 'approvals' | 'preview' | 'lock' | 'completed';

export function InvoiceBasisPage({ orgId, projects, userRole = 'admin' }: InvoiceBasisPageProps) {
	const canApprove = userRole === 'admin' || userRole === 'foreman';
	const canEdit = userRole === 'admin';
	const canLock = userRole === 'admin';
	const canExportToFortnox = userRole === 'admin' || userRole === 'finance';
	const roleForLanding: 'admin' | 'finance' = canApprove ? 'admin' : 'finance';

	// Step 1: Project & Period Selection
	const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
	// Start utan förvalda datum – vi sätter dem när användaren valt projekt
	const [periodStart, setPeriodStart] = useState<string>('');
	const [periodEnd, setPeriodEnd] = useState<string>('');
	const [currentStep, setCurrentStep] = useState<Step>('select');
	const [hasFetchedBasis, setHasFetchedBasis] = useState(false);
	const [isFetchingDateRange, setIsFetchingDateRange] = useState(false);

	// Step 3: Invoice Preview (for single project - TODO: support multi-project)
	const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id ?? '');

	const [headerState, setHeaderState] = useState({
		invoice_series: '',
		invoice_number: '',
		invoice_date: '',
		due_date: '',
		payment_terms_days: '',
		our_ref: '',
		your_ref: '',
		currency: 'SEK',
		reverse_charge_building: false,
		rot_rut_flag: false,
		cost_center: '',
		result_unit: '',
	});

	const [lockReason, setLockReason] = useState('');
	const [unlockReason, setUnlockReason] = useState('');
	const [editingLineId, setEditingLineId] = useState<string | null>(null);
	const [lineState, setLineState] = useState<LineEditState | null>(null);
	const [fortnoxStatus, setFortnoxStatus] = useState<{
		fortnox_invoice_number: string | null;
		status: string | null;
		error_message: string | null;
	} | null>(null);
	const [isExportingToFortnox, setIsExportingToFortnox] = useState(false);
	const [customerFortnoxNumber, setCustomerFortnoxNumber] = useState('');

	// Fetch grouped basis data for Step 2
	const {
		data: basisGrouped,
		isLoading: isLoadingGrouped,
		refetch: refetchGrouped,
	} = useInvoiceBasisGrouped({
		projectIds: selectedProjectIds,
		from: periodStart,
		to: periodEnd,
		enabled: hasFetchedBasis && selectedProjectIds.length > 0 && !!periodStart && !!periodEnd,
	});

	// Fetch invoice basis for Step 3 (single project)
	const {
		data: invoiceBasis,
		isLoading: isLoadingBasis,
		isFetching: isFetchingBasis,
		refetch: refetchBasis,
	} = useInvoiceBasis({
		projectId: selectedProject,
		periodStart,
		periodEnd,
		enabled: currentStep === 'preview' && !!selectedProject && !!periodStart && !!periodEnd,
	});

	// Track if we've attempted to fetch customer Fortnox number
	const [hasFetchedCustomerNumber, setHasFetchedCustomerNumber] = useState(false);
	const [isFetchingCustomerNumber, setIsFetchingCustomerNumber] = useState(false);

	// Fetch customer Fortnox number from customer record (saved when importing from Fortnox)
	// CRITICAL: This should ONLY fetch the number, NEVER trigger export
	// This useEffect should NEVER call handleExportToFortnox
	useEffect(() => {
		// Reset state when invoice basis changes
		if (!invoiceBasis?.customer_id) {
			setCustomerFortnoxNumber('');
			setHasFetchedCustomerNumber(false);
			setIsFetchingCustomerNumber(false);
			return;
		}

		// Only fetch if we haven't fetched yet and invoice basis is locked
		if (hasFetchedCustomerNumber || isFetchingCustomerNumber || !invoiceBasis.locked) {
			return;
		}

		const fetchCustomerFortnoxNumber = async () => {
			setIsFetchingCustomerNumber(true);
			try {
				console.log('[InvoiceBasis] Fetching customer Fortnox number for customer_id:', invoiceBasis.customer_id);
				const response = await fetch(`/api/customers/${invoiceBasis.customer_id}`);
				if (response.ok) {
					const data = await response.json();
					console.log('[InvoiceBasis] Raw API response:', data);
					const customer = data.customer || data; // Handle both formats
					// Handle null, undefined, or empty string - trim and validate
					const fortnoxNumber = customer?.fortnox_customer_number 
						? String(customer.fortnox_customer_number).trim() 
						: '';
					console.log('[InvoiceBasis] Customer data:', {
						customer_id: invoiceBasis.customer_id,
						org_no: customer?.org_no,
						fortnox_customer_number: fortnoxNumber,
						raw_fortnox_customer_number: customer?.fortnox_customer_number,
						company_name: customer?.company_name,
					});
					
					// CRITICAL: Only set state, NEVER call handleExportToFortnox here
					setCustomerFortnoxNumber(fortnoxNumber);
					setHasFetchedCustomerNumber(true);
					
					// IMPORTANT: Do NOT trigger export here - export should ONLY happen on button click
					console.log('[InvoiceBasis] Customer number fetched, NOT triggering export');
				} else {
					console.error('[InvoiceBasis] Failed to fetch customer:', response.status, response.statusText);
					setCustomerFortnoxNumber('');
					setHasFetchedCustomerNumber(true);
				}
			} catch (error) {
				console.error('Failed to fetch customer Fortnox number:', error);
				setCustomerFortnoxNumber('');
				setHasFetchedCustomerNumber(true);
			} finally {
				setIsFetchingCustomerNumber(false);
			}
		};

		fetchCustomerFortnoxNumber();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [invoiceBasis?.customer_id, invoiceBasis?.locked]);

	const updateHeader = useUpdateInvoiceHeader();
	const updateLine = useUpdateInvoiceLine();
	const lockBasis = useLockInvoiceBasis();
	const unlockBasis = useUnlockInvoiceBasis();

	// Handle fetch basis button click
	const handleFetchBasis = async () => {
		if (selectedProjectIds.length === 0) {
			toast.error('Välj minst ett projekt');
			return;
		}

		let nextFrom = periodStart;
		let nextTo = periodEnd;

		// Om inget datum är valt och exakt ett projekt är markerat – försök att hämta intervall automatiskt
		if ((!nextFrom || !nextTo) && selectedProjectIds.length === 1) {
			const projectId = selectedProjectIds[0];
			try {
				const params = new URLSearchParams({ projectId });
				const res = await fetch(`/api/invoice/project-date-range?${params.toString()}`, {
					headers: { 'Content-Type': 'application/json' },
				});
				if (res.ok) {
					const data = await res.json();
					if (data?.hasData && data.from && data.to) {
						nextFrom = data.from;
						nextTo = data.to;
						setPeriodStart(data.from);
						setPeriodEnd(data.to);
						toast.info('Vi har satt perioden automatiskt efter alla relevanta rader för projektet.', {
							description: `${data.from} till ${data.to}`,
						});
					}
				}
			} catch (error) {
				console.error('project-date-range error in handleFetchBasis', error);
				toast.error('Kunde inte föreslå datumspann automatiskt. Välj period manuellt.');
			}
		}

		if (!nextFrom || !nextTo) {
			toast.error('Välj ett datumspann innan du hämtar underlag.');
			return;
		}

		if (new Date(nextFrom) > new Date(nextTo)) {
			toast.error('Från-datum måste vara före eller samma som till-datum');
			return;
		}

		// Uppdatera state om vi har justerat datumen
		if (nextFrom !== periodStart) setPeriodStart(nextFrom);
		if (nextTo !== periodEnd) setPeriodEnd(nextTo);

		setHasFetchedBasis(true);
		setCurrentStep('approvals');
		// Själva datan hämtas automatiskt via useInvoiceBasisGrouped när hasFetchedBasis=true och datum/projekt ändras
	};

	// Handle approvals complete - called från Steg 2 (InvoicePendingApprovals)
	const handleApprovalsComplete = () => {
		// Use first selected project for now (TODO: support multi-project invoice basis)
		if (selectedProjectIds.length > 0) {
			setSelectedProject(selectedProjectIds[0]);
			setCurrentStep('preview');
			refetchBasis();
		}
	};

	useEffect(() => {
		if (!invoiceBasis) return;
		setHeaderState({
			invoice_series: invoiceBasis.invoice_series ?? '',
			invoice_number: invoiceBasis.invoice_number ?? '',
			invoice_date: invoiceBasis.invoice_date ?? '',
			due_date: invoiceBasis.due_date ?? '',
			payment_terms_days: invoiceBasis.payment_terms_days?.toString() ?? '',
			our_ref: invoiceBasis.our_ref ?? '',
			your_ref: invoiceBasis.your_ref ?? '',
			currency: invoiceBasis.currency ?? 'SEK',
			reverse_charge_building: invoiceBasis.reverse_charge_building,
			rot_rut_flag: invoiceBasis.rot_rut_flag,
			cost_center: invoiceBasis.cost_center ?? '',
			result_unit: invoiceBasis.result_unit ?? '',
		});
		setLockReason('');
		setUnlockReason('');
		setEditingLineId(null);
		setLineState(null);
	}, [invoiceBasis?.id]);

	const allLines = invoiceBasis?.lines_json?.lines ?? [];
	const nonDiaryLines = useMemo(
		() => allLines.filter((line) => line.type !== 'diary'),
		[allLines]
	);
	// Separate lines by type
	const timeLines = useMemo(
		() => nonDiaryLines.filter((line) => line.type === 'time'),
		[nonDiaryLines]
	);
	const materialLines = useMemo(
		() => nonDiaryLines.filter((line) => line.type === 'material'),
		[nonDiaryLines]
	);
	const expenseLines = useMemo(
		() => nonDiaryLines.filter((line) => line.type === 'expense'),
		[nonDiaryLines]
	);
	const otherLines = useMemo(
		() => nonDiaryLines.filter((line) => line.type !== 'time' && line.type !== 'material' && line.type !== 'expense'),
		[nonDiaryLines]
	);
	const hasInvoiceLines = (invoiceBasis?.lines_json?.lines?.length ?? 0) > 0;

	// Calculate totals: hours and material
	const totalHours = useMemo(() => {
		return allLines
			.filter((line) => line.type === 'time')
			.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
	}, [allLines]);

	const totalMaterialQuantity = useMemo(() => {
		return allLines
			.filter((line) => line.type === 'material')
			.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
	}, [allLines]);

	const totalMaterialAmount = useMemo(() => {
		return allLines
			.filter((line) => line.type === 'material')
			.reduce((sum, line) => {
				const quantity = Number(line.quantity) || 0;
				const unitPrice = Number(line.unit_price) || 0;
				const discount = Number(line.discount) || 0;
				const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
				const amountExVat = Math.round(quantity * unitPrice * discountFactor * 100) / 100;
				return sum + amountExVat;
			}, 0);
	}, [allLines]);

	const totalTimeAmount = useMemo(() => {
		return allLines
			.filter((line) => line.type === 'time')
			.reduce((sum, line) => {
				const quantity = Number(line.quantity) || 0;
				const unitPrice = Number(line.unit_price) || 0;
				const discount = Number(line.discount) || 0;
				const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
				const amountExVat = Math.round(quantity * unitPrice * discountFactor * 100) / 100;
				return sum + amountExVat;
			}, 0);
	}, [allLines]);

	const averageHourlyRate = useMemo(() => {
		if (totalHours === 0) return 0;
		return totalTimeAmount / totalHours;
	}, [totalHours, totalTimeAmount]);

	const totalExpenseAmount = useMemo(() => {
		return allLines
			.filter((line) => line.type === 'expense')
			.reduce((sum, line) => {
				const quantity = Number(line.quantity) || 0;
				const unitPrice = Number(line.unit_price) || 0;
				const discount = Number(line.discount) || 0;
				const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
				const amountExVat = Math.round(quantity * unitPrice * discountFactor * 100) / 100;
				return sum + amountExVat;
			}, 0);
	}, [allLines]);

	const totalOtherAmount = useMemo(() => {
		return allLines
			.filter((line) => line.type !== 'time' && line.type !== 'material' && line.type !== 'expense')
			.reduce((sum, line) => {
				const quantity = Number(line.quantity) || 0;
				const unitPrice = Number(line.unit_price) || 0;
				const discount = Number(line.discount) || 0;
				const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
				const amountExVat = Math.round(quantity * unitPrice * discountFactor * 100) / 100;
				return sum + amountExVat;
			}, 0);
	}, [allLines]);

	const totalOtherQuantity = useMemo(() => {
		return allLines
			.filter((line) => line.type !== 'time' && line.type !== 'material' && line.type !== 'expense')
			.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
	}, [allLines]);

	const handleHeaderSubmit = async () => {
		if (!selectedProject || !periodStart || !periodEnd) return;
		try {
			await updateHeader.mutateAsync({
				projectId: selectedProject,
				periodStart,
				periodEnd,
				payload: {
					invoice_series: headerState.invoice_series || null,
					invoice_number: headerState.invoice_number || null,
					invoice_date: headerState.invoice_date || null,
					due_date: headerState.due_date || null,
					payment_terms_days: headerState.payment_terms_days ? Number(headerState.payment_terms_days) : null,
					our_ref: headerState.our_ref || null,
					your_ref: headerState.your_ref || null,
					currency: headerState.currency || 'SEK',
					reverse_charge_building: headerState.reverse_charge_building,
					rot_rut_flag: headerState.rot_rut_flag,
					cost_center: headerState.cost_center || null,
					result_unit: headerState.result_unit || null,
				},
			});
			toast.success('Fakturainformation uppdaterad');
		} catch (error: unknown) {
			toast.error((error as Error)?.message ?? 'Kunde inte uppdatera fakturainformation');
		}
	};

	const handleEditLine = (line: InvoiceBasisLine) => {
		setEditingLineId(line.id);
		setLineState({
			description: line.description ?? '',
			article_code: line.article_code ?? '',
			account: line.account ?? '',
			unit: line.unit ?? '',
			quantity: (Number(line.quantity) ?? 0).toString(),
			unit_price: (Number(line.unit_price) ?? 0).toString(),
			discount: (Number(line.discount) ?? 0).toString(),
			vat_rate: (Number(line.vat_rate) ?? 0).toString(),
			vat_code: line.vat_code ?? '',
		});
	};

	const handleCancelLineEdit = () => {
		setEditingLineId(null);
		setLineState(null);
	};

	const handleSubmitLine = async () => {
		if (!editingLineId || !lineState || !selectedProject || !periodStart || !periodEnd) return;
		try {
			await updateLine.mutateAsync({
				projectId: selectedProject,
				lineId: editingLineId,
				periodStart,
				periodEnd,
				payload: {
					description: lineState.description,
					article_code: lineState.article_code,
					account: lineState.account,
					unit: lineState.unit,
					quantity: Number(lineState.quantity),
					unit_price: Number(lineState.unit_price),
					discount: Number(lineState.discount),
					vat_rate: Number(lineState.vat_rate),
					vat_code: lineState.vat_code,
				},
			});
			toast.success('Rad uppdaterad');
			handleCancelLineEdit();
		} catch (error: unknown) {
			toast.error((error as Error)?.message ?? 'Kunde inte uppdatera raden');
		}
	};

	const handleLock = async () => {
		if (!selectedProject || !periodStart || !periodEnd) return;
		try {
			await lockBasis.mutateAsync({
				projectId: selectedProject,
				periodStart,
				periodEnd,
				payload: {
					invoiceSeries: headerState.invoice_series || undefined,
					invoiceNumber: headerState.invoice_number || undefined,
					invoiceDate: headerState.invoice_date || undefined,
					paymentTermsDays: headerState.payment_terms_days ? Number(headerState.payment_terms_days) : undefined,
					currency: headerState.currency || undefined,
					reverse_charge_building: headerState.reverse_charge_building,
					rot_rut_flag: headerState.rot_rut_flag,
				},
			});
			toast.success('Fakturaunderlaget är låst');
		} catch (error: unknown) {
			toast.error((error as Error)?.message ?? 'Kunde inte låsa underlaget');
		}
	};

	const handleUnlock = async () => {
		if (!selectedProject || !periodStart || !periodEnd) return;
		if (!unlockReason || unlockReason.trim().length < 5) {
			toast.error('Ange en motivering (minst 5 tecken)');
			return;
		}
		try {
			await unlockBasis.mutateAsync({
				projectId: selectedProject,
				periodStart,
				periodEnd,
				reason: unlockReason,
			});
			toast.success('Fakturaunderlaget är upplåst');
			setUnlockReason('');
			setCurrentStep('preview');
		} catch (error: unknown) {
			toast.error((error as Error)?.message ?? 'Kunde inte låsa upp underlaget');
		}
	};

	const totals = invoiceBasis?.totals;

	const canFetch = selectedProjectIds.length > 0 && !!periodStart && !!periodEnd;

	// Fetch Fortnox export status when invoice_basis is locked
	// Also track if there's an old failed export that needs to be cleared
	const [hasOldFailedExport, setHasOldFailedExport] = useState(false);
	
	useEffect(() => {
		if (!invoiceBasis?.id || !invoiceBasis.locked) {
			setFortnoxStatus(null);
			setHasOldFailedExport(false);
			return;
		}

		const fetchFortnoxStatus = async () => {
			try {
				const response = await fetch(
					`/api/integrations/fortnox/invoice-links?invoiceBasisId=${invoiceBasis.id}`
				);
				if (response.ok) {
					const data = await response.json();
					if (data.data) {
						// Successful export - always show
						if (data.data.status === 'created' && data.data.fortnox_invoice_number) {
						setFortnoxStatus({
							fortnox_invoice_number: data.data.fortnox_invoice_number || null,
							status: data.data.status || null,
								error_message: null,
							});
							setHasOldFailedExport(false);
						} else if (data.data.status === 'failed') {
							// Check if error is recent (within last hour)
							const errorTime = data.data.updated_at || data.data.created_at;
							if (errorTime) {
								const errorDate = new Date(errorTime);
								const now = new Date();
								const hoursAgo = (now.getTime() - errorDate.getTime()) / (1000 * 60 * 60);
								
								// Show recent failures (less than 1 hour old)
								if (hoursAgo < 1) {
									setFortnoxStatus({
										fortnox_invoice_number: null,
										status: 'failed',
							error_message: data.data.error_message || null,
						});
									setHasOldFailedExport(false);
					} else {
									// Old failure - don't show error message, but allow clearing
									console.log('[InvoiceBasis] Old failed export detected (older than 1 hour)');
						setFortnoxStatus(null);
									setHasOldFailedExport(true);
								}
							} else {
								setFortnoxStatus(null);
								setHasOldFailedExport(false);
							}
						} else {
							setFortnoxStatus(null);
							setHasOldFailedExport(false);
						}
					} else {
						setFortnoxStatus(null);
						setHasOldFailedExport(false);
					}
				} else {
					setFortnoxStatus(null);
					setHasOldFailedExport(false);
				}
			} catch (error) {
				console.error('Failed to fetch Fortnox status:', error);
				setFortnoxStatus(null);
				setHasOldFailedExport(false);
			}
		};

		fetchFortnoxStatus();
	}, [invoiceBasis?.id, invoiceBasis?.locked]);

	// Handle Fortnox export
	// CRITICAL: This function MUST ONLY be called when user explicitly clicks the export button
	// It MUST NEVER be called automatically, in useEffect, or when state changes
	const handleExportToFortnox = async (event: React.MouseEvent<HTMLButtonElement>) => {
		// CRITICAL: Prevent any accidental form submission or auto-triggering
		event.preventDefault();
		event.stopPropagation();
		
		// Log who called this function - should ALWAYS be from button click
		console.log('[Fortnox Export] ==========================================');
		console.log('[Fortnox Export] handleExportToFortnox called');
		console.log('[Fortnox Export] Event type:', event?.type);
		console.log('[Fortnox Export] Event target:', event?.target);
		console.log('[Fortnox Export] Stack trace:', new Error().stack);
		console.log('[Fortnox Export] ==========================================');
		
		if (!invoiceBasis?.locked) {
			toast.error('Lås underlaget innan export');
			return;
		}

		// CRITICAL: Wait for customer number to be fetched
		if (!hasFetchedCustomerNumber) {
			console.error('[Fortnox Export] ERROR: Tried to export before customer number was fetched!');
			toast.error('Väntar på kundnummer... Försök igen om ett ögonblick.');
			return;
		}

		if (!customerFortnoxNumber || customerFortnoxNumber.trim().length === 0) {
			console.error('[Fortnox Export] ERROR: Customer number is empty after fetch');
			toast.error('Kunden saknar Fortnox kundnummer. Importera kunder från Fortnox först.');
			return;
		}

		console.log('[Fortnox Export] All checks passed, proceeding with export');

		setIsExportingToFortnox(true);
		try {
			const selectedProjectName = projects.find((p) => p.id === selectedProject)?.name;
			const params = new URLSearchParams({
				projectId: selectedProject,
				start: periodStart,
				end: periodEnd,
			});
			
			// Customer number is automatically fetched from customers table in API
			
			if (selectedProjectName) {
				params.append('projectName', selectedProjectName);
			}

			const response = await fetch(`/api/integrations/fortnox/export-invoice?${params.toString()}`, {
				method: 'POST',
			});

			// Read response text first (can only be read once)
			const responseText = await response.text();

			if (!response.ok) {
				// For error responses, try to extract error message
				let errorMessage = `Kunde inte exportera till Fortnox (${response.status})`;
				let errorDetails: string | null = null;
				let data: any = null;
				
				// Try to parse as JSON if response text exists
				if (responseText && responseText.trim()) {
					try {
						data = JSON.parse(responseText);
					} catch (jsonError) {
						// If not JSON, use text response as error message
						const rawError = responseText.length > 200 
							? `${responseText.substring(0, 200)}...`
							: responseText;
						errorMessage = rawError || `Kunde inte exportera till Fortnox: ${response.status} ${response.statusText}`;
						console.error('[Fortnox Export] Non-JSON error response:', {
							status: response.status,
							statusText: response.statusText,
							text: rawError,
						});
						throw new Error(errorMessage);
					}
					
					// Extract error message from various possible locations in Fortnox error response
					// Priority: data.error (from our API) > ErrorInformation.message (from Fortnox) > other fields
					const extractedMessage = 
						(typeof data === 'string' ? data : null) ||
						(data?.error && typeof data.error === 'string' ? data.error : null) ||
						(data?.ErrorInformation?.message && typeof data.ErrorInformation.message === 'string' ? data.ErrorInformation.message : null) ||
						(data?.message && typeof data.message === 'string' ? data.message : null) ||
						(data?.ErrorInformation?.code && typeof data.ErrorInformation.code === 'string' ? data.ErrorInformation.code : null);
					
					if (extractedMessage && extractedMessage.trim()) {
						errorMessage = extractedMessage.trim();
					}
					
					// Add error code if available
					if (data?.ErrorInformation?.code) {
						const code = typeof data.ErrorInformation.code === 'number' 
							? String(data.ErrorInformation.code) 
							: data.ErrorInformation.code;
						errorDetails = `Felkod: ${code}`;
					}
				} else {
					// Empty response text
					errorMessage = `Kunde inte exportera till Fortnox: ${response.status} ${response.statusText}`;
					console.error('[Fortnox Export] Empty error response:', {
						status: response.status,
						statusText: response.statusText,
					});
				}
				
				// Ensure errorMessage is never empty
				if (!errorMessage || !errorMessage.trim()) {
					errorMessage = `Kunde inte exportera till Fortnox: ${response.status} ${response.statusText}`;
				}
				
				// Provide actionable guidance based on common errors
				let guidance: string | null = null;
				if (errorMessage.includes('Felaktigt fältnamn')) {
					guidance = 'Ett eller flera fältnamn är felaktiga. Kontakta support om detta kvarstår.';
				} else if (errorMessage.includes('Kunde inte hitta konto') || errorMessage.includes('konto') || errorMessage.includes('Account')) {
					guidance = 'Kontot som används finns inte i Fortnox. Konto-fältet måste tas bort eller så måste kontot skapas i Fortnox.';
				} else if (errorMessage.includes('Customer') || errorMessage.includes('Kund')) {
					guidance = 'Kontrollera att Fortnox kundnummer är korrekt och att kunden finns i Fortnox.';
				} else if (errorMessage.includes('Artikel') || errorMessage.includes('Article')) {
					guidance = 'Artikelnumret refererar till en artikel som inte finns i Fortnox.';
				} else if (errorMessage.includes('Projekt') || errorMessage.includes('Project')) {
					guidance = 'Projektfältet måste referera till ett befintligt projekt i Fortnox.';
				} else if (errorMessage.includes('Värdet måste vara alfanumeriskt')) {
					guidance = 'Ett fältvärde innehåller ogiltiga tecken. Kontrollera projektnamnet.';
				}
				
				// Log detailed error information for debugging
				console.error('[Fortnox Export] Export failed:', {
					status: response.status,
					statusText: response.statusText,
					errorMessage,
					errorDetails,
					guidance,
					parsedData: data,
					responseTextPreview: responseText ? responseText.substring(0, 500) : '(empty)',
					hasData: !!data,
					dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
				});
				
				// Create detailed error with guidance
				const detailedError = guidance 
					? `${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}\n\n${guidance}`
					: errorMessage + (errorDetails ? ` (${errorDetails})` : '');
				
				throw new Error(detailedError);
			}
			
			// Success - parse JSON response from text
			let data: any = null;
			
			if (!responseText || !responseText.trim()) {
				console.error('[Fortnox Export] Empty success response');
				throw new Error('Kunde inte tolka svaret från Fortnox: tomt svar');
			}
			
			try {
				data = JSON.parse(responseText);
			} catch (jsonError) {
				console.error('[Fortnox Export] Failed to parse success response:', {
					jsonError,
					responseText: responseText.substring(0, 500),
				});
				throw new Error(`Kunde inte tolka svaret från Fortnox: ${jsonError instanceof Error ? jsonError.message : 'okänt fel'}`);
			}

			// Success - show detailed success message
			const successMessage = data.fortnoxInvoiceNumber 
				? `✅ Faktura ${data.fortnoxInvoiceNumber} skapad i Fortnox`
				: data.message || 'Faktura exporterad till Fortnox';
			
			toast.success(successMessage, {
				duration: 5000,
			});
			
			// Mark step as completed
			setCurrentStep('completed');
			
			// Refresh invoice basis to get billed_at timestamp
			if (invoiceBasis.id) {
				refetchBasis();
			}
			
			// Refresh Fortnox status
			if (invoiceBasis.id) {
				const statusResponse = await fetch(
					`/api/integrations/fortnox/invoice-links?invoiceBasisId=${invoiceBasis.id}`
				);
				if (statusResponse.ok) {
					const statusData = await statusResponse.json();
					if (statusData.data) {
						setFortnoxStatus({
							fortnox_invoice_number: statusData.data.fortnox_invoice_number || null,
							status: statusData.data.status || null,
							error_message: statusData.data.error_message || null,
						});
					}
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Kunde inte exportera till Fortnox';
			console.error('[Fortnox Export] Error:', error);
			
			// Split error message into title and description if it contains guidance
			const parts = errorMessage.split('\n\n');
			const title = parts[0] || errorMessage;
			const description = parts[1] || 'Kontrollera felmeddelandet ovan för mer information.';
			
			// Show detailed error message with guidance
			toast.error(`❌ Export misslyckades: ${title}`, {
				duration: 10000,
				description: description,
			});
			
			// Update Fortnox status with error for UI display
			if (invoiceBasis?.id) {
				try {
					const statusResponse = await fetch(
						`/api/integrations/fortnox/invoice-links?invoiceBasisId=${invoiceBasis.id}`
					);
					if (statusResponse.ok) {
						const statusData = await statusResponse.json();
						if (statusData.data) {
							setFortnoxStatus({
								fortnox_invoice_number: statusData.data.fortnox_invoice_number || null,
								status: 'failed',
								error_message: title,
							});
						}
					}
				} catch (statusError) {
					console.error('[Fortnox Export] Failed to update status:', statusError);
				}
			}
		} finally {
			setIsExportingToFortnox(false);
		}
	};

	// När ett projekt väljs (single-select) – sätt perioden till alla relevanta rader
	useEffect(() => {
		if (selectedProjectIds.length !== 1) return;

		const projectId = selectedProjectIds[0];
		if (!projectId) return;

		// Hämta datumintervall för relevanta rader
		const fetchRange = async () => {
			setIsFetchingDateRange(true);
			try {
				const params = new URLSearchParams({ projectId });
				const res = await fetch(`/api/invoice/project-date-range?${params.toString()}`, {
					headers: { 'Content-Type': 'application/json' },
				});

				if (!res.ok) {
					const message = await res.text().catch(() => '');
					console.error('project-date-range error', res.status, message);
					toast.error('Kunde inte hämta period automatiskt.', {
						description: 'Välj period manuellt för den här gången.',
					});
					return;
				}

				const data = await res.json();

				if (!data?.hasData || !data.from || !data.to) {
					toast.info('Inga godkända rader hittades för valt projekt ännu.', {
						description:
							'Välj period manuellt – när det finns godkända rader föreslår vi ett intervall automatiskt.',
					});
					return;
				}

				setPeriodStart(data.from);
				setPeriodEnd(data.to);

				toast.info('Vi har satt perioden automatiskt efter alla relevanta rader för projektet.', {
					description: `${data.from} till ${data.to}`,
				});
			} catch (error) {
				console.error('Failed to fetch project date range', error);
				toast.error('Kunde inte hämta period automatiskt.', {
					description: 'Kontrollera din uppkoppling och försök igen.',
				});
			} finally {
				setIsFetchingDateRange(false);
			}
		};

		void fetchRange();
	}, [selectedProjectIds.join(',')]);

	return (
		<div className='flex h-full flex-col bg-background dark:bg-black'>
			{/* Step Indicator */}
			<InvoiceStepIndicator currentStep={currentStep === 'select' ? 'select' : currentStep === 'approvals' ? 'approvals' : currentStep === 'preview' ? 'preview' : currentStep === 'completed' ? 'completed' : 'lock'} />

			{/* Landing / welcome section */}
			<InvoiceLanding role={roleForLanding} />

			{/* Step 1: Project & Period Filter */}
			<section
				id='invoice-step-1'
				className='mx-auto mb-8 mt-4 w-full max-w-5xl px-4 md:mt-2 md:px-6'
			>
				<InvoiceProjectFilter
					projects={projects}
					selectedProjectIds={selectedProjectIds}
					onProjectIdsChange={setSelectedProjectIds}
					periodStart={periodStart}
					onPeriodStartChange={setPeriodStart}
					periodEnd={periodEnd}
					onPeriodEndChange={setPeriodEnd}
					onFetchBasis={handleFetchBasis}
					isLoading={isLoadingGrouped}
					canFetch={canFetch}
					isFetchingDateRange={isFetchingDateRange}
				/>
			</section>

			<main className='mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pb-6 md:px-8'>
				{/* Step 2: Pending Approvals */}
				{currentStep === 'approvals' && hasFetchedBasis && (
					<InvoicePendingApprovals
						projectIds={selectedProjectIds}
						from={periodStart}
						to={periodEnd}
						canApprove={canApprove}
						onApprovalsComplete={handleApprovalsComplete}
					/>
				)}

				{/* Step 3: Invoice Preview */}
				{currentStep === 'preview' && (
					<>
						{isLoadingBasis || isFetchingBasis ? (
							<Card className='border-dashed'>
								<CardContent className='flex flex-col items-center justify-center py-12 text-center'>
									<div className='mb-4 rounded-full bg-muted p-4'>
										<RefreshCw className='h-8 w-8 animate-spin text-muted-foreground' />
									</div>
									<h3 className='mb-2 text-lg font-semibold text-foreground'>Hämtar fakturaunderlag</h3>
									<p className='max-w-md text-sm text-muted-foreground'>
										Samlar ihop alla godkända poster för den valda perioden...
									</p>
								</CardContent>
							</Card>
						) : invoiceBasis && hasInvoiceLines ? (
							<>
								{/* Quick Actions */}
								<div className='flex flex-wrap items-center justify-end gap-3'>
									<Button
										variant='outline'
										onClick={() => {
											setCurrentStep('approvals');
											refetchGrouped();
										}}
									>
										<CheckCircle2 className='mr-2 h-4 w-4' />
										Öppna godkännanden
									</Button>
								</div>

								{/* Customer Information Section */}
								{(invoiceBasis.customer_snapshot || invoiceBasis.invoice_address_json) && (() => {
									const customerName = (() => {
										if (
											invoiceBasis.customer_snapshot &&
											typeof invoiceBasis.customer_snapshot === 'object' &&
											invoiceBasis.customer_snapshot !== null
										) {
											const snap = invoiceBasis.customer_snapshot as {
												name?: string;
												company_name?: string;
												first_name?: string;
												last_name?: string;
											};
											const fromSnapshot =
												snap.name ||
												snap.company_name ||
												[snap.first_name, snap.last_name].filter(Boolean).join(' ');
											if (fromSnapshot) return fromSnapshot;
										}

										if (
											invoiceBasis.invoice_address_json &&
											typeof invoiceBasis.invoice_address_json === 'object'
										) {
											const addr = invoiceBasis.invoice_address_json as { name?: string };
											if (addr.name) return addr.name;
										}

										return 'Ingen kund kopplad';
									})();

									return (
										<Card>
											<Collapsible defaultOpen={false}>
												<CollapsibleTrigger asChild>
													<CardHeader className='cursor-pointer hover:bg-muted/50 transition-colors'>
														<div className='flex items-center justify-between'>
															<CardTitle className='text-lg'>Kundinformation</CardTitle>
															<div className='flex items-center gap-2'>
																<span className='text-sm font-medium text-muted-foreground'>{customerName}</span>
																<ChevronDown className='h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180' />
															</div>
														</div>
													</CardHeader>
												</CollapsibleTrigger>
												<CollapsibleContent>
													<CardContent>
											<div className='grid gap-4 md:grid-cols-2'>
												<div className='space-y-3'>
													<div>
														<label className='text-sm font-semibold text-muted-foreground'>Kundnamn</label>
														<p className='text-base font-medium'>{customerName}</p>
													</div>
													{(() => {
														const orgNoFromSnapshot = invoiceBasis.customer_snapshot && typeof invoiceBasis.customer_snapshot === 'object' && invoiceBasis.customer_snapshot !== null
															? (invoiceBasis.customer_snapshot as { org_no?: string }).org_no
															: null;
														const orgNoFromAddress = invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object'
															? (invoiceBasis.invoice_address_json as { org_no?: string }).org_no
															: null;
														const orgNo = orgNoFromSnapshot || orgNoFromAddress;
														return orgNo ? (
															<div>
																<label className='text-sm font-semibold text-muted-foreground'>Organisationsnummer</label>
																<p className='text-base'>{orgNo}</p>
															</div>
														) : null;
													})()}
													{invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object' && (
														<div>
															<label className='text-sm font-semibold text-muted-foreground'>Fakturaadress</label>
															<div className='text-base'>
																{(invoiceBasis.invoice_address_json as { street?: string }).street && <p>{(invoiceBasis.invoice_address_json as { street?: string }).street}</p>}
																{(invoiceBasis.invoice_address_json as { zip?: string; city?: string }).zip && (invoiceBasis.invoice_address_json as { zip?: string; city?: string }).city && (
																	<p>
																		{(invoiceBasis.invoice_address_json as { zip?: string; city?: string }).zip} {(invoiceBasis.invoice_address_json as { zip?: string; city?: string }).city}
																	</p>
																)}
																{(invoiceBasis.invoice_address_json as { country?: string }).country && (
																	<p>{(invoiceBasis.invoice_address_json as { country?: string }).country}</p>
																)}
															</div>
														</div>
													)}
												</div>
												<div className='space-y-3'>
													{invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object' && (invoiceBasis.invoice_address_json as { email?: string }).email && (
														<div>
															<label className='text-sm font-semibold text-muted-foreground'>E-post</label>
															<p className='text-base'>
																{(invoiceBasis.invoice_address_json as { email?: string }).email}
															</p>
														</div>
													)}
													{invoiceBasis.invoice_address_json && typeof invoiceBasis.invoice_address_json === 'object' && (invoiceBasis.invoice_address_json as { phone?: string }).phone && (
														<div>
															<label className='text-sm font-semibold text-muted-foreground'>Telefon</label>
															<p className='text-base'>
																{(invoiceBasis.invoice_address_json as { phone?: string }).phone}
															</p>
														</div>
													)}
													{invoiceBasis.delivery_address_json && typeof invoiceBasis.delivery_address_json === 'object' && (
														<div>
															<label className='text-sm font-semibold text-muted-foreground'>Leveransadress</label>
															<div className='text-base'>
																{(invoiceBasis.delivery_address_json as { street?: string }).street && <p>{(invoiceBasis.delivery_address_json as { street?: string }).street}</p>}
																{(invoiceBasis.delivery_address_json as { zip?: string; city?: string }).zip && (invoiceBasis.delivery_address_json as { zip?: string; city?: string }).city && (
																	<p>
																		{(invoiceBasis.delivery_address_json as { zip?: string; city?: string }).zip} {(invoiceBasis.delivery_address_json as { zip?: string; city?: string }).city}
																	</p>
																)}
																{(invoiceBasis.delivery_address_json as { country?: string }).country && (
																	<p>{(invoiceBasis.delivery_address_json as { country?: string }).country}</p>
																)}
															</div>
														</div>
													)}
												</div>
											</div>
													</CardContent>
												</CollapsibleContent>
											</Collapsible>
										</Card>
									);
								})()}

								{/* Fakturainfo Card */}
								<Card>
									<CardHeader className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
										<CardTitle>Fakturainfo</CardTitle>
										<div className='flex flex-wrap gap-3'>
											{invoiceBasis.billed_at ? (
												<span className='rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-200'>
													Fakturerat {format(new Date(invoiceBasis.billed_at), 'PPPp', { locale: sv })}
												</span>
											) : invoiceBasis.locked ? (
												<span className='rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200'>
													Låst {invoiceBasis.locked_at ? format(new Date(invoiceBasis.locked_at), 'PPPp', { locale: sv }) : ''}
												</span>
											) : (
												<span className='rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-600 dark:bg-amber-500/20 dark:text-amber-200'>
													Utkast (kan redigeras)
												</span>
											)}
										</div>
									</CardHeader>
									<CardContent className='space-y-6'>
										<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Serie</label>
												<Input
													placeholder='Ex. A'
													value={headerState.invoice_series}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, invoice_series: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Fakturanummer</label>
												<Input
													placeholder='Ex. A-2025-001'
													value={headerState.invoice_number}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, invoice_number: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Fakturadatum</label>
												<Input
													type='date'
													value={headerState.invoice_date}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, invoice_date: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Förfallodatum</label>
												<Input
													type='date'
													value={headerState.due_date}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, due_date: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Betalvillkor (dagar)</label>
												<Input
													type='number'
													value={headerState.payment_terms_days}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, payment_terms_days: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Vår referens</label>
												<Input
													value={headerState.our_ref}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, our_ref: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Er referens</label>
												<Input
													value={headerState.your_ref}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, your_ref: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Valuta</label>
												<Input
													value={headerState.currency}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, currency: event.target.value.toUpperCase() }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Kostnadsställe</label>
												<Input
													value={headerState.cost_center}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, cost_center: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='space-y-2'>
												<label className='text-sm font-medium text-muted-foreground'>Resultatenhet</label>
												<Input
													value={headerState.result_unit}
													onChange={(event) =>
														setHeaderState((state) => ({ ...state, result_unit: event.target.value }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='flex items-center justify-between rounded-md border border-border/50 bg-muted/40 px-3 py-2'>
												<span className='text-sm font-medium text-muted-foreground'>Omvänd byggmoms</span>
												<Switch
													checked={headerState.reverse_charge_building}
													onCheckedChange={(checked) =>
														setHeaderState((state) => ({ ...state, reverse_charge_building: checked }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
											<div className='flex items-center justify-between rounded-md border border-border/50 bg-muted/40 px-3 py-2'>
												<span className='text-sm font-medium text-muted-foreground'>ROT/RUT flagga</span>
												<Switch
													checked={headerState.rot_rut_flag}
													onCheckedChange={(checked) =>
														setHeaderState((state) => ({ ...state, rot_rut_flag: checked }))
													}
													disabled={invoiceBasis.locked || updateHeader.isPending || !canEdit}
												/>
											</div>
										</div>
										{canEdit && (
											<div className='flex flex-wrap gap-3'>
												<Button onClick={handleHeaderSubmit} disabled={invoiceBasis.locked || updateHeader.isPending}>
													Spara uppgifter
												</Button>
												<Button
													variant='outline'
													onClick={() => {
														if (!invoiceBasis) return;
														setHeaderState({
															invoice_series: invoiceBasis.invoice_series ?? '',
															invoice_number: invoiceBasis.invoice_number ?? '',
															invoice_date: invoiceBasis.invoice_date ?? '',
															due_date: invoiceBasis.due_date ?? '',
															payment_terms_days: invoiceBasis.payment_terms_days?.toString() ?? '',
															our_ref: invoiceBasis.our_ref ?? '',
															your_ref: invoiceBasis.your_ref ?? '',
															currency: invoiceBasis.currency ?? 'SEK',
															reverse_charge_building: invoiceBasis.reverse_charge_building,
															rot_rut_flag: invoiceBasis.rot_rut_flag,
															cost_center: invoiceBasis.cost_center ?? '',
															result_unit: invoiceBasis.result_unit ?? '',
														});
													}}
													disabled={updateHeader.isPending}
												>
													Återställ
												</Button>
											</div>
										)}
									</CardContent>
								</Card>

								{/* Line Items Card */}
								<Card>
									<CardHeader>
										<CardTitle>Radlista</CardTitle>
									</CardHeader>
									<CardContent className='space-y-6'>
										{/* Tidblock Section */}
										{timeLines.length > 0 && (
											<div className='space-y-3'>
												<h3 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>Tidblock</h3>
												<div className='overflow-hidden rounded-lg border border-border/60'>
													<table className='w-full table-fixed divide-y divide-border/60'>
														<thead className='bg-muted/60'>
															<tr className='text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
																<th className='w-28 px-3 py-3'>Datum</th>
																<th className='w-36 px-3 py-3'>Person</th>
																<th className='px-3 py-3'>Dagbok</th>
																<th className='w-24 px-3 py-3 text-right'>Timmar</th>
																<th className='w-36 px-3 py-3 text-right'>Summa ex moms</th>
																{canEdit && <th className='w-24 px-3 py-3'></th>}
															</tr>
														</thead>
														<tbody className='divide-y divide-border/60 bg-background'>
															{timeLines.map((line) => {
																const isEditing = line.id === editingLineId;
																const { amountExVat, amountIncVat } = (() => {
																	const quantity = Number(line.quantity) || 0;
																	const unitPrice = Number(line.unit_price) || 0;
																	const discount = Number(line.discount) || 0;
																	const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
																	const ex = quantity * unitPrice * discountFactor;
																	const vatRate = Number(line.vat_rate) || 0;
																	const vat = ex * (vatRate / 100);
																	return {
																		amountExVat: Math.round(ex * 100) / 100,
																		amountIncVat: Math.round((ex + vat) * 100) / 100,
																	};
																})();
																return (
																	<tr key={line.id} className='align-top text-sm'>
																		<td className='px-3 py-3'>
																			{line.date ? new Date(line.date + 'T00:00:00').toLocaleDateString('sv-SE') : '–'}
																		</td>
																		<td className='px-3 py-3 whitespace-nowrap'>{line.person || '–'}</td>
																		<td className='px-3 py-3'>
																			<div className='line-clamp-3 text-xs text-muted-foreground'>{line.diary || '–'}</div>
																		</td>
																		<td className='px-3 py-3 text-right'>
																			{isEditing && lineState ? (
																				<Input
																					type='number'
																					value={lineState.quantity}
																					onChange={(event) =>
																						setLineState((state) =>
																							state ? { ...state, quantity: event.target.value } : state
																						)
																					}
																					className='h-9'
																					disabled={!canEdit}
																				/>
																			) : (
																				Number(line.quantity ?? 0).toLocaleString('sv-SE', {
																					minimumFractionDigits: 0,
																					maximumFractionDigits: 2,
																				})
																			)}
																		</td>
																		<td className='px-3 py-3 text-right whitespace-nowrap'>{amountExVat.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
																		{canEdit && (
																			<td className='px-3 py-3 text-right'>
																				{isEditing ? (
																					<div className='flex justify-end gap-2'>
																						<Button size='sm' onClick={handleSubmitLine} disabled={updateLine.isPending || invoiceBasis.locked}>
																							Spara
																						</Button>
																						<Button size='sm' variant='ghost' onClick={handleCancelLineEdit}>
																							Avbryt
																						</Button>
												</div>
																				) : (
																					<Button
																						size='sm'
																						variant='outline'
																						onClick={() => handleEditLine(line)}
																						disabled={invoiceBasis.locked}
																					>
																						Redigera
																					</Button>
																				)}
																			</td>
																		)}
																	</tr>
																);
															})}
														</tbody>
														<tfoot className='bg-muted/60 border-t-2 border-border'>
															<tr className='text-left text-sm font-semibold'>
																<td className='px-3 py-3' colSpan={3}>
																	Summa
																</td>
																<td className='px-3 py-3 text-right'>
																	{totalHours.toLocaleString('sv-SE', {
																		minimumFractionDigits: 0,
																		maximumFractionDigits: 2,
																	})}
																</td>
																<td className='px-3 py-3 text-right font-semibold whitespace-nowrap'>
																	{totalTimeAmount.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
																</td>
																{canEdit && <td className='px-3 py-3'></td>}
															</tr>
														</tfoot>
													</table>
											</div>
												</div>
										)}

										{/* Material Section */}
										{materialLines.length > 0 && (
											<div className='space-y-3'>
												<h3 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>Material</h3>
										<div className='overflow-hidden rounded-lg border border-border/60'>
											<table className='w-full table-fixed divide-y divide-border/60'>
												<thead className='bg-muted/60'>
													<tr className='text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
														<th className='w-28 px-3 py-3'>Datum</th>
														<th className='px-3 py-3'>Beskrivning</th>
														<th className='w-24 px-3 py-3 text-right'>Antal</th>
														<th className='w-20 px-3 py-3'>Enhet</th>
														<th className='w-36 px-3 py-3 text-right'>Summa ex moms</th>
														{canEdit && <th className='w-24 px-3 py-3'></th>}
													</tr>
												</thead>
												<tbody className='divide-y divide-border/60 bg-background'>
															{materialLines.map((line) => {
																const isEditing = line.id === editingLineId;
																const { amountExVat, amountIncVat } = (() => {
																	const quantity = Number(line.quantity) || 0;
																	const unitPrice = Number(line.unit_price) || 0;
																	const discount = Number(line.discount) || 0;
																	const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
																	const ex = quantity * unitPrice * discountFactor;
																	const vatRate = Number(line.vat_rate) || 0;
																	const vat = ex * (vatRate / 100);
																	return {
																		amountExVat: Math.round(ex * 100) / 100,
																		amountIncVat: Math.round((ex + vat) * 100) / 100,
																	};
																})();
																return (
																	<tr key={line.id} className='align-top text-sm'>
																		<td className='px-3 py-3'>
																			{line.date ? new Date(line.date + 'T00:00:00').toLocaleDateString('sv-SE') : '–'}
																		</td>
																		<td className='px-3 py-3'>
																			{isEditing && lineState ? (
																				<Input
																					value={lineState.description}
																					onChange={(event) =>
																						setLineState((state) =>
																							state ? { ...state, description: event.target.value } : state
																						)
																					}
																					className='h-9'
																					disabled={!canEdit}
																				/>
																			) : (
																				<div className='space-y-1'>
																					{line.source?.table === 'ata' && line.ata_info && (
																						<div className='flex items-center gap-2'>
																							<span className='inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'>
																								ÄTA: {line.ata_info.ata_number ? `ÄTA ${line.ata_info.ata_number}` : line.ata_info.title}
																</span>
															</div>
														)}
																					<div>{line.description || '–'}</div>
															</div>
														)}
																		</td>
																		<td className='px-3 py-3 text-right'>
																			{isEditing && lineState ? (
																				<Input
																					type='number'
																					value={lineState.quantity}
																					onChange={(event) =>
																						setLineState((state) =>
																							state ? { ...state, quantity: event.target.value } : state
																						)
																					}
																					className='h-9'
																					disabled={!canEdit}
																				/>
																			) : (
																				Number(line.quantity ?? 0).toLocaleString('sv-SE', {
																					minimumFractionDigits: 0,
																		maximumFractionDigits: 2,
																				})
																			)}
																		</td>
																		<td className='px-3 py-3 whitespace-nowrap'>{line.unit || '–'}</td>
																		<td className='px-3 py-3 text-right whitespace-nowrap'>{amountExVat.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
																		{canEdit && (
																			<td className='px-3 py-3 text-right'>
																				{isEditing ? (
																					<div className='flex justify-end gap-2'>
																						<Button size='sm' onClick={handleSubmitLine} disabled={updateLine.isPending || invoiceBasis.locked}>
																							Spara
																						</Button>
																						<Button size='sm' variant='ghost' onClick={handleCancelLineEdit}>
																							Avbryt
																						</Button>
															</div>
																				) : (
																					<Button
																						size='sm'
																						variant='outline'
																						onClick={() => handleEditLine(line)}
																						disabled={invoiceBasis.locked}
																					>
																						Redigera
																					</Button>
																				)}
																			</td>
																		)}
																	</tr>
																);
															})}
												</tbody>
												<tfoot className='bg-muted/60 border-t-2 border-border'>
													<tr className='text-left text-sm font-semibold'>
														<td className='px-3 py-3'></td>
														<td className='px-3 py-3'>
															Summa
														</td>
														<td className='px-3 py-3 text-right'>
															{totalMaterialQuantity.toLocaleString('sv-SE', {
																minimumFractionDigits: 0,
																maximumFractionDigits: 2,
															})}
														</td>
														<td className='px-3 py-3'></td>
														<td className='px-3 py-3 text-right font-semibold whitespace-nowrap'>
															{totalMaterialAmount.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
														</td>
														{canEdit && <td className='px-3 py-3'></td>}
													</tr>
												</tfoot>
											</table>
													</div>
												</div>
											)}

										{/* Utlägg Section */}
										{expenseLines.length > 0 && (
											<div className='space-y-3'>
												<h3 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>Utlägg</h3>
										<div className='overflow-hidden rounded-lg border border-border/60'>
											<table className='min-w-full divide-y divide-border/60'>
												<thead className='bg-muted/60'>
													<tr className='text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
														<th className='px-3 py-3'>Typ</th>
														<th className='px-3 py-3'>Artikel</th>
														<th className='px-3 py-3'>Beskrivning</th>
														<th className='px-3 py-3'>Antal</th>
														<th className='px-3 py-3'>Enhet</th>
														<th className='px-3 py-3'>À-pris</th>
														<th className='px-3 py-3'>Rabatt %</th>
														<th className='px-3 py-3'>Moms %</th>
														<th className='px-3 py-3'>Konto</th>
														<th className='px-3 py-3 text-right'>Summa ex moms</th>
														<th className='px-3 py-3 text-right'>Summa inkl moms</th>
														{canEdit && <th className='px-3 py-3'></th>}
													</tr>
												</thead>
												<tbody className='divide-y divide-border/60 bg-background'>
															{expenseLines.map((line) => {
														const isEditing = line.id === editingLineId;
														const { amountExVat, amountIncVat } = (() => {
															const quantity = Number(line.quantity) || 0;
															const unitPrice = Number(line.unit_price) || 0;
															const discount = Number(line.discount) || 0;
															const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
															const ex = quantity * unitPrice * discountFactor;
															const vatRate = Number(line.vat_rate) || 0;
															const vat = ex * (vatRate / 100);
															return {
																amountExVat: Math.round(ex * 100) / 100,
																amountIncVat: Math.round((ex + vat) * 100) / 100,
															};
														})();
														return (
															<tr key={line.id} className='align-top text-sm'>
																<td className='px-3 py-3 font-medium capitalize'>{line.type}</td>
																<td className='px-3 py-3'>
																	{isEditing && lineState ? (
																		<Input
																			value={lineState.article_code}
																			onChange={(event) =>
																				setLineState((state) =>
																					state
																						? { ...state, article_code: event.target.value }
																						: state
																				)
																			}
																			className='h-9'
																			disabled={!canEdit}
																		/>
																	) : (
																		line.article_code || '–'
																	)}
																</td>
																<td className='px-3 py-3'>
																	{isEditing && lineState ? (
																		<Input
																			value={lineState.description}
																			onChange={(event) =>
																				setLineState((state) =>
																					state ? { ...state, description: event.target.value } : state
																				)
																			}
																			className='h-9'
																			disabled={!canEdit}
																		/>
																	) : (
																		<div className='space-y-1'>
																			{line.source?.table === 'ata' && line.ata_info && (
																				<div className='flex items-center gap-2'>
																					<span className='inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'>
																						ÄTA: {line.ata_info.ata_number ? `ÄTA ${line.ata_info.ata_number}` : line.ata_info.title}
																					</span>
																				</div>
																			)}
																			<div>{line.description || '–'}</div>
																		</div>
																	)}
																</td>
																<td className='px-3 py-3'>
																	{isEditing && lineState ? (
																		<Input
																			type='number'
																			value={lineState.quantity}
																			onChange={(event) =>
																				setLineState((state) =>
																					state ? { ...state, quantity: event.target.value } : state
																				)
																			}
																			className='h-9'
																			disabled={!canEdit}
																		/>
																	) : (
																		Number(line.quantity ?? 0).toLocaleString('sv-SE', {
																			minimumFractionDigits: 0,
																			maximumFractionDigits: 2,
																		})
																	)}
																</td>
																<td className='px-3 py-3'>
																	{isEditing && lineState ? (
																		<Input
																			value={lineState.unit}
																			onChange={(event) =>
																				setLineState((state) =>
																					state ? { ...state, unit: event.target.value } : state
																				)
																			}
																			className='h-9'
																			disabled={!canEdit}
																		/>
																	) : (
																		line.unit || '–'
																	)}
																</td>
																<td className='px-3 py-3'>
																	{isEditing && lineState ? (
																		<Input
																			type='number'
																			value={lineState.unit_price}
																			onChange={(event) =>
																				setLineState((state) =>
																					state ? { ...state, unit_price: event.target.value } : state
																				)
																			}
																			className='h-9'
																			disabled={!canEdit}
																		/>
																	) : (
																		`${Number(line.unit_price ?? 0).toLocaleString('sv-SE', {
																			minimumFractionDigits: 2,
																			maximumFractionDigits: 2,
																		})} kr`
																	)}
																</td>
																		<td className='px-3 py-3 text-right'>{amountExVat.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
																		{canEdit && (
																			<td className='px-3 py-3 text-right'>
																				{isEditing ? (
																					<div className='flex justify-end gap-2'>
																						<Button size='sm' onClick={handleSubmitLine} disabled={updateLine.isPending || invoiceBasis.locked}>
																							Spara
																						</Button>
																						<Button size='sm' variant='ghost' onClick={handleCancelLineEdit}>
																							Avbryt
																						</Button>
																					</div>
																				) : (
																					<Button
																						size='sm'
																						variant='outline'
																						onClick={() => handleEditLine(line)}
																						disabled={invoiceBasis.locked}
																					>
																						Redigera
																					</Button>
																				)}
																			</td>
																		)}
																	</tr>
																);
															})}
														</tbody>
													</table>
												</div>
											</div>
										)}

										{/* Other Lines (ATA, Mileage, etc.) */}
										{otherLines.length > 0 && (
											<div className='space-y-3'>
												<h3 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>Övrigt</h3>
												<div className='overflow-hidden rounded-lg border border-border/60'>
													<table className='w-full table-fixed divide-y divide-border/60'>
														<thead className='bg-muted/60'>
															<tr className='text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
																<th className='w-28 px-3 py-3'>Datum</th>
																<th className='px-3 py-3'>Beskrivning</th>
																<th className='w-24 px-3 py-3 text-right'>Antal</th>
																<th className='w-20 px-3 py-3'>Enhet</th>
																<th className='w-36 px-3 py-3 text-right'>Summa ex moms</th>
																{canEdit && <th className='w-24 px-3 py-3'></th>}
															</tr>
														</thead>
														<tbody className='divide-y divide-border/60 bg-background'>
															{otherLines.map((line) => {
														const isEditing = line.id === editingLineId;
														const { amountExVat, amountIncVat } = (() => {
															const quantity = Number(line.quantity) || 0;
															const unitPrice = Number(line.unit_price) || 0;
															const discount = Number(line.discount) || 0;
															const discountFactor = discount > 0 ? 1 - discount / 100 : 1;
															const ex = quantity * unitPrice * discountFactor;
															const vatRate = Number(line.vat_rate) || 0;
															const vat = ex * (vatRate / 100);
															return {
																amountExVat: Math.round(ex * 100) / 100,
																amountIncVat: Math.round((ex + vat) * 100) / 100,
															};
														})();
														return (
															<tr key={line.id} className='align-top text-sm'>
																<td className='px-3 py-3'>
																	{line.date ? new Date(line.date + 'T00:00:00').toLocaleDateString('sv-SE') : '–'}
																</td>
																<td className='px-3 py-3'>
																	{isEditing && lineState ? (
																		<Input
																			value={lineState.description}
																			onChange={(event) =>
																				setLineState((state) =>
																					state ? { ...state, description: event.target.value } : state
																				)
																			}
																			className='h-9'
																			disabled={!canEdit}
																		/>
																	) : (
																		<div className='space-y-1'>
																			{line.source?.table === 'ata' && line.ata_info && (
																				<div className='flex items-center gap-2'>
																					<span className='inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'>
																						ÄTA: {line.ata_info.ata_number ? `ÄTA ${line.ata_info.ata_number}` : line.ata_info.title}
																					</span>
																				</div>
																			)}
																			<div>{line.description || '–'}</div>
																		</div>
																	)}
																</td>
																<td className='px-3 py-3 text-right'>
																	{isEditing && lineState ? (
																		<Input
																			type='number'
																			value={lineState.quantity}
																			onChange={(event) =>
																				setLineState((state) =>
																					state ? { ...state, quantity: event.target.value } : state
																				)
																			}
																			className='h-9'
																			disabled={!canEdit}
																		/>
																	) : (
																		Number(line.quantity ?? 0).toLocaleString('sv-SE', {
																			minimumFractionDigits: 0,
																			maximumFractionDigits: 2,
																		})
																	)}
																</td>
																<td className='px-3 py-3 whitespace-nowrap'>{line.unit || '–'}</td>
																<td className='px-3 py-3 text-right whitespace-nowrap'>{amountExVat.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr</td>
																{canEdit && (
																	<td className='px-3 py-3 text-right'>
																		{isEditing ? (
																			<div className='flex justify-end gap-2'>
																				<Button size='sm' onClick={handleSubmitLine} disabled={updateLine.isPending || invoiceBasis.locked}>
																					Spara
																				</Button>
																				<Button size='sm' variant='ghost' onClick={handleCancelLineEdit}>
																					Avbryt
																				</Button>
																			</div>
																		) : (
																			<Button
																				size='sm'
																				variant='outline'
																				onClick={() => handleEditLine(line)}
																				disabled={invoiceBasis.locked}
																			>
																				Redigera
																			</Button>
																		)}
																	</td>
																)}
															</tr>
														);
													})}
												</tbody>
												<tfoot className='bg-muted/60 border-t-2 border-border'>
													<tr className='text-left text-sm font-semibold'>
														<td className='px-3 py-3'></td>
														<td className='px-3 py-3'>
															Summa
														</td>
														<td className='px-3 py-3 text-right'>
															{totalOtherQuantity.toLocaleString('sv-SE', {
																minimumFractionDigits: 0,
																maximumFractionDigits: 2,
															})}
														</td>
														<td className='px-3 py-3'></td>
														<td className='px-3 py-3 text-right font-semibold whitespace-nowrap'>
															{totalOtherAmount.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
														</td>
														{canEdit && <td className='px-3 py-3'></td>}
													</tr>
												</tfoot>
											</table>
										</div>
									</div>
								)}
							</CardContent>
								</Card>

								{/* Totals Card */}
								<Card>
									<CardHeader>
										<CardTitle>Summeringar</CardTitle>
									</CardHeader>
									<CardContent className='space-y-6'>
										{/* Totals grid */}
										<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
											<div className='rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4'>
												<div className='text-xs uppercase text-emerald-600 dark:text-emerald-300'>Netto exkl. moms</div>
												<div className='text-2xl font-semibold text-foreground'>
													{totals?.total_ex_vat?.toLocaleString('sv-SE', { minimumFractionDigits: 2 }) ?? '0,00'} kr
												</div>
																	</div>
											<div className='rounded-lg border border-amber-500/30 bg-amber-500/5 p-4'>
												<div className='text-xs uppercase text-amber-600 dark:text-amber-300'>Moms</div>
												<div className='text-2xl font-semibold text-foreground'>
													{totals?.total_vat?.toLocaleString('sv-SE', { minimumFractionDigits: 2 }) ?? '0,00'} kr
																</div>
															</div>
											<div className='rounded-lg border border-blue-500/30 bg-blue-500/5 p-4'>
												<div className='text-xs uppercase text-blue-600 dark:text-blue-300'>Totalt</div>
												<div className='text-2xl font-semibold text-foreground'>
													{totals?.total_inc_vat?.toLocaleString('sv-SE', { minimumFractionDigits: 2 }) ?? '0,00'} kr
												</div>
											</div>
											{totals?.per_vat_rate &&
												Object.entries(totals.per_vat_rate).map(([rate, values]) => (
													<div key={rate} className='rounded-lg border border-border/60 bg-muted/40 p-4'>
														<div className='text-xs uppercase text-muted-foreground'>Moms {rate}%</div>
														<div className='text-sm text-muted-foreground'>
															Exkl: {values.base.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
														</div>
														<div className='text-sm text-muted-foreground'>
															Moms: {values.vat.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
														</div>
														<div className='text-sm text-muted-foreground'>
															Inkl: {values.total.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
														</div>
													</div>
												))}
										</div>
									</CardContent>
								</Card>

								{/* Lock & Export Card */}
								<Card>
									<CardHeader>
										<CardTitle>Låsning & Export</CardTitle>
									</CardHeader>
									<CardContent className='space-y-4'>
										<p className='text-sm text-muted-foreground'>
											Ett fakturaunderlag måste låsas innan det kan exporteras eller skickas till Fortnox/Visma. När
											underlaget låses beräknas OCR och hash-signatur. Upplåsning kräver motivering och loggas.
										</p>
										<div className='flex flex-wrap gap-3'>
											{canLock && (
												<>
													<Button
														onClick={handleLock}
														disabled={invoiceBasis.locked || lockBasis.isPending || !invoiceBasis.lines_json?.lines?.length}
													>
														<Lock className="mr-2 h-4 w-4" />
														{lockBasis.isPending ? 'Låser…' : 'Lås underlaget'}
													</Button>
													<div className={cn('flex items-center gap-2', invoiceBasis.locked ? 'opacity-100' : 'opacity-70')}>
														<Textarea
															placeholder='Motivering för upplåsning (minst 5 tecken)'
															value={unlockReason}
															onChange={(event) => setUnlockReason(event.target.value)}
															disabled={!invoiceBasis.locked || unlockBasis.isPending}
															className='min-h-[46px] w-64'
														/>
														<Button
															variant='outline'
															onClick={handleUnlock}
															disabled={!invoiceBasis.locked || unlockBasis.isPending}
														>
															{unlockBasis.isPending ? 'Öppnar…' : 'Lås upp'}
														</Button>
													</div>
												</>
											)}
											{(invoiceBasis.locked || userRole === 'finance') && (
												<>
													<Button
														variant='outline'
														className='ml-auto'
														onClick={() => {
															if (!invoiceBasis.locked) {
																toast.error('Lås underlaget innan export');
																return;
															}
															window.open(
																`/api/exports/invoice?projectId=${selectedProject}&start=${periodStart}&end=${periodEnd}`,
																'_blank'
															);
														}}
														disabled={!invoiceBasis.locked}
													>
														<Download className="mr-2 h-4 w-4" />
														Ladda ner CSV
													</Button>
													<Button
														variant='outline'
														onClick={() => {
															if (!invoiceBasis.locked) {
																toast.error('Lås underlaget innan export');
																return;
															}
															window.open(
																`/invoices/print?projectId=${encodeURIComponent(selectedProject)}&start=${encodeURIComponent(periodStart)}&end=${encodeURIComponent(periodEnd)}`,
																'_blank'
															);
														}}
														disabled={!invoiceBasis.locked}
													>
														Förhandsvisa
													</Button>
													<Button
														variant='outline'
														onClick={() => {
															if (!invoiceBasis.locked) {
																toast.error('Lås underlaget innan export');
																return;
															}
															window.open(
																`/api/invoices/pdf?projectId=${encodeURIComponent(selectedProject)}&start=${encodeURIComponent(periodStart)}&end=${encodeURIComponent(periodEnd)}`,
																'_blank'
															);
														}}
														disabled={!invoiceBasis.locked}
													>
														<Download className="mr-2 h-4 w-4" />
														Ladda ner PDF
													</Button>
												</>
											)}
											{/* Fortnox Export Section */}
											{invoiceBasis.locked && (
												<div className='w-full border-t pt-4 mt-4'>
													<div className='flex items-center justify-between mb-3'>
														<span className='text-sm font-medium'>Fortnox Export</span>
														{fortnoxStatus?.fortnox_invoice_number ? (
															<span className='text-sm font-medium text-green-600 dark:text-green-400'>
																✅ Exporterad – Fakturanummer: {fortnoxStatus.fortnox_invoice_number}
															</span>
														) : fortnoxStatus?.status === 'failed' ? (
															<span className='text-sm font-medium text-destructive'>
																❌ Export misslyckades
															</span>
														) : (
															<span className='text-sm text-muted-foreground'>
																Ej exporterad till Fortnox
															</span>
														)}
													</div>
													{canExportToFortnox ? (
														<div className='space-y-2'>
															{/* Only show warning if we've actually fetched the customer number and it's missing */}
															{hasFetchedCustomerNumber && !customerFortnoxNumber ? (
																<>
																	<Alert variant="destructive" className="mb-2">
																		<AlertCircle className="h-4 w-4" />
																		<AlertDescription className="text-xs">
																			⚠️ Kunden saknar Fortnox kundnummer. Importera kunder från Fortnox i Inställningar {'>'} Fortnox Integration för att automatiskt koppla kundnummer.
																		</AlertDescription>
																	</Alert>
															<Button
																		type="button"
																		onClick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();
																		}}
																		disabled={true}
																		variant="outline"
																	>
																		Kan inte exportera - saknar kundnummer
															</Button>
																</>
															) : customerFortnoxNumber ? (
																<>
																	{/* Show recent failed exports with error message */}
																	{fortnoxStatus?.status === 'failed' && fortnoxStatus.error_message && (
																		<Alert variant="destructive" className="mb-2">
																			<AlertCircle className="h-4 w-4" />
																			<AlertDescription className="text-xs">
																				<strong>Fel vid export:</strong> {fortnoxStatus.error_message}
																				<br />
																				<Button
																					type="button"
																					variant="link"
																					className="h-auto p-0 text-xs mt-1"
																					onClick={async (e) => {
																						e.preventDefault();
																						e.stopPropagation();
																						if (!invoiceBasis?.id) return;
																						
																						try {
																							const response = await fetch(
																								`/api/integrations/fortnox/invoice-links?invoiceBasisId=${invoiceBasis.id}`,
																								{ method: 'DELETE' }
																							);
																							if (response.ok) {
																								// Refresh status after deletion
																								setFortnoxStatus(null);
																								setHasOldFailedExport(false);
																								toast.success('Exportstatus raderad. Du kan nu försöka exportera igen.');
																								// Refetch status to see if there are any other failed exports
																								const statusResponse = await fetch(
																									`/api/integrations/fortnox/invoice-links?invoiceBasisId=${invoiceBasis.id}`
																								);
																								if (statusResponse.ok) {
																									const statusData = await statusResponse.json();
																									if (statusData.data) {
																										if (statusData.data.status === 'failed') {
																											const errorTime = statusData.data.updated_at || statusData.data.created_at;
																											if (errorTime) {
																												const errorDate = new Date(errorTime);
																												const now = new Date();
																												const hoursAgo = (now.getTime() - errorDate.getTime()) / (1000 * 60 * 60);
																												if (hoursAgo < 1) {
																													setFortnoxStatus({
																														fortnox_invoice_number: null,
																														status: 'failed',
																														error_message: statusData.data.error_message || null,
																													});
																												} else {
																													setHasOldFailedExport(true);
																												}
																											}
																										} else if (statusData.data.status === 'created') {
																											setFortnoxStatus({
																												fortnox_invoice_number: statusData.data.fortnox_invoice_number || null,
																												status: statusData.data.status || null,
																												error_message: null,
																											});
																										}
																									}
																								}
																							} else {
																								toast.error('Kunde inte radera exportstatus');
																							}
																						} catch (error) {
																							console.error('Failed to delete export status:', error);
																							toast.error('Kunde inte radera exportstatus');
																						}
																					}}
																				>
																					Rensa felmeddelande och försök igen
																				</Button>
																			</AlertDescription>
																		</Alert>
																	)}
																	{/* Show option to clear old failed exports (older than 1 hour or when no recent error shown) */}
																	{hasOldFailedExport && (
																		<Alert variant="outline" className="mb-2">
																			<AlertCircle className="h-4 w-4" />
																			<AlertDescription className="text-xs">
																				Det finns en gammal misslyckad export i databasen som kan hindra ny export.
																				<br />
																				<Button
																					type="button"
																					variant="link"
																					className="h-auto p-0 text-xs mt-1"
																					onClick={async (e) => {
																						e.preventDefault();
																						e.stopPropagation();
																						if (!invoiceBasis?.id) return;
																						
																						try {
																							const response = await fetch(
																								`/api/integrations/fortnox/invoice-links?invoiceBasisId=${invoiceBasis.id}`,
																								{ method: 'DELETE' }
																							);
																							if (response.ok) {
																								// Refresh status after deletion
																								setHasOldFailedExport(false);
																								setFortnoxStatus(null);
																								toast.success('Gammal exportstatus raderad. Du kan nu försöka exportera igen.');
																								// Refetch status to see if there are any other failed exports
																								const statusResponse = await fetch(
																									`/api/integrations/fortnox/invoice-links?invoiceBasisId=${invoiceBasis.id}`
																								);
																								if (statusResponse.ok) {
																									const statusData = await statusResponse.json();
																									if (statusData.data) {
																										if (statusData.data.status === 'failed') {
																											const errorTime = statusData.data.updated_at || statusData.data.created_at;
																											if (errorTime) {
																												const errorDate = new Date(errorTime);
																												const now = new Date();
																												const hoursAgo = (now.getTime() - errorDate.getTime()) / (1000 * 60 * 60);
																												if (hoursAgo < 1) {
																													setFortnoxStatus({
																														fortnox_invoice_number: null,
																														status: 'failed',
																														error_message: statusData.data.error_message || null,
																													});
																												} else {
																													setHasOldFailedExport(true);
																												}
																											}
																										} else if (statusData.data.status === 'created') {
																											setFortnoxStatus({
																												fortnox_invoice_number: statusData.data.fortnox_invoice_number || null,
																												status: statusData.data.status || null,
																												error_message: null,
																											});
																										}
																									}
																								}
																							} else {
																								toast.error('Kunde inte radera exportstatus');
																							}
																						} catch (error) {
																							console.error('Failed to delete export status:', error);
																							toast.error('Kunde inte radera exportstatus');
																						}
																					}}
																				>
																					Rensa gammal exportstatus
																				</Button>
																			</AlertDescription>
																		</Alert>
																	)}
																	{fortnoxStatus?.fortnox_invoice_number && (
																		<Alert className="mb-2 border-green-500 bg-green-50 dark:bg-green-950/20">
																			<CheckCircle2 className="h-4 w-4 text-green-600" />
																			<AlertDescription className="text-xs text-green-800 dark:text-green-200">
																				<strong>Export lyckades!</strong> Faktura {fortnoxStatus.fortnox_invoice_number} har skapats i Fortnox.
																			</AlertDescription>
																		</Alert>
																	)}
																	<Button
																		type="button"
																		onClick={(e) => {
																			console.log('[Fortnox Export] Button clicked!');
																			e.preventDefault();
																			e.stopPropagation();
																			// Extra safety - check that we have customer number before allowing export
																			if (!hasFetchedCustomerNumber || !customerFortnoxNumber) {
																				console.error('[Fortnox Export] Button clicked but customer number not ready!');
																				toast.error('Vänta tills kundnummer har hämtats.');
																				return;
																			}
																			handleExportToFortnox(e);
																		}}
																		disabled={isExportingToFortnox || !!fortnoxStatus?.fortnox_invoice_number || !hasFetchedCustomerNumber || !customerFortnoxNumber}
																	>
																		{isExportingToFortnox ? (
																			<>
																				<Loader2 className="mr-2 h-4 w-4 animate-spin" />
																				Exporterar...
																			</>
																		) : (
																			'Skapar kundfaktura i Fortnox'
																		)}
																	</Button>
																	<p className='text-xs text-muted-foreground'>
																		Kundnummer: {customerFortnoxNumber} (hämtas automatiskt från kundregistret)
																	</p>
																</>
															) : isFetchingCustomerNumber ? (
																<>
																	{/* Loading state - actively fetching */}
																	<div className='text-xs text-muted-foreground mb-2'>
																		Hämtar kundnummer...
																	</div>
																	<Button
																		type="button"
																		onClick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();
																		}}
																		disabled={true}
																		variant="outline"
																	>
																		Väntar på kundnummer...
																	</Button>
																</>
															) : (
																<>
																	{/* Not fetched yet - show loading */}
																	<div className='text-xs text-muted-foreground mb-2'>
																		Förbereder export...
																	</div>
																	<Button
																		type="button"
																		onClick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();
																		}}
																		disabled={true}
																		variant="outline"
																	>
																		Väntar...
																	</Button>
																</>
															)}
														</div>
													) : (
														<p className='text-sm text-muted-foreground'>
															{fortnoxStatus?.fortnox_invoice_number
																? `Exporterad till Fortnox – fakturanummer ${fortnoxStatus.fortnox_invoice_number}`
																: 'Ej exporterad till Fortnox'}
														</p>
													)}
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</>
						) : (
							<Card className='border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'>
								<CardContent className='flex flex-col items-center justify-center py-12 text-center'>
									<div className='mb-4 rounded-full bg-amber-100 p-4 dark:bg-amber-900/30'>
										<Info className='h-8 w-8 text-amber-600 dark:text-amber-400' />
									</div>
									<h3 className='mb-2 text-lg font-semibold text-foreground'>Inget att fakturera ännu</h3>
									<p className='mb-6 max-w-md text-sm text-muted-foreground'>
										Det finns just nu inga godkända rader att fakturera för valt projekt och period. För att skapa ett underlag behöver du:
									</p>
									<div className='mb-6 grid max-w-md gap-2 text-left text-sm'>
										<div className='flex items-start gap-2'>
											<CheckCircle2 className='mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground' />
											<span className='text-muted-foreground'>
												Godkänd tid, material, utlägg eller ÄTA-rader för perioden
											</span>
										</div>
										<div className='flex items-start gap-2'>
											<CheckCircle2 className='mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground' />
											<span className='text-muted-foreground'>
												Dagboksposter om du vill inkludera fakturatext
											</span>
										</div>
									</div>
									<div className='flex flex-wrap items-center justify-center gap-3'>
										<Button variant='outline' onClick={() => refetchBasis()}>
											<RefreshCw className='mr-2 h-4 w-4' />
											Försök igen
										</Button>
										<Button
											variant='default'
											onClick={() => {
												setCurrentStep('approvals');
												refetchGrouped();
											}}
										>
											<CheckCircle2 className='mr-2 h-4 w-4' />
											Öppna godkännanden
										</Button>
									</div>
								</CardContent>
							</Card>
						)}
					</>
				)}
			</main>
		</div>
	);
}

