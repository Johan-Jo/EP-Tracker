'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { SignatureInput } from '@/components/shared/signature-input';
import { toast } from 'sonner';
import { billingTypeEnum, billingTypeOptions, type BillingType } from '@/lib/schemas/billing-types';
import { AddMaterialDialog } from '@/components/materials/add-material-dialog';
import { PhotoUploadButtons } from '@/components/shared/photo-upload-buttons';
import { formatUnitLabel } from '@/lib/utils/units';

const DRAFT_FORM_STORAGE_PREFIX = 'ata-draft-form:';
const DRAFT_MATERIALS_STORAGE_PREFIX = 'ata-draft-materials:';
const DRAFT_EXPENSES_STORAGE_PREFIX = 'ata-draft-expenses:';

const ataFormSchema = z
	.object({
		project_id: z.string().uuid({ message: 'Välj ett projekt' }),
		title: z.string().min(1, 'Titel krävs'),
		description: z.string().optional().nullable(),
		qty: z.string().optional(),
		unit: z.string().optional().nullable(),
		unit_price_sek: z.string().optional(),
		ata_number: z.string().optional().nullable(),
		billing_type: z.union([billingTypeEnum, z.literal('')]),
		fixed_amount_sek: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if (!data.billing_type) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Välj debitering',
				path: ['billing_type'],
			});
		}

		if (data.billing_type === 'FAST') {
			const parsedFixed = parseNumberString(data.fixed_amount_sek);
			if (!data.fixed_amount_sek || data.fixed_amount_sek.trim() === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Fast belopp krävs',
					path: ['fixed_amount_sek'],
				});
			} else if (parsedFixed === null || !Number.isFinite(parsedFixed) || parsedFixed <= 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Ange ett giltigt fast belopp större än 0',
					path: ['fixed_amount_sek'],
				});
			}
		}

		if (data.billing_type === 'LOPANDE') {
			const parsedUnitPrice = parseNumberString(data.unit_price_sek);

			if (data.unit_price_sek && parsedUnitPrice === null) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Ange ett giltigt à-pris',
					path: ['unit_price_sek'],
				});
			}
			if (data.unit && data.unit.length > 10) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Enhet får vara max 10 tecken',
					path: ['unit'],
				});
			}
			if (parsedUnitPrice === null || parsedUnitPrice <= 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Projektets timtaxa saknas eller är ogiltig',
					path: ['unit_price_sek'],
				});
			}
		}

	});

type AtaFormValues = z.infer<typeof ataFormSchema>;

type CreateAtaPayload = {
	project_id: string;
	title: string;
	description: string | null;
	qty: number | null;
	unit: string | null;
	unit_price_sek: number | null;
	ata_number: string | null;
	billing_type: BillingType;
	fixed_amount_sek: number | null;
	materials_amount_sek: number;
	material_ids: string[];
	expense_ids: string[];
	status: 'draft' | 'pending_approval';
	signed_by_name?: string | null;
	signed_at?: string | null;
};

interface ProjectOption {
	id: string;
	name: string;
	project_number: string | null;
	billing_mode: 'FAST_ONLY' | 'LOPANDE_ONLY' | 'BOTH';
	default_ata_billing_type: BillingType;
	project_hourly_rate_sek: number | null;
}

const parseNumberString = (value?: string | null): number | null => {
	if (value === undefined || value === null) return null;
	const normalized = value.replace(',', '.').trim();
	if (normalized === '') return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
};

interface AtaFormProps {
	orgId: string;
	projectId?: string;
	onSuccess?: () => void;
	onCancel?: () => void;
	userRole?: 'admin' | 'foreman' | 'worker' | 'finance' | 'ue';
}

