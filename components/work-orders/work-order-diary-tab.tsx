'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Calendar, FileText, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { GalleryViewer } from '@/components/shared/gallery-viewer';

interface WorkOrderDiaryTabProps {
	workOrderId: string;
	projectId: string;
	orgId: string;
}

export function WorkOrderDiaryTab({
	workOrderId,
	projectId,
	orgId,
}: WorkOrderDiaryTabProps) {
	const supabase = createClient();
	const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
	const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null);

	// Fetch diary entries for this work order
	const { data: diaryEntries, isLoading } = useQuery({
		queryKey: ['work-order-diary-entries', workOrderId],
		queryFn: async () => {
			const response = await fetch(`/api/diary?work_order_id=${workOrderId}`);
			if (!response.ok) {
				throw new Error('Kunde inte hämta dagboksposter');
			}
			const data = await response.json();
			return data.diary || [];
		},
	});

	// Fetch photos for all diary entries
	const entryIds = diaryEntries?.map((e: any) => e.id) || [];
	const { data: allPhotos } = useQuery({
		queryKey: ['work-order-diary-photos', entryIds],
		queryFn: async () => {
			if (entryIds.length === 0) return [];
			const { data, error } = await supabase
				.from('diary_photos')
				.select('*')
				.in('diary_entry_id', entryIds)
				.order('sort_order');

			if (error) throw error;
			return data || [];
		},
		enabled: entryIds.length > 0,
	});

	// Group photos by diary entry ID
	const photosByEntry = (allPhotos || []).reduce((acc: any, photo: any) => {
		if (!acc[photo.diary_entry_id]) {
			acc[photo.diary_entry_id] = [];
		}
		acc[photo.diary_entry_id].push(photo);
		return acc;
	}, {});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!diaryEntries || diaryEntries.length === 0) {
		return (
			<Card>
				<CardContent className="py-12">
					<div className="text-center">
						<FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
						<p className="text-muted-foreground mb-4">Inga dagboksposter kopplade till denna arbetsorder ännu.</p>
						<Button asChild variant="outline">
							<Link href={`/dashboard/diary/new?project_id=${projectId}&work_order_id=${workOrderId}`}>
								<Plus className="w-4 h-4 mr-2" />
								Skapa dagbokspost
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">Dagboksposter ({diaryEntries.length})</h3>
				<Button asChild variant="outline">
					<Link href={`/dashboard/diary/new?project_id=${projectId}&work_order_id=${workOrderId}`}>
						<Plus className="w-4 h-4 mr-2" />
						Skapa dagbokspost
					</Link>
				</Button>
			</div>

			<div className="space-y-4">
				{diaryEntries.map((entry: any) => (
					<Card key={entry.id}>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Calendar className="w-4 h-4 text-muted-foreground" />
									<CardTitle className="text-base">
										{format(new Date(entry.date), 'EEEE d MMMM yyyy', { locale: sv })}
									</CardTitle>
								</div>
								<Button asChild variant="ghost" size="sm">
									<Link href={`/dashboard/diary/${entry.id}`}>
										Öppna
									</Link>
								</Button>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{entry.work_performed && (
								<div>
									<p className="text-sm font-medium text-muted-foreground mb-1">Utfört arbete</p>
									<p className="text-sm whitespace-pre-wrap">{entry.work_performed}</p>
								</div>
							)}
							{entry.obstacles && (
								<div>
									<p className="text-sm font-medium text-muted-foreground mb-1">Hinder/problem</p>
									<p className="text-sm whitespace-pre-wrap">{entry.obstacles}</p>
								</div>
							)}
							{entry.safety_notes && (
								<div>
									<p className="text-sm font-medium text-muted-foreground mb-1">Säkerhet</p>
									<p className="text-sm whitespace-pre-wrap">{entry.safety_notes}</p>
								</div>
							)}
							<div className="flex items-center gap-4 text-sm text-muted-foreground">
								{entry.weather && (
									<span>
										Väder: {entry.weather === 'sunny' ? '☀️ Soligt' :
											entry.weather === 'partly_cloudy' ? '⛅ Halvklart' :
											entry.weather === 'cloudy' ? '☁️ Molnigt' :
											entry.weather === 'rainy' ? '🌧️ Regn' :
											entry.weather === 'snow' ? '❄️ Snö' :
											entry.weather === 'windy' ? '💨 Blåsigt' : entry.weather}
									</span>
								)}
								{entry.temperature_c !== null && entry.temperature_c !== undefined && (
									<span>Temp: {entry.temperature_c}°C</span>
								)}
								{entry.crew_count !== null && entry.crew_count !== undefined && (
									<span>Bemanning: {entry.crew_count}</span>
								)}
							</div>
							{/* Photos */}
							{photosByEntry[entry.id] && photosByEntry[entry.id].length > 0 && (
								<div className="mt-4">
									<p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
										<ImageIcon className="w-4 h-4" />
										Foton ({photosByEntry[entry.id].length})
									</p>
									<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
										{photosByEntry[entry.id].map((photo: any, index: number) => (
											<div
												key={photo.id}
												className="relative aspect-square cursor-pointer overflow-hidden rounded-lg border hover:border-primary transition-colors"
												onClick={() => {
													setSelectedDiaryId(entry.id);
													setSelectedImageIndex(index);
												}}
											>
												<img
													src={photo.photo_url}
													alt={`Foto ${index + 1}`}
													className="w-full h-full object-cover"
												/>
											</div>
										))}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				))}
			</div>

			{/* Gallery Viewer */}
			{selectedDiaryId && photosByEntry[selectedDiaryId] && selectedImageIndex !== null && (
				<GalleryViewer
					images={photosByEntry[selectedDiaryId].map((p: any) => p.photo_url)}
					initialIndex={selectedImageIndex}
					onClose={() => {
						setSelectedImageIndex(null);
						setSelectedDiaryId(null);
					}}
				/>
			)}
		</div>
	);
}

