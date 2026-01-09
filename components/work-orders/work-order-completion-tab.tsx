'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileText, Save, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { WorkOrderWithRelations } from '@/lib/schemas/work-order';

interface WorkOrderCompletionTabProps {
	workOrder: WorkOrderWithRelations;
	canEdit: boolean;
}

export function WorkOrderCompletionTab({ workOrder, canEdit }: WorkOrderCompletionTabProps) {
	const queryClient = useQueryClient();
	const [externalSummary, setExternalSummary] = useState(workOrder.external_summary || '');
	const [isEditing, setIsEditing] = useState(false);

	const updateMutation = useMutation({
		mutationFn: async (data: { external_summary?: string; status?: string; closed_at?: string; closed_by_id?: string }) => {
			const response = await fetch(`/api/work-orders/${workOrder.id}`, {
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
			queryClient.invalidateQueries({ queryKey: ['work-order', workOrder.id] });
			queryClient.invalidateQueries({ queryKey: ['work-orders'] });
			setIsEditing(false);
			toast.success('Arbetsorder uppdaterad');
		},
		onError: (error: Error) => {
			toast.error(error.message);
		},
	});

	const handleMarkAsComplete = () => {
		if (!externalSummary.trim()) {
			toast.error('Extern sammanfattning krävs för att markera arbetsordern som klar');
			return;
		}

		updateMutation.mutate({
			external_summary: externalSummary.trim(),
			status: 'KLAR',
		});
	};

	const handleSaveSummary = () => {
		updateMutation.mutate({
			external_summary: externalSummary.trim(),
		});
	};

	const handleCancel = () => {
		setExternalSummary(workOrder.external_summary || '');
		setIsEditing(false);
	};

	const getStatusBadge = (status: string) => {
		const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
			PLANERAD: { label: 'Planerad', variant: 'outline' },
			PÅGÅENDE: { label: 'Pågående', variant: 'default' },
			KLAR: { label: 'Klar', variant: 'default' },
			FAKTURERAD: { label: 'Fakturerad', variant: 'default' },
			AVBOKAD: { label: 'Avbokad', variant: 'destructive' },
		};
		const config = variants[status] || { label: status, variant: 'outline' as const };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const isCompleted = workOrder.status === 'KLAR' || workOrder.status === 'FAKTURERAD';
	const canComplete = canEdit && !isCompleted;

	return (
		<div className="space-y-6">
			{/* Completion Status */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CheckCircle2 className="h-5 w-5" />
						Status
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						{getStatusBadge(workOrder.status)}
					</div>
					{isCompleted && (
						<div className="space-y-2 pt-2 border-t">
							{workOrder.closed_at && (
								<p className="text-sm text-muted-foreground">
									Stängd: {new Date(workOrder.closed_at).toLocaleDateString('sv-SE', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
									})}
								</p>
							)}
							{workOrder.closed_by && (
								<p className="text-sm text-muted-foreground">
									Stängd av: {workOrder.closed_by.full_name || workOrder.closed_by.email}
								</p>
							)}
						</div>
					)}
					{!isCompleted && (
						<p className="text-sm text-muted-foreground">
							Arbetsordern är inte klar ännu. Fyll i extern sammanfattning och markera som klar när arbetet är färdigt.
						</p>
					)}
				</CardContent>
			</Card>

			{/* External Summary */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Extern sammanfattning (för fakturering)
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{isEditing || !workOrder.external_summary ? (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="external_summary">
									Beskrivning för fakturering <span className="text-destructive">*</span>
								</Label>
								<Textarea
									id="external_summary"
									value={externalSummary}
									onChange={(e) => setExternalSummary(e.target.value)}
									placeholder="Beskriv arbetet som utförts på ett sätt som passar för fakturering..."
									rows={6}
									className="min-h-[150px] resize-y"
								/>
								<p className="text-xs text-muted-foreground">
									Denna text kommer att användas i fakturor. Beskriv arbetet tydligt och professionellt.
								</p>
							</div>
							<div className="flex gap-2">
								{canComplete ? (
									<Button
										onClick={handleMarkAsComplete}
										disabled={updateMutation.isPending || !externalSummary.trim()}
									>
										<CheckCircle2 className="h-4 w-4 mr-2" />
										Spara och markera som klar
									</Button>
								) : (
									<Button
										onClick={handleSaveSummary}
										disabled={updateMutation.isPending || !externalSummary.trim()}
									>
										<Save className="h-4 w-4 mr-2" />
										Spara
									</Button>
								)}
								{workOrder.external_summary && (
									<Button
										variant="outline"
										onClick={handleCancel}
										disabled={updateMutation.isPending}
									>
										<X className="h-4 w-4 mr-2" />
										Avbryt
									</Button>
								)}
							</div>
						</div>
					) : (
						<div className="space-y-4">
							<div className="p-4 rounded-md bg-muted/50">
								<p className="whitespace-pre-wrap">{workOrder.external_summary}</p>
							</div>
							{canEdit && (
								<Button variant="outline" onClick={() => setIsEditing(true)}>
									<Edit2 className="h-4 w-4 mr-2" />
									Redigera sammanfattning
								</Button>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Completion Instructions */}
			{!isCompleted && canComplete && (
				<Card className="border-border bg-white dark:bg-gray-950">
					<CardContent className="pt-6">
						<div className="space-y-2">
							<p className="font-medium">För att markera arbetsordern som klar:</p>
							<ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
								<li>Fyll i extern sammanfattning ovan</li>
								<li>Klicka på "Spara och markera som klar"</li>
								<li>Arbetsordern kommer då att markeras som "Klar" och kan faktureras</li>
							</ol>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
