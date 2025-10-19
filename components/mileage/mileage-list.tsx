'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Trash2, Loader2, MapPin } from 'lucide-react';
import { MileageWithRelations } from '@/lib/schemas/mileage';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

interface MileageListProps {
	orgId: string;
	projectId?: string;
}

export function MileageList({ orgId, projectId }: MileageListProps) {
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [projectFilter, setProjectFilter] = useState<string>(projectId || 'all');
	
	const { data: mileage, isLoading, refetch } = useQuery({
		queryKey: ['mileage', orgId, projectFilter, statusFilter],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (projectFilter !== 'all') params.append('project_id', projectFilter);
			if (statusFilter !== 'all') params.append('status', statusFilter);

			const response = await fetch(`/api/mileage?${params.toString()}`);
			if (!response.ok) throw new Error('Failed to fetch mileage');
			
			const data = await response.json();
			return data.mileage as MileageWithRelations[];
		},
	});

	const { data: projects } = useQuery({
		queryKey: ['active-projects', orgId],
		queryFn: async () => {
			const supabase = (await import('@/lib/supabase/client')).createClient();
			const { data, error } = await supabase
				.from('projects')
				.select('id, name')
				.eq('org_id', orgId)
				.order('name');

			if (error) throw error;
			return data || [];
		},
	});

	const handleDelete = async (mileageId: string) => {
		if (!confirm('Är du säker på att du vill ta bort denna milersättning?')) return;

		try {
			const response = await fetch(`/api/mileage/${mileageId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete');
			}

			refetch();
		} catch (error) {
			console.error('Error deleting mileage:', error);
			alert('Misslyckades att ta bort milersättning');
		}
	};

	const getStatusBadge = (status: string) => {
		const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
			draft: { label: 'Utkast', variant: 'outline' },
			submitted: { label: 'Inskickad', variant: 'default' },
			approved: { label: 'Godkänd', variant: 'default' },
			rejected: { label: 'Avvisad', variant: 'destructive' },
		};

		const config = variants[status] || { label: status, variant: 'outline' };
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	const totalKm = mileage?.reduce((sum, m) => sum + m.km, 0) || 0;
	const totalAmount = mileage?.reduce((sum, m) => sum + m.total_sek, 0) || 0;

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-col sm:flex-row gap-3">
				{!projectId && (
					<Select value={projectFilter} onValueChange={setProjectFilter}>
						<SelectTrigger className="w-full sm:w-64">
							<SelectValue placeholder="Alla projekt" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Alla projekt</SelectItem>
							{projects?.map((project) => (
								<SelectItem key={project.id} value={project.id}>
									{project.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-full sm:w-48">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Alla status</SelectItem>
						<SelectItem value="draft">Utkast</SelectItem>
						<SelectItem value="submitted">Inskickad</SelectItem>
						<SelectItem value="approved">Godkänd</SelectItem>
					</SelectContent>
				</Select>

				{mileage && mileage.length > 0 && (
					<div className="flex items-center gap-4 ml-auto">
						<div className="text-sm">
							<span className="text-muted-foreground">Total: </span>
							<span className="font-medium">{totalKm.toFixed(1)} km</span>
						</div>
						<div className="text-sm">
							<span className="font-bold text-primary">{totalAmount.toFixed(2)} kr</span>
						</div>
					</div>
				)}
			</div>

			{!mileage || mileage.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center p-8 text-center">
						<Car className="w-12 h-12 text-muted-foreground mb-4" />
						<p className="text-muted-foreground">Inga milersättningar hittades</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{mileage.map((entry) => (
						<Card key={entry.id}>
							<CardContent className="p-4">
								<div className="flex items-start justify-between">
									<div className="flex-1 space-y-2">
										<div className="flex items-start justify-between">
											<div>
												<h4 className="font-medium">{entry.project.name}</h4>
												<p className="text-sm text-muted-foreground">
													{format(parseISO(entry.date), 'PPP', { locale: sv })}
												</p>
											</div>
											{getStatusBadge(entry.status)}
										</div>
										
										<div className="flex flex-wrap gap-4 text-sm">
											<span>
												<strong>{entry.km.toFixed(1)} km</strong>
												<span className="text-muted-foreground ml-1">
													({(entry.km / 10).toFixed(1)} mil)
												</span>
											</span>
											<span className="text-muted-foreground">
												× {entry.rate_per_km_sek.toFixed(2)} kr/km
											</span>
											<span className="font-semibold text-primary">
												= {entry.total_sek.toFixed(2)} kr
											</span>
										</div>

										{(entry.from_location || entry.to_location) && (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<MapPin className="w-3 h-3" />
												<span>
													{entry.from_location || '?'} → {entry.to_location || '?'}
												</span>
											</div>
										)}

										{entry.notes && (
											<p className="text-sm text-muted-foreground italic">
												{entry.notes}
											</p>
										)}
									</div>

									{entry.status === 'draft' && (
										<Button
											size="sm"
											variant="ghost"
											onClick={() => handleDelete(entry.id)}
										>
											<Trash2 className="w-4 h-4" />
										</Button>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

