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

interface Ata {
	id: string;
	ata_number: string | null;
	title: string;
	description: string | null;
	qty: number | null;
	unit: string | null;
	unit_price_sek: number | null;
	total_sek: number | null;
	status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'invoiced';
	created_at: string;
	project: {
		name: string;
		project_number: string | null;
	};
}

interface AtaListProps {
	projectId?: string;
	orgId: string;
	userRole?: 'admin' | 'foreman' | 'worker' | 'finance';
}

const statusConfig = {
	draft: { label: 'Utkast', icon: FileText, variant: 'secondary' as const },
	pending_approval: { label: 'Väntar godkännande', icon: Clock, variant: 'default' as const },
	approved: { label: 'Godkänd', icon: CheckCircle, variant: 'default' as const },
	rejected: { label: 'Avvisad', icon: XCircle, variant: 'destructive' as const },
	invoiced: { label: 'Fakturerad', icon: CheckCircle, variant: 'default' as const },
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

				return (
					<Card key={ata.id} className="hover:shadow-md transition-shadow">
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between">
								<div className="space-y-1 flex-1">
									<div className="flex items-center gap-2">
										{ata.ata_number && (
											<Badge variant="outline">{ata.ata_number}</Badge>
										)}
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
									{canApprove && ata.status === 'pending_approval' && (
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
									{ata.qty && ata.unit && ata.unit_price_sek && (
										<p className="text-muted-foreground">
											{ata.qty} {ata.unit} × {ata.unit_price_sek.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} SEK
										</p>
									)}
									<p className="text-xs text-muted-foreground">
										Skapad: {new Date(ata.created_at).toLocaleDateString('sv-SE')}
									</p>
								</div>
								{ata.total_sek && (
									<div className="text-right">
										<p className="text-xs text-muted-foreground">Totalt:</p>
										<p className="text-lg font-bold">
											{ata.total_sek.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} SEK
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

