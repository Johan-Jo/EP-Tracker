'use client';

import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	Package,
	Receipt,
	FileText,
	MapPin,
	Mail,
	XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useInvoiceBasisGrouped, InvoiceBasisEntry } from '@/lib/hooks/use-invoice-basis-grouped';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface InvoicePendingApprovalsProps {
	projectIds: string[];
	from: string;
	to: string;
	canApprove: boolean;
	onApprovalsComplete: () => void;
}

const typeConfig = {
	time: {
		label: 'Tid',
		icon: Clock,
		color: 'text-blue-600',
		bgColor: 'bg-blue-50 dark:bg-blue-950/20',
	},
	material: {
		label: 'Material',
		icon: Package,
		color: 'text-green-600',
		bgColor: 'bg-green-50 dark:bg-green-950/20',
	},
	expense: {
		label: 'Utlägg',
		icon: Receipt,
		color: 'text-orange-600',
		bgColor: 'bg-orange-50 dark:bg-orange-950/20',
	},
	mileage: {
		label: 'Mil/Resor',
		icon: MapPin,
		color: 'text-purple-600',
		bgColor: 'bg-purple-50 dark:bg-purple-950/20',
	},
	ata: {
		label: 'ÄTA',
		icon: FileText,
		color: 'text-indigo-600',
		bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
	},
} as const;

type EntryType = keyof typeof typeConfig;

/**
 * Step 2: Pending Approvals Panel
 * 
 * Shows pending entries grouped by type with role-based actions.
 * Admin: can approve/deny with checkboxes
 * Finance: read-only with reminder button
 */