export function AtaForm({ orgId, projectId, onSuccess, onCancel, userRole }: AtaFormProps) {
	const [photos, setPhotos] = useState<File[]>([]);
	const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
	const [signature, setSignature] = useState<{ name: string; timestamp: string } | null>(null);
	const [submitAsPending, setSubmitAsPending] = useState(false);
	const isWorker = userRole === 'worker' || userRole === 'ue';
	const queryClient = useQueryClient();
	const supabase = createClient();
	const router = useRouter();
	const [draftId, setDraftId] = useState<string | null>(null);
	const [draftMaterialIds, setDraftMaterialIds] = useState<string[]>([]);
	const [draftExpenseIds, setDraftExpenseIds] = useState<string[]>([]);
	const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
		setValue,
	} = useForm<AtaFormValues>({
		resolver: zodResolver(ataFormSchema),
		defaultValues: {
			project_id: projectId || '',
			title: '',
			description: '',
			qty: '',
			unit: '',
			unit_price_sek: '',
			ata_number: '',
			billing_type: '',
			fixed_amount_sek: '',
		},
	});

	const selectedProjectId = watch('project_id');
	const titleValue = watch('title');
	const billingType = watch('billing_type');
	const qtyValue = watch('qty');
	const unitPriceValue = watch('unit_price_sek');
	const unitValue = watch('unit');
	const fixedAmountValue = watch('fixed_amount_sek');

	const persistedFields: (keyof AtaFormValues)[] = useMemo(
		() => ['project_id', 'title', 'description', 'qty', 'unit', 'unit_price_sek', 'ata_number', 'billing_type', 'fixed_amount_sek'],
		[],
	);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const currentUrl = new URL(window.location.href);
		let existingDraft = currentUrl.searchParams.get('ata_draft');

		if (!existingDraft) {
			existingDraft = crypto.randomUUID();
			currentUrl.searchParams.set('ata_draft', existingDraft);
			router.replace(`${currentUrl.pathname}${currentUrl.search}`, { scroll: false });
		}

		setDraftId(existingDraft);
	}, [router]);

	useEffect(() => {
		if (!draftId || typeof window === 'undefined') return;

		const formKey = `${DRAFT_FORM_STORAGE_PREFIX}${draftId}`;

		const loadPersistedForm = () => {
			try {
				const stored = window.localStorage.getItem(formKey);
				if (!stored) return;
				const parsed = JSON.parse(stored);
				if (!parsed || typeof parsed !== 'object') return;
				persistedFields.forEach((field) => {
					if (field in parsed && parsed[field] !== undefined) {
						setValue(field, parsed[field] as any, { shouldDirty: false });
					}
				});
			} catch (error) {
				console.error('Kunde inte läsa sparat ÄTA-utkast', error);
			}
		};

		loadPersistedForm();

		const subscription = watch((value) => {
			try {
				const payload: Record<string, unknown> = {};
				persistedFields.forEach((field) => {
					const fieldValue = value[field];
					if (fieldValue !== undefined && fieldValue !== null) {
						payload[field] = fieldValue;
					}
				});
				window.localStorage.setItem(formKey, JSON.stringify(payload));
			} catch (error) {
				console.error('Kunde inte spara ÄTA-utkast', error);
			}
		});

		return () => subscription.unsubscribe();
	}, [draftId, persistedFields, setValue, watch]);

	const loadDraftMaterialIds = useCallback(() => {
		if (!draftId || typeof window === 'undefined') {
			setDraftMaterialIds([]);
			return;
		}

		try {
			const stored = window.localStorage.getItem(`${DRAFT_MATERIALS_STORAGE_PREFIX}${draftId}`);
			if (!stored) {
				setDraftMaterialIds([]);
				return;
			}
			const parsed = JSON.parse(stored);
			if (!Array.isArray(parsed)) {
				setDraftMaterialIds([]);
				return;
			}
			const unique = Array.from(
				new Set(parsed.filter((id: unknown): id is string => typeof id === 'string')),
			);
			setDraftMaterialIds(unique);
		} catch (error) {
			console.error('Kunde inte läsa kopplade material', error);
			setDraftMaterialIds([]);
		}
	}, [draftId]);

	useEffect(() => {
		if (!draftId || typeof window === 'undefined') return;

		loadDraftMaterialIds();

		const handleStorage = (event: StorageEvent) => {
			if (event.key === `${DRAFT_MATERIALS_STORAGE_PREFIX}${draftId}`) {
				loadDraftMaterialIds();
			}
		};

		const handleVisibility = () => {
			if (!document.hidden) {
				loadDraftMaterialIds();
			}
		};

		window.addEventListener('storage', handleStorage);
		document.addEventListener('visibilitychange', handleVisibility);

		return () => {
			window.removeEventListener('storage', handleStorage);
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	}, [draftId, loadDraftMaterialIds]);

	const updateDraftMaterials = useCallback(
		(updater: (ids: string[]) => string[]) => {
			if (!draftId || typeof window === 'undefined') return;
			const key = `${DRAFT_MATERIALS_STORAGE_PREFIX}${draftId}`;
			setDraftMaterialIds((prev) => {
				const next = updater(prev);
				if (next.length === 0) {
					window.localStorage.removeItem(key);
				} else {
					window.localStorage.setItem(key, JSON.stringify(next));
				}
				return next;
			});
		},
		[draftId],
	);

const loadDraftExpenseIds = useCallback(() => {
	if (!draftId || typeof window === 'undefined') {
		setDraftExpenseIds([]);
		return;
	}

	try {
		const stored = window.localStorage.getItem(`${DRAFT_EXPENSES_STORAGE_PREFIX}${draftId}`);
		if (!stored) {
			setDraftExpenseIds([]);
			return;
		}
		const parsed = JSON.parse(stored);
		if (!Array.isArray(parsed)) {
			setDraftExpenseIds([]);
			return;
		}
		const unique = Array.from(
			new Set(parsed.filter((id: unknown): id is string => typeof id === 'string')),
		);
		setDraftExpenseIds(unique);
	} catch (error) {
		console.error('Kunde inte läsa kopplade utgifter', error);
		setDraftExpenseIds([]);
	}
}, [draftId]);

useEffect(() => {
	if (!draftId || typeof window === 'undefined') return;

	loadDraftExpenseIds();

	const handleStorage = (event: StorageEvent) => {
		if (event.key === `${DRAFT_EXPENSES_STORAGE_PREFIX}${draftId}`) {
			loadDraftExpenseIds();
		}
	};

	const handleVisibility = () => {
		if (!document.hidden) {
			loadDraftExpenseIds();
		}
	};

	window.addEventListener('storage', handleStorage);
	document.addEventListener('visibilitychange', handleVisibility);

	return () => {
		window.removeEventListener('storage', handleStorage);
		document.removeEventListener('visibilitychange', handleVisibility);
	};
}, [draftId, loadDraftExpenseIds]);

const updateDraftExpenses = useCallback(
	(updater: (ids: string[]) => string[]) => {
		if (!draftId || typeof window === 'undefined') return;
		const key = `${DRAFT_EXPENSES_STORAGE_PREFIX}${draftId}`;
		setDraftExpenseIds((prev) => {
			const next = updater(prev);
			if (next.length === 0) {
				window.localStorage.removeItem(key);
			} else {
				window.localStorage.setItem(key, JSON.stringify(next));
			}
			return next;
		});
	},
	[draftId],
);

	const handleRemoveDraftMaterial = useCallback(
		async (materialId: string) => {
			try {
				const { error } = await supabase
					.from('materials')
					.delete()
					.eq('id', materialId)
					.eq('status', 'draft');

				if (error) {
					console.error('Failed to remove material', error);
					toast.error('Kunde inte ta bort materialet.');
				}
			} catch (error) {
				console.error('Failed to remove material', error);
				toast.error('Kunde inte ta bort materialet.');
			} finally {
				updateDraftMaterials((ids) => ids.filter((id) => id !== materialId));
			}
		},
		[supabase, updateDraftMaterials],
	);

	const handleClearDraftMaterials = useCallback(async () => {
		if (draftMaterialIds.length > 0) {
			try {
				const { error } = await supabase
					.from('materials')
					.delete()
					.in('id', draftMaterialIds)
					.eq('status', 'draft');

				if (error) {
					console.error('Failed to clear materials', error);
					toast.error('Kunde inte rensa materiallistan.');
				}
			} catch (error) {
				console.error('Failed to clear materials', error);
				toast.error('Kunde inte rensa materiallistan.');
			}
		}
		updateDraftMaterials(() => []);
	}, [draftMaterialIds, supabase, updateDraftMaterials]);

	const handleRemoveDraftExpense = useCallback(
		async (expenseId: string) => {
			try {
				const { error } = await supabase
					.from('expenses')
					.delete()
					.eq('id', expenseId)
					.eq('status', 'draft');

				if (error) {
					console.error('Failed to remove expense', error);
					toast.error('Kunde inte ta bort utgiften.');
				}
			} catch (error) {
				console.error('Failed to remove expense', error);
				toast.error('Kunde inte ta bort utgiften.');
			} finally {
				updateDraftExpenses((ids) => ids.filter((id) => id !== expenseId));
			}
		},
		[supabase, updateDraftExpenses],
	);

	const handleClearDraftExpenses = useCallback(async () => {
		if (draftExpenseIds.length > 0) {
			try {
				const { error } = await supabase
					.from('expenses')
					.delete()
					.in('id', draftExpenseIds)
					.eq('status', 'draft');

				if (error) {
					console.error('Failed to clear expenses', error);
					toast.error('Kunde inte rensa utgiftslistan.');
				}
			} catch (error) {
				console.error('Failed to clear expenses', error);
				toast.error('Kunde inte rensa utgiftslistan.');
			}
		}
		updateDraftExpenses(() => []);
	}, [draftExpenseIds, supabase, updateDraftExpenses]);

	const handleMaterialCreated = useCallback(
		(materialId: string) => {
			updateDraftMaterials((ids) => {
				if (ids.includes(materialId)) {
					return ids;
				}
				toast.success('Material tillagt i ÄTA-utkastet');
				return [...ids, materialId];
			});
		},
		[updateDraftMaterials],
	);

	const handleExpenseCreated = useCallback(
		(expenseId: string) => {
			updateDraftExpenses((ids) => {
				if (ids.includes(expenseId)) {
					return ids;
				}
				toast.success('Utgift tillagd i ÄTA-utkastet');
				return [...ids, expenseId];
			});
		},
		[updateDraftExpenses],
	);

	const handleOpenMaterials = useCallback(() => {
		if (!selectedProjectId) {
			toast.error('Välj ett projekt innan du lägger till material.');
			return;
		}
		if (!titleValue?.trim()) {
			toast.error('Ange ett namn på ÄTA:n innan du lägger till material.');
			return;
		}
		setIsMaterialDialogOpen(true);
	}, [selectedProjectId, titleValue]);

	const createAtaMutation = useMutation({
		mutationFn: async (payload: CreateAtaPayload) => {
			const ataData = {
				...payload,
				qty: payload.qty ?? null,
				unit: payload.unit ?? null,
				unit_price_sek: payload.unit_price_sek ?? null,
				fixed_amount_sek: payload.billing_type === 'FAST' ? payload.fixed_amount_sek ?? null : null,
				signed_by_name: payload.signed_by_name ?? null,
				signed_at: payload.signed_at ?? null,
			};

			const response = await fetch('/api/ata', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(ataData),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte skapa ÄTA');
			}

			const { ata } = await response.json();

			// Upload photos if any
			if (photos.length > 0) {
				await uploadPhotos(ata.id);
			}

			return ata;
		},
		onSuccess: (_result, variables) => {
			const message =
				variables.status === 'pending_approval'
					? 'ÄTA skickad för godkännande!'
					: 'ÄTA sparad som utkast!';
			toast.success(message);
			if (draftId && typeof window !== 'undefined') {
				window.localStorage.removeItem(`${DRAFT_FORM_STORAGE_PREFIX}${draftId}`);
				window.localStorage.removeItem(`${DRAFT_MATERIALS_STORAGE_PREFIX}${draftId}`);
				window.localStorage.removeItem(`${DRAFT_EXPENSES_STORAGE_PREFIX}${draftId}`);
			}
			setDraftMaterialIds([]);
			setDraftExpenseIds([]);
			queryClient.invalidateQueries({ queryKey: ['ata'] });
			if (onSuccess) {
				onSuccess();
			} else {
				// If no onSuccess callback, redirect to ata list after a short delay
				setTimeout(() => {
					router.push('/dashboard/ata');
					router.refresh();
				}, 1000);
			}
		},
		onError: (error: Error) => {
			console.error('ÄTA save error:', error);
			toast.error(error.message || 'Kunde inte spara ÄTA');
		},
	});

	const uploadPhotos = async (ataId: string) => {
		for (let i = 0; i < photos.length; i++) {
			const photo = photos[i];
			const fileExt = photo.name.split('.').pop();
			const fileName = `${ataId}/${crypto.randomUUID()}.${fileExt}`;

			const { error: uploadError } = await supabase.storage
				.from('ata-photos')
				.upload(fileName, photo);

			if (uploadError) {
				console.error('Photo upload error:', uploadError);
				toast.error(`Kunde inte ladda upp foto ${i + 1}: ${uploadError.message}`);
				continue;
			}

			const { data: urlData } = supabase.storage
				.from('ata-photos')
				.getPublicUrl(fileName);

			// Save photo record
			const response = await fetch('/api/ata/photos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ata_id: ataId,
					photo_url: urlData.publicUrl,
					sort_order: i,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				console.error('Failed to save photo record:', error);
				toast.error(`Kunde inte spara foto ${i + 1} i databasen`);
			}
		}
	};

	const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (photos.length + files.length > 10) {
			toast.error('Max 10 foton tillåtna');
			return;
		}

		setPhotos([...photos, ...files]);

		// Create previews
		files.forEach((file) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPhotosPreviews((prev) => [...prev, reader.result as string]);
			};
			reader.readAsDataURL(file);
		});
	};

	const removePhoto = (index: number) => {
		setPhotos(photos.filter((_, i) => i !== index));
		setPhotosPreviews(photosPreviews.filter((_, i) => i !== index));
	};

	const toNumber = (value: unknown): number => {
		if (value === undefined || value === null) return 0;
		if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	};

	const unitPriceNumber = parseNumberString(unitPriceValue);
	const fixedAmountNumber = parseNumberString(fixedAmountValue);

	const { data: draftMaterials = [], isLoading: isLoadingDraftMaterials } = useQuery({
		queryKey: ['ata-draft-materials', draftId, draftMaterialIds],
		enabled: Boolean(draftId && draftMaterialIds.length > 0),
		queryFn: async () => {
			const ids = draftMaterialIds.filter(Boolean);
			if (ids.length === 0) return [];

			const { data, error } = await supabase
				.from('materials')
				.select('id, description, qty, unit, unit_price_sek, total_sek, status, project_id')
				.in('id', ids);

			if (error) throw error;

			const map = new Map((data ?? []).map((item) => [item.id, item]));
			return ids
				.map((id) => map.get(id))
				.filter((item): item is NonNullable<typeof item> => Boolean(item));
		},
	});

