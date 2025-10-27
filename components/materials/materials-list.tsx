'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Trash2, Loader2, Edit } from 'lucide-react';
import { MaterialWithRelations } from '@/lib/schemas/material';

// Lazy load PhotoGalleryViewer - only loads when user opens gallery
const PhotoGalleryViewer = dynamic(() => import('@/components/ui/photo-gallery-viewer').then(m => ({ default: m.PhotoGalleryViewer })), {
	ssr: false,
});

interface MaterialsListProps {
	orgId: string;
	projectId?: string;
	onEdit?: (material: MaterialWithRelations) => void;
}

export function MaterialsList({ orgId, projectId, onEdit }: MaterialsListProps) {
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [projectFilter, setProjectFilter] = useState<string>(projectId || 'all');
	const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
	const [isGalleryOpen, setIsGalleryOpen] = useState(false);
	
	const { data: materials, isLoading, refetch } = useQuery({
		queryKey: ['materials', orgId, projectFilter, statusFilter],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (projectFilter !== 'all') params.append('project_id', projectFilter);
			if (statusFilter !== 'all') params.append('status', statusFilter);

			const response = await fetch(`/api/materials?${params.toString()}`);
			if (!response.ok) throw new Error('Failed to fetch materials');
			
			const data = await response.json();
			return data.materials as MaterialWithRelations[];
		},
		staleTime: 1 * 60 * 1000,  // 1 minute (materials change more frequently)
		gcTime: 5 * 60 * 1000,      // 5 minutes
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

	const handleDelete = async (materialId: string) => {
		if (!confirm('Är du säker på att du vill ta bort detta material?')) return;

		try {
			const response = await fetch(`/api/materials/${materialId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete');
			}

			refetch();
		} catch (error) {
			console.error('Error deleting material:', error);
			alert('Misslyckades att ta bort material');
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
			</div>

		{!materials || materials.length === 0 ? (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardContent className="flex flex-col items-center justify-center p-8 text-center">
						<Package className="w-12 h-12 text-muted-foreground mb-4" />
						<p className="text-muted-foreground">Inga material hittades</p>
					</CardContent>
				</Card>
			) : (
			<div className="grid gap-4">
				{materials.map((material) => (
					<Card key={material.id} className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
						<CardContent className="p-4">
								<div className="flex gap-4">
					{material.photo_urls && material.photo_urls.length > 0 && (
						<div 
							className="relative cursor-pointer hover:opacity-80 transition-opacity"
							onClick={() => {
								setGalleryPhotos(material.photo_urls);
								setIsGalleryOpen(true);
							}}
						>
							<Image
								src={material.photo_urls[0]}
								alt={material.description}
								width={96}
								height={96}
								className="w-24 h-24 object-cover rounded-md"
							/>
							{material.photo_urls.length > 1 && (
								<div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
									+{material.photo_urls.length - 1}
								</div>
							)}
						</div>
					)}
									<div className="flex-1 space-y-2">
										<div className="flex items-start justify-between">
											<div>
												<h4 className="font-medium">{material.description}</h4>
												<p className="text-sm text-muted-foreground">
													{material.project.name}
												</p>
											</div>
											{getStatusBadge(material.status)}
										</div>
										
										<div className="flex flex-wrap gap-4 text-sm">
											<span>
												<strong>Antal:</strong> {material.qty} {material.unit}
											</span>
											<span>
												<strong>Á-pris:</strong> {material.unit_price_sek} kr
											</span>
											<span className="font-semibold text-primary">
												<strong>Totalt:</strong> {material.total_sek} kr
											</span>
										</div>

										{material.notes && (
											<p className="text-sm text-muted-foreground italic">
												{material.notes}
											</p>
										)}
									</div>

									{material.status === 'draft' && (
										<div className="flex gap-1">
											<Button
												size="sm"
												variant="ghost"
												onClick={() => onEdit?.(material)}
												title="Redigera"
											>
												<Edit className="w-4 h-4" />
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => handleDelete(material.id)}
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