export function InvoicePendingApprovals({
	projectIds,
	from,
	to,
	canApprove,
	onApprovalsComplete,
}: InvoicePendingApprovalsProps) {
	const [selectedIds, setSelectedIds] = useState<Record<EntryType, Set<string>>>({
		time: new Set(),
		material: new Set(),
		expense: new Set(),
		mileage: new Set(),
		ata: new Set(),
	});
	const [openTypes, setOpenTypes] = useState<Set<EntryType>>(new Set(['time', 'material', 'expense', 'mileage', 'ata']));
	const [showReminderDialog, setShowReminderDialog] = useState(false);
	const [detailEntry, setDetailEntry] = useState<InvoiceBasisEntry | null>(null);
	const [detailType, setDetailType] = useState<EntryType | null>(null);
	const [ataCostBreakdown, setAtaCostBreakdown] = useState<{
		labor: number;
		materials: number;
		expenses: number;
		total: number;
	} | null>(null);
	const supabase = createClient();

	// När en ÄTA-post öppnas i detaljdialogen, hämta material- och utläggssummor
	useEffect(() => {
		const fetchAtaBreakdown = async () => {
			if (!detailEntry || detailType !== 'ata') {
				setAtaCostBreakdown(null);
				return;
			}

			const ataId = (detailEntry as any).id;
			if (!ataId) {
				setAtaCostBreakdown(null);
				return;
			}

			try {
				// Hämta material kopplade till ÄTA
				const { data: materials, error: materialsError } = await supabase
					.from('materials')
					.select('total_sek')
					.eq('ata_id', ataId);

				if (materialsError) {
					console.error('Kunde inte hämta ÄTA-material för breakdown', materialsError);
				}

				// Hämta utlägg kopplade till ÄTA
				const { data: expenses, error: expensesError } = await supabase
					.from('expenses')
					.select('amount_sek')
					.eq('ata_id', ataId);

				if (expensesError) {
					console.error('Kunde inte hämta ÄTA-utlägg för breakdown', expensesError);
				}

				const materialsSum =
					materials?.reduce((sum, row: any) => {
						const value = Number(row.total_sek ?? 0);
						return sum + (Number.isFinite(value) ? value : 0);
					}, 0) ?? 0;

				const expensesSum =
					expenses?.reduce((sum, row: any) => {
						const value = Number(row.amount_sek ?? 0);
						return sum + (Number.isFinite(value) ? value : 0);
					}, 0) ?? 0;

				setAtaCostBreakdown((prev) => ({
					labor: prev?.labor ?? 0,
					materials: materialsSum,
					expenses: expensesSum,
					total: (prev?.labor ?? 0) + materialsSum + expensesSum,
				}));
			} catch (error) {
				console.error('Ov�ntat fel vid h�mtning av ÄTA-breakdown', error);
				setAtaCostBreakdown(null);
			}
		};

		void fetchAtaBreakdown();
	}, [detailEntry, detailType, supabase]);
	const queryClient = useQueryClient();

	const { data: basisData, isLoading, refetch } = useInvoiceBasisGrouped({
		projectIds,
		from,
		to,
		enabled: projectIds.length > 0 && !!from && !!to,
	});

	const pending = basisData?.pending || {
		time: [],
		material: [],
		expense: [],
		mileage: [],
		ata: [],
	};

	// Calculate totals per type
	// Helper to resolve ÄTA-belopp så att det matchar ÄTA-detaljsidan
	const resolveAtaAmount = (entry: any): number => {
		if (!entry) return 0;
		const billingType = entry.billing_type ?? 'LOPANDE';
		const labor =
			billingType === 'FAST'
				? Number(entry.fixed_amount_sek)
				: Number(entry.total_sek);
		const materials = Number(entry.materials_amount_sek);
		const laborValue = Number.isFinite(labor) ? labor : 0;
		const materialsValue = Number.isFinite(materials) ? materials : 0;
		return laborValue + materialsValue;
	};

	const typeTotals = useMemo(() => {
		const totals: Record<EntryType, { count: number; total: number }> = {
			time: { count: 0, total: 0 },
			material: { count: 0, total: 0 },
			expense: { count: 0, total: 0 },
			mileage: { count: 0, total: 0 },
			ata: { count: 0, total: 0 },
		};

		Object.entries(pending).forEach(([type, entries]) => {
			const entriesArray = entries as InvoiceBasisEntry[];
			totals[type as EntryType].count = entriesArray.length;
			totals[type as EntryType].total = entriesArray.reduce((sum, entry) => {
				if (type === 'time') {
					const duration = (entry as any).duration_min || 0;
					const rate = (entry as any).user?.hourly_rate_sek || 0;
					return sum + (duration / 60) * rate;
				}
				if (type === 'material') return sum + ((entry as any).total_sek || 0);
				if (type === 'expense') return sum + ((entry as any).amount_sek || 0);
				if (type === 'mileage') return sum + ((entry as any).total_sek || 0);
				if (type === 'ata') return sum + resolveAtaAmount(entry as any);
				return sum;
			}, 0);
		});

		return totals;
	}, [pending]);

	const totalPendingCount = Object.values(typeTotals).reduce((sum, t) => sum + t.count, 0);
	const hasPending = totalPendingCount > 0;

	const approveMutation = useMutation({
		mutationFn: async ({ type, ids, action }: { type: EntryType; ids: string[]; action: 'approve' | 'deny' }) => {
			const response = await fetch('/api/invoice/approve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, ids, action }),
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte godkänna poster');
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success('Poster uppdaterade');
			// Clear selections
			setSelectedIds({
				time: new Set(),
				material: new Set(),
				expense: new Set(),
				mileage: new Set(),
				ata: new Set(),
			});
			// Refetch data
			refetch();
			// Check if all approved
			setTimeout(() => {
				if (!hasPending) {
					onApprovalsComplete();
				}
			}, 500);
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte uppdatera poster');
		},
	});

	const sendReminderMutation = useMutation({
		mutationFn: async () => {
			const summary = Object.entries(pending).reduce((acc, [type, entries]) => {
				acc[type] = {
					count: entries.length,
					total: typeTotals[type as EntryType].total,
				};
				return acc;
			}, {} as Record<string, { count: number; total: number }>);

			const response = await fetch('/api/invoice/remind-approvals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectIds,
					from,
					to,
					summary,
				}),
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte skicka påminnelse');
			}
			return response.json();
		},
		onSuccess: (data) => {
			toast.success(`Påminnelse skickad till ${data.adminsNotified} administratör(er)`);
			setShowReminderDialog(false);
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte skicka påminnelse');
		},
	});

	const toggleSelection = (type: EntryType, id: string) => {
		setSelectedIds((prev) => {
			const newSet = new Set(prev[type]);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return { ...prev, [type]: newSet };
		});
	};

	const toggleType = (type: EntryType) => {
		setOpenTypes((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(type)) {
				newSet.delete(type);
			} else {
				newSet.add(type);
			}
			return newSet;
		});
	};

	const handleApprove = (type: EntryType, ids: string[]) => {
		approveMutation.mutate({ type, ids, action: 'approve' });
	};

	const handleDeny = (type: EntryType, ids: string[]) => {
		approveMutation.mutate({ type, ids, action: 'deny' });
	};

	const handleApproveAll = (type: EntryType) => {
		const entries = pending[type] as InvoiceBasisEntry[];
		const ids = entries.map((e) => e.id);
		handleApprove(type, ids);
	};

	const formatDate = (dateStr: string) => {
		try {
			return format(new Date(dateStr), 'PPP', { locale: sv });
		} catch {
			return dateStr;
		}
	};

	const formatAmount = (amount: number) => {
		return `${amount.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-12">
					<div className="text-center">
						<Clock className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
						<p className="mt-4 text-sm text-muted-foreground">Hämtar godkännanden...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!hasPending) {
		return (
			<Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
				<CardContent className="flex items-center gap-3 py-6">
					<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
					<div className="flex-1">
						<p className="font-medium text-green-900 dark:text-green-100">
							Alla relevanta poster för vald period är godkända.
						</p>
						<p className="text-sm text-green-700 dark:text-green-300">
							Du kan nu gå vidare till fakturaunderlag.
						</p>
					</div>
					<Button onClick={onApprovalsComplete} size="sm">
						Gå vidare till fakturaunderlag
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			{/* Warning Banner */}
			<Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
				<CardContent className="flex items-center gap-3 py-6">
					<AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
					<div className="flex-1">
						<p className="font-medium text-amber-900 dark:text-amber-100">
							Det finns poster som inte är godkända.
						</p>
						<p className="text-sm text-amber-700 dark:text-amber-300">
							Du kan inte skapa fakturaunderlag förrän de är hanterade.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Finance: Reminder Section */}
			{!canApprove && (
				<Card>
					<CardContent className="py-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">
									Det finns {totalPendingCount} poster som inte är godkända.
								</p>
								<p className="text-sm text-muted-foreground">
									Kontakta en administratör eller skicka en påminnelse.
								</p>
							</div>
							<Button onClick={() => setShowReminderDialog(true)} variant="outline">
								<Mail className="mr-2 h-4 w-4" />
								Skicka påminnelse till admin
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Pending Approvals by Type */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Väntande godkännanden</h3>
				{(Object.entries(pending) as [EntryType, InvoiceBasisEntry[]][]).map(([type, entries]) => {
					if (entries.length === 0) return null;

					const config = typeConfig[type];
					const Icon = config.icon;
					const selectedCount = selectedIds[type].size;
					const total = typeTotals[type];

					return (
						<Card key={type} className={cn('overflow-hidden', config.bgColor)}>
							<Collapsible open={openTypes.has(type)} onOpenChange={() => toggleType(type)}>
								<CollapsibleTrigger asChild>
									<CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												{openTypes.has(type) ? (
													<ChevronDown className="h-4 w-4" />
												) : (
													<ChevronRight className="h-4 w-4" />
												)}
												<Icon className={cn('h-5 w-5', config.color)} />
												<div>
													<CardTitle className="text-base">{config.label}</CardTitle>
													<CardDescription>
														Antal poster: {total.count} | Total ex moms: {formatAmount(total.total)}
													</CardDescription>
												</div>
											</div>
											{canApprove && selectedCount > 0 && (
												<Badge variant="secondary">{selectedCount} valda</Badge>
											)}
										</div>
									</CardHeader>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<CardContent className="space-y-4">
										{/* Admin Actions */}
										{canApprove && (
											<div className="flex flex-wrap gap-2">
												<Button
													size="sm"
													onClick={() => handleApprove(type, Array.from(selectedIds[type]))}
													disabled={selectedCount === 0 || approveMutation.isPending}
												>
													<CheckCircle2 className="mr-2 h-4 w-4" />
													Godkänn markerade ({selectedCount})
												</Button>
												<Button
													size="sm"
													variant="destructive"
													onClick={() => handleDeny(type, Array.from(selectedIds[type]))}
													disabled={selectedCount === 0 || approveMutation.isPending}
												>
													<XCircle className="mr-2 h-4 w-4" />
													Neka markerade ({selectedCount})
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => handleApproveAll(type)}
													disabled={approveMutation.isPending}
												>
													Godkänn alla ({entries.length})
												</Button>
											</div>
										)}

										{/* Entries Table */}
										<div className="overflow-x-auto rounded-lg border border-border/60">
											<table className="min-w-full divide-y divide-border/60">
												<thead className="bg-muted/60">
													<tr>
														{canApprove && (
															<th className="px-3 py-2 text-left">
																<Checkbox
																	checked={
																		entries.length > 0 &&
																		entries.every((e) => selectedIds[type].has(e.id))
																	}
																	onCheckedChange={(checked) => {
																		if (checked) {
																			setSelectedIds((prev) => ({
																				...prev,
																				[type]: new Set(entries.map((e) => e.id)),
																			}));
																		} else {
																			setSelectedIds((prev) => ({
																				...prev,
																				[type]: new Set(),
																			}));
																		}
																	}}
																/>
															</th>
														)}
														<th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
															Datum
														</th>
														{type === 'time' && (
															<th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
																Arbetare
															</th>
														)}
														<th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
															Projekt
														</th>
														<th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
															Beskrivning
														</th>
														<th className="px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">
															{type === 'time' ? 'Timmar' : 'Belopp'}
														</th>
														<th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
															Status
														</th>
														<th className="px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">
															Info
														</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-border/60 bg-background">
													{entries.map((entry) => {
														const isSelected = selectedIds[type].has(entry.id);
														const date =
															type === 'time'
																? (entry as any).start_at
																: type === 'mileage'
																? (entry as any).date
																: (entry as any).created_at;
														const amount =
															type === 'time'
																? ((entry as any).duration_min || 0) / 60
																: type === 'ata'
																? resolveAtaAmount(entry as any)
																: (entry as any).total_sek || (entry as any).amount_sek || 0;

														return (
															<tr key={entry.id} className={cn(isSelected && 'bg-primary/5')}>
																{canApprove && (
																	<td className="px-3 py-2">
																		<Checkbox
																			checked={isSelected}
																			onCheckedChange={() => toggleSelection(type, entry.id)}
																		/>
																	</td>
																)}
																<td className="px-3 py-2 text-sm">{formatDate(date)}</td>
																{type === 'time' && (
																	<td className="px-3 py-2 text-sm">
																		{(entry as any).user?.full_name || '–'}
																	</td>
																)}
																<td className="px-3 py-2 text-sm">
																	{(entry as any).project?.name || '–'}
																</td>
																<td className="px-3 py-2 text-sm">
																	{type === 'time'
																		? (entry as any).task_label || (entry as any).notes || '–'
																		: type === 'material'
																		? (entry as any).description || '–'
																		: type === 'expense'
																		? (entry as any).description || '–'
																		: type === 'mileage'
																		? `${(entry as any).from_location || ''} → ${(entry as any).to_location || ''}`.trim() || '–'
																		: type === 'ata'
																		? (entry as any).title || '–'
																		: '–'}
																</td>
																<td className="px-3 py-2 text-right text-sm">
																	{type === 'time'
																		? `${amount.toFixed(2)} h`
																		: formatAmount(amount)}
																</td>
																<td className="px-3 py-2">
																	<Badge variant={entry.status === 'submitted' ? 'default' : 'secondary'}>
																		{entry.status === 'submitted' ? 'Väntar' : entry.status}
																	</Badge>
																</td>
																<td className="px-3 py-2 text-right">
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => {
																			setDetailType(type);
																			setDetailEntry(entry);
																		}}
																	>
																		Visa
																	</Button>
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</CardContent>
								</CollapsibleContent>
							</Collapsible>
						</Card>
					);
				})}
			</div>

			{/* Reminder Dialog */}
			<Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Skicka påminnelse till administratörer</DialogTitle>
						<DialogDescription>
							En e-post kommer att skickas till alla administratörer i organisationen med sammanfattning av väntande godkännanden.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div>
							<p className="text-sm font-medium">Projekt:</p>
							<p className="text-sm text-muted-foreground">
								{projectIds.length} projekt valda
							</p>
						</div>
						<div>
							<p className="text-sm font-medium">Period:</p>
							<p className="text-sm text-muted-foreground">
								{formatDate(from)} till {formatDate(to)}
							</p>
						</div>
						<div>
							<p className="text-sm font-medium">Sammanfattning:</p>
							<div className="mt-2 space-y-1 rounded-md bg-muted p-3 text-sm">
								{Object.entries(typeTotals).map(([type, total]) => {
									if (total.count === 0) return null;
									return (
										<div key={type} className="flex justify-between">
											<span>{typeConfig[type as EntryType].label}:</span>
											<span className="font-medium">
												{total.count} poster, {formatAmount(total.total)}
											</span>
										</div>
									);
								})}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowReminderDialog(false)}>
							Avbryt
						</Button>
						<Button onClick={() => sendReminderMutation.mutate()} disabled={sendReminderMutation.isPending}>
							{sendReminderMutation.isPending ? 'Skickar...' : 'Skicka påminnelse'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Detail Dialog */}
			<Dialog
				open={!!detailEntry}
				onOpenChange={(open) => {
					if (!open) {
						setDetailEntry(null);
						setDetailType(null);
						setAtaCostBreakdown(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Detaljer för {detailType ? typeConfig[detailType].label : 'post'}</DialogTitle>
						<DialogDescription>
							Granska innehållet innan du godkänner eller nekar posten. Belopp och text motsvarar det som
							hamnar på fakturaunderlaget.
						</DialogDescription>
					</DialogHeader>

					{detailEntry && (
						<div className="space-y-3 text-sm">
							<div className="grid grid-cols-2 gap-2">
								<div>
									<p className="text-xs font-semibold text-muted-foreground">Datum</p>
									<p>
										{formatDate(
											detailType === 'time'
												? (detailEntry as any).start_at
												: detailType === 'mileage'
												? (detailEntry as any).date
												: (detailEntry as any).created_at
										)}
									</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-muted-foreground">Projekt</p>
									<p>{(detailEntry as any).project?.name || '–'}</p>
								</div>
							</div>

							{detailType === 'time' && (
								<div className="grid grid-cols-2 gap-2">
									<div>
										<p className="text-xs font-semibold text-muted-foreground">Arbetare</p>
										<p>{(detailEntry as any).user?.full_name || '–'}</p>
									</div>
									<div>
										<p className="text-xs font-semibold text-muted-foreground">Timmar</p>
										<p>
											{(((detailEntry as any).duration_min || 0) / 60).toLocaleString('sv-SE', {
												minimumFractionDigits: 2,
											})}{' '}
											h
										</p>
									</div>
								</div>
							)}

							{detailType === 'ata' && (() => {
								const entry = detailEntry as any;
								const billingType = entry.billing_type ?? 'LOPANDE';

								// Beräkna arbetstid (samma som i ÄTA-detaljsidan)
								const laborRaw =
									billingType === 'FAST'
										? Number(entry.fixed_amount_sek ?? 0)
										: Number(entry.total_sek ?? 0);
								const labor = Number.isFinite(laborRaw) ? laborRaw : 0;

								// Plocka upp breakdown som vi hämtar från materials/expenses
								const materials = ataCostBreakdown?.materials ?? 0;
								const expenses = ataCostBreakdown?.expenses ?? 0;
								const total = labor + materials + expenses;

								return (
									<div className="space-y-4">
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
											<div>
												<p className="text-xs font-semibold text-muted-foreground">ÄTA-nummer</p>
												<p>{entry.ata_number || '–'}</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-muted-foreground">Rubrik</p>
												<p>{entry.title || '–'}</p>
											</div>
											<div>
												<p className="text-xs font-semibold text-muted-foreground">Debitering</p>
												<p>{billingType === 'FAST' ? 'Fast belopp' : 'Löpande (tid & material)'}</p>
											</div>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
											<div className="rounded-lg border border-border/60 bg-muted/40 p-3">
												<p className="text-xs font-semibold text-muted-foreground">Arbetstid</p>
												<p className="text-sm">
													{formatAmount(labor)}
												</p>
											</div>
											<div className="rounded-lg border border-border/60 bg-muted/40 p-3">
												<p className="text-xs font-semibold text-muted-foreground">Material</p>
												<p className="text-sm">
													{formatAmount(materials)}
												</p>
											</div>
											<div className="rounded-lg border border-border/60 bg-muted/40 p-3">
												<p className="text-xs font-semibold text-muted-foreground">Utlägg</p>
												<p className="text-sm">
													{formatAmount(expenses)}
												</p>
											</div>
											<div className="rounded-lg border border-border/60 bg-muted/40 p-3">
												<p className="text-xs font-semibold text-muted-foreground">Totalt exkl. moms</p>
												<p className="text-sm font-semibold">
													{formatAmount(total)}
												</p>
											</div>
										</div>
									</div>
								);
							})()}

							<div>
								<p className="text-xs font-semibold text-muted-foreground">Beskrivning / anteckningar</p>
								<p className="whitespace-pre-wrap">
									{detailType === 'time'
										? (detailEntry as any).notes || (detailEntry as any).task_label || '–'
										: detailType === 'material' || detailType === 'expense'
										? (detailEntry as any).description || '–'
										: detailType === 'mileage'
										? (detailEntry as any).notes ||
										  `${(detailEntry as any).from_location || ''} → ${(detailEntry as any).to_location || ''}`.trim() ||
										  '–'
										: detailType === 'ata'
										? (detailEntry as any).description || '–'
										: '–'}
								</p>
							</div>

							<div className="grid grid-cols-2 gap-2">
								<div>
									<p className="text-xs font-semibold text-muted-foreground">Belopp exkl. moms</p>
									<p>
										{formatAmount(
											detailType === 'ata'
												? resolveAtaAmount(detailEntry as any)
												: (detailEntry as any).total_sek ||
												  (detailEntry as any).amount_sek ||
												  0
										)}
									</p>
								</div>
								<div>
									<p className="text-xs font-semibold text-muted-foreground">Status</p>
									<div className="inline-flex items-center gap-2">
										<Badge variant={detailEntry.status === 'submitted' ? 'default' : 'secondary'}>
											{detailEntry.status === 'submitted' ? 'Väntar' : detailEntry.status}
										</Badge>
									</div>
								</div>
							</div>
						</div>
					)}

					<DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						{detailType === 'ata' && detailEntry && (
							<Button asChild variant="ghost" className="justify-start px-0 sm:px-3">
								<a href={`/dashboard/ata/${(detailEntry as any).id}`} target="_blank" rel="noreferrer">
									Se fullständig ÄTA-sida
								</a>
							</Button>
						)}
						<Button
							variant="outline"
							onClick={() => {
								setDetailEntry(null);
								setDetailType(null);
							}}
						>
							Stäng
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