const { data: draftExpenses = [], isLoading: isLoadingDraftExpenses } = useQuery({
	queryKey: ['ata-draft-expenses', draftId, draftExpenseIds],
	enabled: Boolean(draftId && draftExpenseIds.length > 0),
	queryFn: async () => {
		const ids = draftExpenseIds.filter(Boolean);
		if (ids.length === 0) return [];

		const { data, error } = await supabase
			.from('expenses')
			.select('id, project_id, description, amount_sek, category, created_at')
			.in('id', ids);

		if (error) throw error;

		const map = new Map((data ?? []).map((item) => [item.id, item]));
		return ids
			.map((id) => map.get(id))
			.filter((item): item is NonNullable<typeof item> => Boolean(item));
	},
});

	useEffect(() => {
		if (!draftId || !selectedProjectId) return;
		if (!draftMaterials || draftMaterials.length === 0) return;

		const filtered = draftMaterials.filter((material) => material.project_id === selectedProjectId);
		if (filtered.length === draftMaterials.length) return;

		const allowedIds = filtered.map((material) => material.id);
		const currentIds = draftMaterialIds;
		const isSameLength = allowedIds.length === currentIds.length;
		const isSameOrder = isSameLength && allowedIds.every((id, index) => id === currentIds[index]);

		if (!isSameOrder) {
			const key = `${DRAFT_MATERIALS_STORAGE_PREFIX}${draftId}`;
			setDraftMaterialIds(allowedIds);
			if (typeof window !== 'undefined') {
				if (allowedIds.length === 0) {
					window.localStorage.removeItem(key);
				} else {
					window.localStorage.setItem(key, JSON.stringify(allowedIds));
				}
			}
		}
	}, [draftId, draftMaterials, draftMaterialIds, selectedProjectId]);

	useEffect(() => {
		if (!draftId || !selectedProjectId) return;
		if (!draftExpenses || draftExpenses.length === 0) return;

		const filtered = draftExpenses.filter((expense: any) => expense.project_id === selectedProjectId);
		if (filtered.length === draftExpenses.length) return;

		const allowedIds = filtered.map((expense: any) => expense.id);
		const currentIds = draftExpenseIds;
		const isSameLength = allowedIds.length === currentIds.length;
		const isSameOrder = isSameLength && allowedIds.every((id, index) => id === currentIds[index]);

		if (!isSameOrder) {
			const key = `${DRAFT_EXPENSES_STORAGE_PREFIX}${draftId}`;
			setDraftExpenseIds(allowedIds);
			if (typeof window !== 'undefined') {
				if (allowedIds.length === 0) {
					window.localStorage.removeItem(key);
				} else {
					window.localStorage.setItem(key, JSON.stringify(allowedIds));
				}
			}
		}
	}, [draftExpenseIds, draftExpenses, draftId, selectedProjectId]);

	const materialsSubtotal = useMemo(
		() =>
			(draftMaterials ?? []).reduce((sum, material) => {
				const total = toNumber(material?.total_sek ?? 0);
				if (total > 0) return sum + total;
				const fallback = toNumber(material?.qty ?? 0) * toNumber(material?.unit_price_sek ?? 0);
				return sum + fallback;
			}, 0),
		[draftMaterials],
	);

	const expensesSubtotal = useMemo(
		() =>
			(draftExpenses ?? []).reduce((sum, expense) => {
				const amount = toNumber(expense?.amount_sek ?? 0);
				return sum + amount;
			}, 0),
		[draftExpenses],
	);

	const materialIdsForSubmit = useMemo(() => {
		const ids =
			draftMaterials && draftMaterials.length > 0
				? draftMaterials.map((material) => material.id)
				: draftMaterialIds;
		return Array.from(new Set(ids));
	}, [draftMaterials, draftMaterialIds]);

