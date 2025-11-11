'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SimpleDialog } from '@/components/ui/simple-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { SignatureInput } from '@/components/shared/signature-input';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { BillingType } from '@/lib/schemas/billing-types';

interface AtaApprovalDialogProps {
	ata: {
		id: string;
		title: string;
		ata_number?: string | null;
		description?: string | null;
		total_sek?: number | null;
		fixed_amount_sek?: number | null;
		billing_type?: BillingType;
		status: string;
	};
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AtaApprovalDialog({ ata, open, onOpenChange }: AtaApprovalDialogProps) {
	const [action, setAction] = useState<'approve' | 'reject' | null>(null);
	const [comments, setComments] = useState('');
	const [signature, setSignature] = useState<{ name: string; timestamp: string } | null>(null);
	const queryClient = useQueryClient();
	const router = useRouter();

	const approvalMutation = useMutation({
		mutationFn: async () => {
			if (!signature || !action) throw new Error('Signatur krävs');

			const response = await fetch(`/api/ata/${ata.id}/approve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action,
					approved_by_name: signature.name,
					comments,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte uppdatera ÄTA');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['ata'] });
			onOpenChange(false);
			router.refresh();
			// Reset state
			setAction(null);
			setComments('');
			setSignature(null);
		},
	});

	const handleApprove = () => {
		setAction('approve');
	};

	const handleReject = () => {
		setAction('reject');
	};

	const handleSubmit = () => {
		if (!signature || !action) return;
		approvalMutation.mutate();
	};

	const canSubmit = signature && action;

	return (
		<SimpleDialog open={open} onOpenChange={onOpenChange}>
			<div className="space-y-4">
				<div>
					<h2 className="text-2xl font-semibold">
						{action === 'approve' ? '✅ Godkänn ÄTA' : action === 'reject' ? '❌ Avvisa ÄTA' : '📋 Granska ÄTA'}
					</h2>
					<p className="text-base text-muted-foreground mt-1">
						{ata.ata_number && `${ata.ata_number} - `}
						{ata.title}
					</p>
				</div>

				<div className="space-y-6 py-4">
					{/* ÄTA Details */}
					<Card className="border-2">
						<CardContent className="p-6 space-y-4">
							<div>
								<h4 className="text-sm font-semibold text-muted-foreground mb-2">Beskrivning</h4>
								<p className="text-base whitespace-pre-wrap">
									{ata.description || 'Ingen beskrivning'}
								</p>
							</div>

							{ata.billing_type && (
								<p className="text-sm text-muted-foreground">
									Debitering: {ata.billing_type === 'FAST' ? 'Fast' : 'Löpande'}
								</p>
							)}

							{(ata.fixed_amount_sek || ata.total_sek) && (
								<div className="pt-4 border-t">
									<h4 className="text-sm font-semibold text-muted-foreground mb-2">Totalt belopp</h4>
									<p className="text-3xl font-bold text-primary">
										{(ata.fixed_amount_sek ?? ata.total_sek ?? 0).toLocaleString('sv-SE', {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}{' '}
										<span className="text-xl">SEK</span>
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Action buttons */}
					{!action && (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground text-center">
								Välj om du vill godkänna eller avvisa denna ÄTA
							</p>
							<div className="grid grid-cols-2 gap-4">
								<Button
									onClick={handleApprove}
									size="lg"
									className="h-16"
									variant="default"
								>
									<CheckCircle2 className="w-5 h-5 mr-2" />
									<span className="text-lg">Godkänn</span>
								</Button>
								<Button
									onClick={handleReject}
									size="lg"
									className="h-16"
									variant="destructive"
								>
									<XCircle className="w-5 h-5 mr-2" />
									<span className="text-lg">Avvisa</span>
								</Button>
							</div>
						</div>
					)}

					{/* Comments */}
					{action && (
						<Card className={action === 'reject' ? 'border-destructive' : 'border-primary'}>
							<CardContent className="p-6 space-y-4">
								<div>
									<div className="flex items-center gap-2 mb-3">
										{action === 'approve' ? (
											<CheckCircle2 className="w-5 h-5 text-primary" />
										) : (
											<XCircle className="w-5 h-5 text-destructive" />
										)}
										<h3 className="text-lg font-semibold">
											{action === 'approve' ? 'Godkännande' : 'Avvisning'}
										</h3>
									</div>
									<div className="space-y-3">
										<div>
											<Label htmlFor="comments" className="text-base">
												Kommentarer {action === 'reject' && <span className="text-destructive">*</span>}
											</Label>
											<p className="text-xs text-muted-foreground mb-2">
												{action === 'reject' 
													? 'Beskriv varför du avvisar denna ÄTA (obligatoriskt)'
													: 'Lägg till eventuella kommentarer (valfritt)'}
											</p>
											<Textarea
												id="comments"
												value={comments}
												onChange={(e) => setComments(e.target.value)}
												placeholder={action === 'reject' 
													? "Ange anledning till avslag..." 
													: "Lägg till kommentarer..."}
												rows={4}
												className="resize-none"
											/>
										</div>

										<div className="pt-4 border-t">
											<SignatureInput
												onSign={setSignature}
												label={`Signera för att bekräfta ${action === 'approve' ? 'godkännande' : 'avvisning'}`}
												disabled={approvalMutation.isPending}
												existingSignature={signature}
											/>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Submit buttons */}
					{action && (
						<div className="flex gap-3 justify-between pt-2">
							<Button
								type="button"
								variant="outline"
								size="lg"
								onClick={() => {
									setAction(null);
									setComments('');
									setSignature(null);
								}}
								disabled={approvalMutation.isPending}
							>
								← Tillbaka
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={!canSubmit || approvalMutation.isPending || (action === 'reject' && !comments.trim())}
								variant={action === 'approve' ? 'default' : 'destructive'}
								size="lg"
							>
								{approvalMutation.isPending && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								{action === 'approve' ? '✓ Bekräfta godkännande' : '✗ Bekräfta avvisning'}
							</Button>
						</div>
					)}
				</div>
			</div>
		</SimpleDialog>
	);
}

