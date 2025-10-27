'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Cloud, Thermometer, ImageIcon, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GalleryViewer } from '@/components/shared/gallery-viewer';

interface DiaryDetailClientProps {
	diaryId: string;
}

const weatherEmojis: Record<string, string> = {
	sunny: '☀️ Soligt',
	partly_cloudy: '⛅ Halvklart',
	cloudy: '☁️ Molnigt',
	rainy: '🌧️ Regn',
	snow: '❄️ Snö',
	windy: '💨 Blåsigt',
};

export function DiaryDetailClient({ diaryId }: DiaryDetailClientProps) {
	const supabase = createClient();
	const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

	const { data: diary, isLoading } = useQuery({
		queryKey: ['diary', diaryId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('diary_entries')
				.select(`
					*,
					project:projects(name, project_number)
				`)
				.eq('id', diaryId)
				.single();

			if (error) throw error;
			return data;
		},
	});

	const { data: photos } = useQuery({
		queryKey: ['diary-photos', diaryId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('diary_photos')
				.select('*')
				.eq('diary_entry_id', diaryId)
				.order('sort_order');

			if (error) throw error;
			return data;
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-muted-foreground">Laddar dagbokspost...</div>
			</div>
		);
	}

	if (!diary) {
		return (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">Dagbokspost hittades inte</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="max-w-4xl space-y-6">
			{/* Header Card */}
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="space-y-2">
							<CardTitle className="text-2xl">
								Dagbok - {new Date(diary.date).toLocaleDateString('sv-SE', { 
									weekday: 'long', 
									year: 'numeric', 
									month: 'long', 
									day: 'numeric' 
								})}
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								Projekt: {diary.project.project_number ? `${diary.project.project_number} - ` : ''}{diary.project.name}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2 mt-4">
						<Badge variant="outline" className="flex items-center gap-1">
							<Calendar className="h-3 w-3" />
							{new Date(diary.date).toLocaleDateString('sv-SE')}
						</Badge>
						{diary.weather && (
							<Badge variant="secondary">
								{weatherEmojis[diary.weather]}
							</Badge>
						)}
						{diary.temperature_c !== null && (
							<Badge variant="secondary" className="flex items-center gap-1">
								<Thermometer className="h-3 w-3" />
								{diary.temperature_c}°C
							</Badge>
						)}
						{diary.crew_count !== null && diary.crew_count > 0 && (
							<Badge variant="secondary" className="flex items-center gap-1">
								<Users className="h-3 w-3" />
								{diary.crew_count} personer
							</Badge>
						)}
					</div>
				</CardHeader>
			</Card>

		{/* Work Performed */}
		{diary.work_performed && (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
						<CardTitle>Utfört arbete</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{diary.work_performed}</p>
					</CardContent>
				</Card>
			)}

		{/* Obstacles */}
		{diary.obstacles && (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
						<CardTitle>Hinder/Problem</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{diary.obstacles}</p>
					</CardContent>
				</Card>
			)}

		{/* Safety Notes */}
		{diary.safety_notes && (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
					<CardTitle>Säkerhet</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{diary.safety_notes}</p>
					</CardContent>
				</Card>
			)}

		{/* Deliveries */}
		{diary.deliveries && (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
					<CardTitle>Leveranser</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{diary.deliveries}</p>
					</CardContent>
				</Card>
			)}

		{/* Visitors */}
		{diary.visitors && (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
					<CardTitle>Besökare</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{diary.visitors}</p>
					</CardContent>
				</Card>
			)}

		{/* Photos */}
		{photos && photos.length > 0 && (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ImageIcon className="h-5 w-5" />
							Foton ({photos.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{photos.map((photo, index) => (
								<div
									key={photo.id}
									className="relative aspect-square cursor-pointer overflow-hidden rounded-lg border hover:border-primary transition-colors"
									onClick={() => setSelectedImageIndex(index)}
								>
									<img
										src={photo.photo_url}
										alt={`Foto ${index + 1}`}
										className="w-full h-full object-cover"
									/>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

	{/* Signature */}
	{diary.signature_name && (
		<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
			<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CheckCircle className="h-5 w-5 text-primary" />
							Signatur
						</CardTitle>
					</CardHeader>
				<CardContent>
					<p className="text-sm">
						<strong>Signerad av:</strong> {diary.signature_name}
					</p>
					<p className="text-sm text-muted-foreground mt-1">
						{new Date(diary.signature_timestamp!).toLocaleString('sv-SE')}
					</p>
				</CardContent>
				</Card>
			)}

			{/* Gallery Viewer */}
			{photos && selectedImageIndex !== null && (
				<GalleryViewer
					images={photos.map((p) => p.photo_url)}
					initialIndex={selectedImageIndex}
					onClose={() => setSelectedImageIndex(null)}
				/>
			)}
		</div>
	);
}