const expenseIdsForSubmit = useMemo(() => {
	const ids =
		draftExpenses && draftExpenses.length > 0
			? draftExpenses.map((expense) => expense.id)
			: draftExpenseIds;
	return Array.from(new Set(ids));
}, [draftExpenses, draftExpenseIds]);

	const laborSubtotal =
		billingType === 'FAST'
			? fixedAmountNumber ?? 0
			: 0;
const calculatedTotal =
	(Number.isFinite(laborSubtotal) ? laborSubtotal : 0) + materialsSubtotal + expensesSubtotal;
	const totalDisplay = Number.isFinite(calculatedTotal) ? calculatedTotal : 0;
	const showTotalCard = totalDisplay > 0;
	const hasLaborSubtotal = Number.isFinite(laborSubtotal) && laborSubtotal > 0;
const hasMaterialsSubtotal = materialsSubtotal > 0;
const hasExpensesSubtotal = expensesSubtotal > 0;

	const laborLabel =
		billingType === 'FAST' ? 'Fast belopp' : 'Arbetstid (från tidrapportering)';

	// Fetch projects
	const { data: projects } = useQuery<ProjectOption[]>({
		queryKey: ['projects'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number, billing_mode, default_ata_billing_type, project_hourly_rate_sek')
				.order('name');
			if (error) throw error;
			return data || [];
		},
	});

	const selectedProjectDetails = useMemo(
		() => projects?.find((project) => project.id === selectedProjectId) ?? null,
		[projects, selectedProjectId],
	);

