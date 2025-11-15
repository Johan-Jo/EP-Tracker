'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, CheckCircle, XCircle, Clock, ClipboardCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { AtaApprovalDialog } from './ata-approval-dialog';
import type { BillingType } from '@/lib/schemas/billing-types';

interface Ata {
	id: string;
	ata_number: string | null;
	title: string;
	description: string | null;
	qty: number | null;
	unit: string | null;
	unit_price_sek: number | null;
	total_sek: number | null;
	fixed_amount_sek: number | null;
	materials_amount_sek: number | null;
	billing_type: BillingType;
	status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'invoiced';
	created_at: string;
	project: {
		name: string;
		project_number: string | null;
	};
}

interface AtaListProps {
	projectId?: string;
	orgId: string;
	userRole?: 'admin' | 'foreman' | 'worker' | 'finance' | 'ue';
}

const statusConfig = {
	draft: { label: 'Utkast', icon: FileText, variant: 'secondary' as const },
	submitted: { label: 'Väntar godkännande', icon: Clock, variant: 'default' as const },
	approved: { label: 'Godkänd', icon: CheckCircle, variant: 'default' as const },
	rejected: { label: 'Avvisad', icon: XCircle, variant: 'destructive' as const },
	invoiced: { label: 'Fakturerad', icon: CheckCircle, variant: 'default' as const },
};

const billingBadgeStyles: Record<BillingType, string> = {
	FAST: 'bg-orange-500/20 text-orange-700 border-orange-300 dark:bg-[#3a251c] dark:text-[#f8ddba] dark:border-[#4a2f22]',
	LOPANDE: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
};

const toNumber = (value: unknown): number => {
	if (value === null || value === undefined) return 0;
	if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

export function AtaList({ projectId, orgId, userRole }: AtaListProps) {
	const supabase = createClient();
	const [selectedAtaForApproval, setSelectedAtaForApproval] = useState<Ata | null>(null);

	const canApprove = userRole === 'admin' || userRole === 'foreman';

	const { data: ataList, isLoading } = useQuery({
		queryKey: ['ata', orgId, projectId],
		queryFn: async () => {
			let query = supabase
				.from('ata')
				.select(`
					*,
					project:projects(name, project_number)
				`)
				.eq('org_id', orgId)
				.order('created_at', { ascending: false });

			if (projectId) {
				query = query.eq('project_id', projectId);
			}

			const { data, error } = await query;

			if (error) throw error;
			return data as Ata[];
		},
		staleTime: 2 * 60 * 1000,  // 2 minutes (ÄTA entries don't change often)
		gcTime: 5 * 60 * 1000,      // 5 minutes
	});

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<Card key={i} className="animate-pulse">
						<CardContent className="p-6">
							<div className="h-6 bg-muted rounded w-3/4 mb-2" />
							<div className="h-4 bg-muted rounded w-1/2" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (!ataList || ataList.length === 0) {
		return (
			<Card>
				<CardContent className="p-12 text-center">
					<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
				<h3 className="text-lg font-semibold mb-2">Inga ÄTA-poster</h3>
				<p className="text-muted-foreground">
					Klicka på &quot;Ny ÄTA&quot; för att skapa en ändrings- eller tilläggsarbete
				</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{ataList.map((ata) => {
				const config = statusConfig[ata.status];
				const StatusIcon = config.icon;
				const laborAmount =
					ata.billing_type === 'FAST'
						? toNumber(ata.fixed_amount_sek)
						: toNumber(ata.total_sek);
				const materialsAmount = toNumber(ata.materials_amount_sek);
				const totalAmount = laborAmount + materialsAmount;
				const billingLabel = ata.billing_type === 'FAST' ? 'FAST' : 'LÖPANDE';
				const qtyDisplay =
					ata.billing_type === 'LOPANDE' ? toNumber(ata.qty) : 0;
				const unitPriceDisplay =
					ata.billing_type === 'LOPANDE' ? toNumber(ata.unit_price_sek) : 0;

				return (
					<Card key={ata.id} className="hover:shadow-md transition-shadow">
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between">
								<div className="space-y-1 flex-1">
									<div className="flex items-center gap-2">
										{ata.ata_number && (
											<Badge variant="outline">{ata.ata_number}</Badge>
										)}
										<span
											className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${billingBadgeStyles[ata.billing_type]}`}
										>
											{billingLabel}
										</span>
										<Badge variant={config.variant} className="flex items-center gap-1">
											<StatusIcon className="h-3 w-3" />
											{config.label}
										</Badge>
									</div>
									<CardTitle className="text-lg">{ata.title}</CardTitle>
									{ata.description && (
										<p className="text-sm text-muted-foreground line-clamp-2">
											{ata.description}
										</p>
									)}
								</div>
								<div className="flex gap-2">
									{canApprove && ata.status === 'submitted' && (
										<Button
											variant="default"
											size="sm"
											onClick={() => setSelectedAtaForApproval(ata)}
										>
											<ClipboardCheck className="h-4 w-4 mr-2" />
											Godkänn
										</Button>
									)}
									<Button variant="ghost" size="icon" asChild>
										<Link href={`/dashboard/ata/${ata.id}`}>
											<Eye className="h-4 w-4" />
										</Link>
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="flex items-center justify-between text-sm">
								<div className="space-y-1">
									<p className="text-muted-foreground">
										Projekt: {ata.project.project_number ? `${ata.project.project_number} - ` : ''}{ata.project.name}
									</p>
									{ata.billing_type === 'LOPANDE' && qtyDisplay > 0 && unitPriceDisplay > 0 && (
										<p className="text-muted-foreground">
											{qtyDisplay.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
											{ata.unit ?? 'tim'} ×{' '}
											{unitPriceDisplay.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK
										</p>
									)}
									{ata.billing_type === 'FAST' && ata.fixed_amount_sek !== null && (
										<p className="text-muted-foreground">
											Fast belopp: {ata.fixed_amount_sek.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} SEK
										</p>
									)}
									{materialsAmount > 0 && (
										<p className="text-muted-foreground">
											Material: {materialsAmount.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} SEK
										</p>
									)}
									<p className="text-xs text-muted-foreground">
										Skapad: {new Date(ata.created_at).toLocaleDateString('sv-SE')}
									</p>
								</div>
								{totalAmount > 0 && (
									<div className="text-right">
										<p className="text-xs text-muted-foreground">Totalt:</p>
										<p className="text-lg font-bold">
											{totalAmount.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} SEK
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				);
				})}
			</div>

			{selectedAtaForApproval && (
				<AtaApprovalDialog
					ata={selectedAtaForApproval}
					open={!!selectedAtaForApproval}
					onOpenChange={(open) => {
						if (!open) setSelectedAtaForApproval(null);
					}}
				/>
			)}
		</>
	);
}

