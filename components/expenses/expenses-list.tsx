'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Trash2, Loader2, Edit } from 'lucide-react';
import { ExpenseWithRelations } from '@/lib/schemas/expense';

// Lazy load PhotoGalleryViewer - only loads when user opens gallery
const PhotoGalleryViewer = dynamic(() => import('@/components/ui/photo-gallery-viewer').then(m => ({ default: m.PhotoGalleryViewer })), {
	ssr: false,
});

interface ExpensesListProps {
	orgId: string;
	projectId?: string;
	onEdit?: (expense: ExpenseWithRelations) => void;
}

export function ExpensesList({ orgId, projectId, onEdit }: ExpensesListProps) {
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [projectFilter, setProjectFilter] = useState<string>(projectId || 'all');
	const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
	const [isGalleryOpen, setIsGalleryOpen] = useState(false);
	
	const { data: expenses, isLoading, refetch } = useQuery({
		queryKey: ['expenses', orgId, projectFilter, statusFilter],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (projectFilter !== 'all') params.append('project_id', projectFilter);
			if (statusFilter !== 'all') params.append('status', statusFilter);

			const response = await fetch(`/api/expenses?${params.toString()}`);
			if (!response.ok) throw new Error('Failed to fetch expenses');
			
			const data = await response.json();
			return data.expenses as ExpenseWithRelations[];
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

	const handleDelete = async (expenseId: string) => {
		if (!confirm('Är du säker på att du vill ta bort detta utlägg?')) return;

		try {
			const response = await fetch(`/api/expenses/${expenseId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete');
			}

			refetch();
		} catch (error) {
			console.error('Error deleting expense:', error);
			alert('Misslyckades att ta bort utlägg');
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

	const totalAmount = expenses?.reduce((sum, e) => sum + e.amount_sek, 0) || 0;

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

				{expenses && expenses.length > 0 && (
					<div className="flex items-center gap-2 ml-auto">
						<span className="text-sm text-muted-foreground">Total:</span>
						<span className="font-bold text-primary">{totalAmount.toFixed(2)} kr</span>
					</div>
				)}
			</div>

			{!expenses || expenses.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center p-8 text-center">
						<Receipt className="w-12 h-12 text-muted-foreground mb-4" />
						<p className="text-muted-foreground">Inga utlägg hittades</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{expenses.map((expense) => (
						<Card key={expense.id}>
							<CardContent className="p-4">
								<div className="flex gap-4">
						{expense.photo_urls && expense.photo_urls.length > 0 && (
							<div 
								className="relative cursor-pointer hover:opacity-80 transition-opacity" 
								onClick={() => {
									setGalleryPhotos(expense.photo_urls);
									setIsGalleryOpen(true);
								}}
							>
								<img
									src={expense.photo_urls[0]}
									alt="Kvitto"
									className="w-24 h-24 object-cover rounded-md"
								/>
								{expense.photo_urls.length > 1 && (
									<div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
										+{expense.photo_urls.length - 1}
									</div>
								)}
							</div>
									)}
									<div className="flex-1 space-y-2">
										<div className="flex items-start justify-between">
											<div>
												<h4 className="font-medium">{expense.description}</h4>
												<p className="text-sm text-muted-foreground">
													{expense.project.name}
												</p>
											</div>
											{getStatusBadge(expense.status)}
										</div>
										
										<div className="flex flex-wrap gap-4 text-sm">
											{expense.category && (
												<Badge variant="outline">{expense.category}</Badge>
											)}
											<span className="font-semibold text-primary">
												{expense.amount_sek.toFixed(2)} kr
												{expense.vat && <span className="text-xs ml-1">(inkl. moms)</span>}
											</span>
											<span className="text-muted-foreground">
												{new Intl.DateTimeFormat('sv-SE', { dateStyle: 'long' }).format(new Date(expense.created_at))}
											</span>
										</div>

										{expense.notes && (
											<p className="text-sm text-muted-foreground italic">
												{expense.notes}
											</p>
										)}
									</div>

									{expense.status === 'draft' && (
										<div className="flex gap-1">
											<Button
												size="sm"
												variant="ghost"
												onClick={() => onEdit?.(expense)}
												title="Redigera"
											>
												<Edit className="w-4 h-4" />
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => handleDelete(expense.id)}
												title="Ta bort"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Photo Gallery Viewer */}
			<PhotoGalleryViewer
				photos={galleryPhotos}
				isOpen={isGalleryOpen}
				onClose={() => setIsGalleryOpen(false)}
			/>
		</div>
	);
}