const projectHourlyRateNumber = (() => {
	const raw = selectedProjectDetails?.project_hourly_rate_sek;
	if (raw === null || raw === undefined) return null;
	const numeric = typeof raw === 'number' ? raw : Number(raw);
	return Number.isFinite(numeric) ? numeric : null;
})();

const hourlyRateMissing = billingType === 'LOPANDE' && (!projectHourlyRateNumber || projectHourlyRateNumber <= 0);

	useEffect(() => {
		if (!selectedProjectId) {
			if (billingType !== '') {
				setValue('billing_type', '', { shouldDirty: true });
			}
			return;
		}

	if (!billingType) {
		setValue('billing_type', selectedProjectDetails?.default_ata_billing_type ?? 'LOPANDE', {
			shouldDirty: false,
		});
		}
	}, [selectedProjectId, selectedProjectDetails, billingType, setValue]);

useEffect(() => {
	if (billingType !== 'LOPANDE') {
		return;
	}

	if (!selectedProjectDetails) {
		setValue('unit_price_sek', '', { shouldDirty: false });
		return;
	}

	const rate = selectedProjectDetails.project_hourly_rate_sek;

	if (rate === null || rate === undefined) {
		setValue('unit_price_sek', '', { shouldDirty: false });
		return;
	}

	const normalizedRate = typeof rate === 'number' ? rate.toString() : rate;
	setValue('unit_price_sek', normalizedRate, { shouldDirty: false });
}, [billingType, selectedProjectDetails, setValue]);

