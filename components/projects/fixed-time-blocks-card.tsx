'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/lib/query-keys';
import {
	type FixedTimeBlock,
	type FixedTimeBlockInput,
	type UpdateFixedTimeBlockInput,
	fixedTimeBlockSchema,
	fixedTimeBlockUpdateSchema,
} from '@/lib/schemas/fixed-time-block';

interface FixedTimeBlocksCardProps {
	projectId: string;
	canEdit: boolean;
	billingMode: string;
	quotedAmountSek: number | null;
	projectHourlyRateSek: number | null;
}

type FormState = FixedTimeBlockInput;

function formatAmount(amount: number | null | undefined) {
	if (!amount) return '–';
	return new Intl.NumberFormat('sv-SE', {
		style: 'currency',
		currency: 'SEK',
		maximumFractionDigits: 0,
	}).format(amount);
}

function formatDate(date: string | null | undefined) {
	if (!date) return '–';
	return format(new Date(date), 'PPP', { locale: sv });
}

export function FixedTimeBlocksCard({
	projectId,
	canEdit,
	billingMode,
	quotedAmountSek,
	projectHourlyRateSek,
}: FixedTimeBlocksCardProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingBlock, setEditingBlock] = useState<FixedTimeBlock | null>(null);
	const queryClient = useQueryClient();

	const { data, isLoading, error } = useQuery({
		queryKey: queryKeys.fixedTimeBlocks.list(projectId),
		queryFn: async () => {
			const res = await fetch(`/api/fixed-time-blocks?projectId=${projectId}`);
			if (!res.ok) {
				throw new Error(await res.text());
			}
			const json = await res.json();
			return (json.blocks as FixedTimeBlock[]) || [];
		},
	});

	const defaultValues = useMemo<FormState>(
		() => ({
			project_id: projectId,
			name: '',
			description: null,
			amount_sek: quotedAmountSek ?? 0,
			vat_pct: 25,
			article_no: null,
			account_no: null,
			period_start: null,
			period_end: null,
		}),
		[projectId, quotedAmountSek],
	);

	const form = useForm<FormState>({
		resolver: zodResolver(fixedTimeBlockSchema),
		defaultValues,
	});

	const billingModeLabel = useMemo(() => {
		switch (billingMode) {
			case 'FAST_ONLY':
				return 'Endast Fast';
			case 'BOTH':
				return 'Löpande & Fast';
			case 'LOPANDE_ONLY':
			default:
				return 'Endast Löpande';
		}
	}, [billingMode]);

	const createMutation = useMutation({
		mutationFn: async (payload: FormState) => {
			const res = await fetch('/api/fixed-time-blocks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				throw new Error((await res.json()).error || 'Kunde inte skapa fast post');
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.fixedTimeBlocks.list(projectId) });
			setDialogOpen(false);
			form.reset(defaultValues);
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (payload: UpdateFixedTimeBlockInput & { id: string }) => {
			const { id, ...rest } = payload;
			const res = await fetch(`/api/fixed-time-blocks/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(rest),
			});
			if (!res.ok) {
				throw new Error((await res.json()).error || 'Kunde inte uppdatera fast post');
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.fixedTimeBlocks.list(projectId) });
			setDialogOpen(false);
			setEditingBlock(null);
			form.reset(defaultValues);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/fixed-time-blocks/${id}`, {
				method: 'DELETE',
			});
			if (!res.ok) {
				throw new Error((await res.json()).error || 'Kunde inte ta bort fast post');
			}
			return true;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.fixedTimeBlocks.list(projectId) });
		},
	});

	const openCreateDialog = () => {
		form.reset(defaultValues);
		setEditingBlock(null);
		setDialogOpen(true);
	};

	const openEditDialog = (block: FixedTimeBlock) => {
		form.reset({
			project_id: block.project_id,
			name: block.name,
			description: block.description,
			amount_sek: block.amount_sek,
			vat_pct: block.vat_pct,
			article_no: block.article_no,
			account_no: block.account_no,
			period_start: block.period_start,
			period_end: block.period_end,
		});
		setEditingBlock(block);
		setDialogOpen(true);
	};

	const handleSubmit = form.handleSubmit((values) => {
		if (editingBlock) {
			const parsed = fixedTimeBlockUpdateSchema.safeParse(values);
			if (!parsed.success) {
				form.setError('name', { message: 'Kontrollera formuläret' });
				return;
			}
			updateMutation.mutate({ id: editingBlock.id, ...parsed.data });
		} else {
			createMutation.mutate(values);
		}
	});

	const handleDelete = async (block: FixedTimeBlock) => {
		if (!confirm(`Är du säker på att du vill ta bort ${block.name}?`)) return;
		try {
			await deleteMutation.mutateAsync(block.id);
		} catch (err) {
			console.error(err);
			alert(err instanceof Error ? err.message : 'Kunde inte ta bort posten');
		}
	};

	return (
		<Card className='rounded-2xl border border-border/60 shadow-sm'>
			<CardHeader className='rounded-t-2xl bg-muted/40 pb-4 dark:bg-white/5'>
				<div className='flex items-start justify-between gap-4'>
					<div>
						<CardTitle className='text-xl text-foreground dark:text-white'>Fasta poster</CardTitle>
						<CardDescription className='text-muted-foreground dark:text-white/70'>
							Hanterar fasta fakturaposter för projektet
						</CardDescription>
					</div>
					{canEdit && (
						<Button onClick={openCreateDialog} disabled={createMutation.isPending || updateMutation.isPending}>
							Ny fast post
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className='pt-6 space-y-4'>
				<div className='grid gap-4 md:grid-cols-3'>
					<div className='rounded-lg border border-border/60 p-3'>
						<p className='text-xs text-muted-foreground'>Standardläge</p>
						<p className='text-sm font-medium'>{billingModeLabel}</p>
					</div>
					<div className='rounded-lg border border-border/60 p-3'>
						<p className='text-xs text-muted-foreground'>Offertbelopp</p>
						<p className='text-sm font-medium'>{formatAmount(quotedAmountSek)}</p>
					</div>
					<div className='rounded-lg border border-border/60 p-3'>
						<p className='text-xs text-muted-foreground'>Timpris (löpande)</p>
						<p className='text-sm font-medium'>{formatAmount(projectHourlyRateSek)}</p>
					</div>
				</div>

				{isLoading && <p className='text-sm text-muted-foreground'>Laddar fasta poster...</p>}
				{error && (
					<p className='text-sm text-destructive'>Kunde inte hämta fasta poster. Försök igen senare.</p>
				)}

				{!isLoading && !error && (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Namn</TableHead>
								<TableHead>Belopp</TableHead>
								<TableHead>Moms %</TableHead>
								<TableHead>Period</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className='w-[120px]' />
							</TableRow>
						</TableHeader>
						<TableBody>
							{(data ?? []).length === 0 && (
								<TableRow>
									<TableCell colSpan={6} className='text-muted-foreground'>
										Inga fasta poster skapade ännu.
									</TableCell>
								</TableRow>
							)}
							{(data ?? []).map((block) => (
								<TableRow key={block.id}>
									<TableCell className='font-medium'>{block.name}</TableCell>
									<TableCell>{formatAmount(block.amount_sek)}</TableCell>
									<TableCell>{block.vat_pct ?? 25}%</TableCell>
									<TableCell>
										{formatDate(block.period_start)}
										{block.period_end ? ` – ${formatDate(block.period_end)}` : ''}
									</TableCell>
									<TableCell className='capitalize'>{block.status}</TableCell>
									<TableCell className='text-right space-x-2'>
										{canEdit && (
											<>
												<Button
													variant='outline'
													size='sm'
													onClick={() => openEditDialog(block)}
													disabled={updateMutation.isPending}
												>
													Redigera
												</Button>
												<Button
													variant='ghost'
													size='sm'
													onClick={() => handleDelete(block)}
													disabled={deleteMutation.isPending}
												>
													Ta bort
												</Button>
											</>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className='max-w-lg'>
					<DialogHeader>
						<DialogTitle>{editingBlock ? 'Redigera fast post' : 'Ny fast post'}</DialogTitle>
						<DialogDescription>
							{editingBlock
								? 'Uppdatera uppgifter för den fasta posten.'
								: 'Ange uppgifter för den fasta posten.'}
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleSubmit} className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='name'>Namn</Label>
							<Input id='name' {...form.register('name')} placeholder='Ex: Delbetalning 1' />
							{form.formState.errors.name && (
								<p className='text-sm text-destructive'>{form.formState.errors.name.message}</p>
							)}
						</div>
						<div className='space-y-2'>
							<Label htmlFor='description'>Beskrivning</Label>
							<Textarea
								id='description'
								rows={3}
								{...form.register('description')}
								placeholder='Kort beskrivning av vad posten avser'
							/>
							{form.formState.errors.description && (
								<p className='text-sm text-destructive'>
									{form.formState.errors.description.message}
								</p>
							)}
						</div>
						<div className='grid md:grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='amount_sek'>Belopp (SEK)</Label>
								<Input
									id='amount_sek'
									type='number'
									step='1'
									{...form.register('amount_sek', { valueAsNumber: true })}
								/>
								{form.formState.errors.amount_sek && (
									<p className='text-sm text-destructive'>
										{form.formState.errors.amount_sek.message}
									</p>
								)}
							</div>
							<div className='space-y-2'>
								<Label htmlFor='vat_pct'>Moms %</Label>
								<Input
									id='vat_pct'
									type='number'
									step='0.1'
									{...form.register('vat_pct', { valueAsNumber: true })}
								/>
								{form.formState.errors.vat_pct && (
									<p className='text-sm text-destructive'>{form.formState.errors.vat_pct.message}</p>
								)}
							</div>
						</div>
						<div className='grid md:grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='period_start'>Period från</Label>
								<Input id='period_start' type='date' {...form.register('period_start')} />
								{form.formState.errors.period_start && (
									<p className='text-sm text-destructive'>
										{form.formState.errors.period_start.message}
									</p>
								)}
							</div>
							<div className='space-y-2'>
								<Label htmlFor='period_end'>Period till</Label>
								<Input id='period_end' type='date' {...form.register('period_end')} />
								{form.formState.errors.period_end && (
									<p className='text-sm text-destructive'>
										{form.formState.errors.period_end.message}
									</p>
								)}
							</div>
						</div>
						<div className='grid md:grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='article_no'>Artikelnummer</Label>
								<Input id='article_no' {...form.register('article_no')} />
							</div>
							<div className='space-y-2'>
								<Label htmlFor='account_no'>Konto</Label>
								<Input id='account_no' {...form.register('account_no')} />
							</div>
						</div>

						<DialogFooter className='flex gap-2'>
							<Button
								type='button'
								variant='outline'
								onClick={() => {
									setDialogOpen(false);
									setEditingBlock(null);
									form.reset(defaultValues);
								}}
								disabled={createMutation.isPending || updateMutation.isPending}
							>
								Avbryt
							</Button>
							<Button
								type='submit'
								disabled={createMutation.isPending || updateMutation.isPending}
							>
								{editingBlock ? 'Spara ändring' : 'Skapa fast post'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