useEffect(() => {
	if (billingType !== 'LOPANDE') {
		return;
	}

	if (unitValue !== 'tim') {
		setValue('unit', 'tim', { shouldDirty: false });
	}
}, [billingType, unitValue, setValue]);

	useEffect(() => {
		if (billingType === 'FAST') {
			if (qtyValue) setValue('qty', '', { shouldDirty: true });
			if (unitPriceValue) setValue('unit_price_sek', '', { shouldDirty: true });
			if (unitValue) setValue('unit', '', { shouldDirty: true });
		} else if (billingType === 'LOPANDE') {
			if (fixedAmountValue) setValue('fixed_amount_sek', '', { shouldDirty: true });
		}
	}, [billingType, qtyValue, unitPriceValue, unitValue, fixedAmountValue, setValue]);

	const onSubmit = (data: AtaFormValues) => {
		const resolvedBillingType: BillingType =
			data.billing_type
				? (data.billing_type as BillingType)
				: selectedProjectDetails?.default_ata_billing_type ?? 'LOPANDE';

		const payload: CreateAtaPayload = {
			project_id: data.project_id,
			title: data.title,
			description: data.description?.trim() ? data.description.trim() : null,
			qty: resolvedBillingType === 'FAST' ? null : parseNumberString(data.qty),
			unit: resolvedBillingType === 'FAST' ? null : data.unit?.trim() || null,
			unit_price_sek: resolvedBillingType === 'FAST' ? null : parseNumberString(data.unit_price_sek),
			ata_number: data.ata_number?.trim() || null,
			billing_type: resolvedBillingType,
			fixed_amount_sek: resolvedBillingType === 'FAST' ? parseNumberString(data.fixed_amount_sek) : null,
			materials_amount_sek: Math.round(materialsSubtotal * 100) / 100,
			material_ids: materialIdsForSubmit,
			expense_ids: expenseIdsForSubmit,
			status: submitAsPending ? 'pending_approval' : 'draft',
			signed_by_name: signature?.name ?? null,
			signed_at: signature?.timestamp ?? null,
		};

		createAtaMutation.mutate(payload);
	};

	return (
		<>
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="space-y-4">
				<div>
					<Label htmlFor="project_id">Projekt *</Label>
					<Select
						value={selectedProjectId || ''}
						onValueChange={(value) => setValue('project_id', value, { shouldDirty: true, shouldValidate: true })}
					>
						<SelectTrigger>
							<SelectValue placeholder="Välj projekt" />
						</SelectTrigger>
						<SelectContent>
							{projects?.map((project) => (
								<SelectItem key={project.id} value={project.id}>
									{project.project_number ? `${project.project_number} - ` : ''}
									{project.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.project_id && (
						<p className="text-sm text-destructive mt-1">{errors.project_id.message}</p>
					)}
				</div>

				<div>
					<Label>Debitering *</Label>
					<Select
						value={billingType || ''}
						onValueChange={(value) =>
							setValue('billing_type', value as BillingType, {
								shouldDirty: true,
								shouldValidate: true,
							})
						}
						disabled={!selectedProjectId}
					>
						<SelectTrigger>
							<SelectValue placeholder="Välj debitering" />
						</SelectTrigger>
						<SelectContent>
							{billingTypeOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.billing_type && (
						<p className="text-sm text-destructive mt-1">{errors.billing_type.message}</p>
					)}
					{billingType === 'FAST' && (
						<p className="text-xs text-muted-foreground mt-1">
							Fast belopp kopplas till huvudprojektets fasta budget och visas som en fast rad på
							fakturaunderlaget.
						</p>
					)}
				</div>

				<div>
					<Label htmlFor="ata_number">ÄTA-nummer (valfritt)</Label>
					<Input id="ata_number" {...register('ata_number')} placeholder="t.ex. ÄTA-001" />
				</div>

				<div>
					<Label htmlFor="title">Titel *</Label>
					<Input id="title" {...register('title')} placeholder="t.ex. Extra eluttag i kök" />
					{errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
				</div>

				<div>
					<Label htmlFor="description">Beskrivning</Label>
					<Textarea id="description" {...register('description')} placeholder="Beskriv arbetet i detalj..." rows={4} />
				</div>

				{billingType === 'FAST' ? (
					<div>
						<Label htmlFor="fixed_amount_sek">Fast belopp (SEK) *</Label>
						<Input
							id="fixed_amount_sek"
							type="number"
							step="0.01"
							inputMode="decimal"
							{...register('fixed_amount_sek')}
							placeholder="0.00"
						/>
						{errors.fixed_amount_sek && (
							<p className="text-sm text-destructive mt-1">{errors.fixed_amount_sek.message}</p>
						)}
						<p className="text-xs text-muted-foreground mt-1">Ange totalbeloppet inklusive moms.</p>
					</div>
				) : (
					<div className="space-y-3">
						<p className="text-xs text-muted-foreground">
							Timmar registreras via tidrapporteringen och kopplas automatiskt till denna ÄTA.
						</p>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<Label htmlFor="unit_price_sek">Timtaxa (SEK)</Label>
								<Input
									id="unit_price_sek"
									type="number"
									step="0.01"
									inputMode="decimal"
									{...register('unit_price_sek')}
									placeholder="0.00"
								/>
								{errors.unit_price_sek && (
									<p className="text-sm text-destructive mt-1">{errors.unit_price_sek.message}</p>
								)}
								<p className="text-xs text-muted-foreground mt-1">
									{hourlyRateMissing
										? 'Projektets timtaxa saknas – uppdatera projektet eller ange timtaxan manuellt.'
										: 'Hämtas automatiskt från projektets ordinarie timtaxa.'}
								</p>
							</div>

							<div>
								<Label htmlFor="unit">Enhet</Label>
								<Input id="unit" {...register('unit')} readOnly />
							</div>
						</div>
					</div>
				)}

				{showTotalCard && (
					<Card className="bg-muted">
						<CardContent className="p-4 space-y-2">
							{hasLaborSubtotal && (
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>{laborLabel}</span>
									<span className="font-medium text-foreground">
										{laborSubtotal.toLocaleString('sv-SE', {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}{' '}
										SEK
									</span>
								</div>
							)}
							{hasMaterialsSubtotal && (
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>Material</span>
									<span className="font-medium text-foreground">
										{materialsSubtotal.toLocaleString('sv-SE', {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}{' '}
										SEK
									</span>
								</div>
							)}
							{hasExpensesSubtotal && (
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>Utgifter</span>
									<span className="font-medium text-foreground">
										{expensesSubtotal.toLocaleString('sv-SE', {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}{' '}
										SEK
									</span>
								</div>
							)}
							<div className="flex items-center justify-between border-t border-border/60 pt-3">
								<span className="text-sm font-medium">Totalt</span>
								<span className="text-lg font-bold">
									{totalDisplay.toLocaleString('sv-SE', {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}{' '}
									SEK
								</span>
							</div>
						</CardContent>
					</Card>
				)}

				{selectedProjectId && (
					<Card className="border-dashed border-border/60 bg-muted/30">
						<CardContent className="p-4 space-y-3">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-sm font-semibold">Material kopplade till denna ÄTA</h3>
									<p className="text-xs text-muted-foreground">
										Lägg till materialposter här – de sparas både i materialhistoriken och kopplas till
										detta ÄTA-utkast.
									</p>
								</div>
								{draftMaterials.length > 0 && (
									<Button variant="ghost" size="sm" onClick={handleClearDraftMaterials}>
										Rensa lista
									</Button>
								)}
							</div>

							{isLoadingDraftMaterials ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Laddar kopplade material...
								</div>
							) : draftMaterials.length > 0 ? (
								<ul className="space-y-3">
									{draftMaterials.map((material) => {
										const qtyDisplay = toNumber(material.qty);
										const unitPriceDisplay = toNumber(material.unit_price_sek);
										const totalDisplayValue = toNumber(material.total_sek);

										return (
											<li
												key={material.id}
												className="rounded-lg border border-border/60 bg-background p-4 space-y-3"
											>
												<div className="flex items-start justify-between gap-3">
													<div>
														<p className="text-sm font-semibold text-foreground">Material</p>
														<p className="text-sm text-muted-foreground">{material.description}</p>
													</div>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => handleRemoveDraftMaterial(material.id)}
													>
														Ta bort
													</Button>
												</div>
												<div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
													<div>
														<p className="font-medium text-foreground">Antal</p>
														<p>
															{qtyDisplay.toLocaleString('sv-SE', {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}{' '}
															{formatUnitLabel(material.unit)}
														</p>
													</div>
													{qtyDisplay !== 1 ? (
														<div>
															<p className="font-medium text-foreground">À-pris</p>
															<p>
																{unitPriceDisplay.toLocaleString('sv-SE', {
																	minimumFractionDigits: 2,
																	maximumFractionDigits: 2,
																})}{' '}
																SEK
															</p>
														</div>
													) : null}
													<div>
														<p className="font-medium text-foreground">Belopp</p>
														<p>
															{totalDisplayValue.toLocaleString('sv-SE', {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}{' '}
															SEK
														</p>
													</div>
												</div>
											</li>
										);
									})}
								</ul>
							) : (
								<p className="text-sm text-muted-foreground">
									Inga material kopplade ännu. Lägg till via knappen nedan.
								</p>
							)}

							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-fit"
									onClick={handleOpenMaterials}
									disabled={!selectedProjectId || !titleValue?.trim()}
								>
									Lägg till material
								</Button>
								{(!titleValue?.trim() || !selectedProjectId) && (
									<p className="text-xs text-muted-foreground">
										{!titleValue?.trim()
											? 'Ange ett namn på ÄTA:n för att kunna lägga till material.'
											: 'Välj ett projekt för ÄTA:n först.'}
									</p>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{selectedProjectId && (
					<Card className="border-dashed border-border/60 bg-muted/30">
						<CardContent className="p-4 space-y-3">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-sm font-semibold">Utgifter kopplade till denna ÄTA</h3>
									<p className="text-xs text-muted-foreground">
										Lägg till utgiftsposter här – de sparas både i utgiftshistoriken och kopplas till detta
										ÄTA-utkast.
									</p>
								</div>
								{draftExpenses.length > 0 && (
									<Button variant="ghost" size="sm" onClick={handleClearDraftExpenses}>
										Rensa lista
									</Button>
								)}
							</div>

							{isLoadingDraftExpenses ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Laddar kopplade utgifter...
								</div>
							) : draftExpenses.length > 0 ? (
								<ul className="space-y-3">
									{draftExpenses.map((expense) => {
										const amountDisplay = toNumber(expense.amount_sek);

										return (
											<li
												key={expense.id}
												className="rounded-lg border border-border/60 bg-background p-4 space-y-3"
											>
												<div className="flex items-start justify-between gap-3">
													<div>
														<p className="text-sm font-semibold text-foreground">Utgift</p>
														<p className="text-sm text-muted-foreground">{expense.description}</p>
													</div>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => handleRemoveDraftExpense(expense.id)}
													>
														Ta bort
													</Button>
												</div>
												<div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
													<div>
														<p className="font-medium text-foreground">Kategori</p>
														<p>{expense.category || 'Övrigt'}</p>
													</div>
													<div>
														<p className="font-medium text-foreground">Datum</p>
														<p>
															{expense.created_at
																? new Date(expense.created_at).toLocaleDateString('sv-SE')
																: '-'}
														</p>
													</div>
													<div>
														<p className="font-medium text-foreground">Belopp</p>
														<p>
															{amountDisplay.toLocaleString('sv-SE', {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}{' '}
															SEK
														</p>
													</div>
												</div>
											</li>
										);
									})}
								</ul>
							) : (
								<p className="text-sm text-muted-foreground">
									Inga utgifter kopplade ännu. Lägg till via knappen nedan.
								</p>
							)}

							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="w-fit"
									onClick={handleOpenMaterials}
									disabled={!selectedProjectId || !titleValue?.trim()}
								>
									Lägg till utgift
								</Button>
								{(!titleValue?.trim() || !selectedProjectId) && (
									<p className="text-xs text-muted-foreground">
										{!titleValue?.trim()
											? 'Ange ett namn på ÄTA:n för att kunna lägga till utgifter.'
											: 'Välj ett projekt för ÄTA:n först.'}
									</p>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Photo Upload */}
				<div>
					<Label>Foton (max 10)</Label>
					<div className="mt-2 space-y-4">
						{photosPreviews.length > 0 && (
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								{photosPreviews.map((preview, index) => (
									<div key={index} className="relative aspect-square">
										<img
											src={preview}
											alt={`Preview ${index + 1}`}
											className="w-full h-full object-cover rounded-lg"
										/>
										<Button
											type="button"
											variant="destructive"
											size="icon"
											className="absolute top-2 right-2 h-6 w-6"
											onClick={() => removePhoto(index)}
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						)}

						{photos.length < 10 && (
							<PhotoUploadButtons
								onFileChange={handlePhotoChange}
								onCameraChange={handlePhotoChange}
								fileLabel="Välj fil"
								cameraLabel="Ta foto"
								fileButtonVariant="outline"
								cameraButtonVariant="default"
								fileButtonClassName="flex-1"
								cameraButtonClassName="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
							/>
						)}
						<p className="text-xs text-muted-foreground">
							{photos.length} av 10 bilder uppladdade
						</p>
					</div>
				</div>
			</div>

			{/* Signature - optional for draft, required for pending_approval */}
			<div className="border-t pt-6">
				<SignatureInput
					onSign={setSignature}
					label={isWorker ? "Signatur (obligatoriskt)" : "Signatur (valfritt för utkast, obligatoriskt för att skicka för godkännande)"}
					existingSignature={signature}
				/>
				{submitAsPending && !signature && (
					<p className="text-sm text-destructive mt-2">
						Signatur krävs {isWorker ? '' : 'när du skickar för godkännande'}
					</p>
				)}
			</div>

			<div className="flex gap-3 justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						if (onCancel) {
							onCancel();
						} else {
							router.push('/dashboard/ata');
						}
					}}
					disabled={createAtaMutation.isPending}
				>
					Avbryt
				</Button>
				<div className="flex gap-3">
					{!isWorker && (
						<Button
							type="submit"
							variant="outline"
							disabled={createAtaMutation.isPending}
							onClick={() => setSubmitAsPending(false)}
						>
							{createAtaMutation.isPending && !submitAsPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Spara som utkast
						</Button>
					)}
					<Button
						type="submit"
						disabled={createAtaMutation.isPending || !signature}
						onClick={() => setSubmitAsPending(true)}
					>
						{createAtaMutation.isPending && submitAsPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						{isWorker ? 'Skicka för godkännande' : 'Skicka för godkännande'}
					</Button>
				</div>
			</div>
		</form>
		<AddMaterialDialog
			open={isMaterialDialogOpen}
			onClose={() => setIsMaterialDialogOpen(false)}
			orgId={orgId}
			projectId={selectedProjectId || projectId}
			ataTitle={titleValue?.trim() || null}
			projectLocked
			onMaterialCreated={handleMaterialCreated}
			onExpenseCreated={handleExpenseCreated}
		/>
		</>
	);
}
