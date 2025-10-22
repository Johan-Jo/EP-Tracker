'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
	Calendar, 
	Users, 
	Thermometer, 
	ImageIcon, 
	CheckCircle, 
	FileText,
	AlertTriangle,
	Shield,
	Package,
	UserCheck,
	Sun,
	Cloud,
	CloudRain,
	CloudSnow,
	Wind
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GalleryViewer } from '@/components/shared/gallery-viewer';

interface DiaryDetailNewProps {
	diaryId: string;
}

const weatherConfig: Record<string, { label: string; icon: typeof Sun; color: string }> = {
	sunny: { label: 'Soligt', icon: Sun, color: 'text-yellow-500' },
	partly_cloudy: { label: 'Halvklart', icon: Cloud, color: 'text-gray-400' },
	cloudy: { label: 'Molnigt', icon: Cloud, color: 'text-gray-500' },
	rainy: { label: 'Regn', icon: CloudRain, color: 'text-blue-500' },
	snow: { label: 'Snö', icon: CloudSnow, color: 'text-blue-300' },
	windy: { label: 'Blåsigt', icon: Wind, color: 'text-gray-500' },
};

export function DiaryDetailNew({ diaryId }: DiaryDetailNewProps) {
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
			<div className='flex items-center justify-center py-12'>
				<div className='text-muted-foreground'>Laddar dagbokspost...</div>
			</div>
		);
	}

	if (!diary) {
		return (
			<Card className='border-2'>
				<CardContent className='py-12 text-center'>
					<p className='text-muted-foreground'>Dagbokspost hittades inte</p>
				</CardContent>
			</Card>
		);
	}

	const weatherInfo = diary.weather ? weatherConfig[diary.weather] : null;
	const WeatherIcon = weatherInfo?.icon;

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			<main className='px-4 md:px-8 py-6 max-w-5xl mx-auto space-y-4'>
				{/* Header Card */}
				<Card className='border-2 border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200'>
					<CardHeader className='pb-4'>
						<div className='space-y-3'>
							<CardTitle className='text-2xl md:text-3xl font-bold'>
								Dagbok - {new Date(diary.date).toLocaleDateString('sv-SE', { 
									weekday: 'long', 
									year: 'numeric', 
									month: 'long', 
									day: 'numeric' 
								})}
							</CardTitle>
							<p className='text-base text-muted-foreground'>
								<span className='font-medium'>Projekt:</span> {diary.project?.project_number ? `${diary.project.project_number} - ` : ''}{diary.project?.name}
							</p>
						</div>
						
						{/* Key Details Row */}
						<div className='flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-border'>
							<div className='flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20'>
								<Calendar className='w-5 h-5 text-primary' />
								<span className='text-sm font-medium'>{new Date(diary.date).toLocaleDateString('sv-SE')}</span>
							</div>
							
							{weatherInfo && WeatherIcon && (
								<div className='flex items-center gap-2 px-4 py-2 bg-muted rounded-lg'>
									<WeatherIcon className={`w-5 h-5 ${weatherInfo.color}`} />
									<span className='text-sm font-medium'>{weatherInfo.label}</span>
									{diary.temperature_c !== null && (
										<span className='text-sm text-muted-foreground ml-1'>
											{diary.temperature_c}°C
										</span>
									)}
								</div>
							)}
							
							{diary.crew_count !== null && diary.crew_count > 0 && (
								<div className='flex items-center gap-2 px-4 py-2 bg-muted rounded-lg'>
									<Users className='w-5 h-5 text-muted-foreground' />
									<span className='text-sm font-medium'>{diary.crew_count} personer</span>
								</div>
							)}
						</div>
					</CardHeader>
				</Card>

				{/* Work Performed */}
				{diary.work_performed && (
					<Card className='border-2 border-border hover:border-primary/30 hover:shadow-md transition-all duration-200'>
						<CardHeader className='pb-4'>
							<CardTitle className='flex items-center gap-2 text-lg'>
								<div className='p-2 rounded-lg bg-blue-100'>
									<FileText className='w-5 h-5 text-blue-600' />
								</div>
								Utfört arbete
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-base whitespace-pre-wrap leading-relaxed'>{diary.work_performed}</p>
						</CardContent>
					</Card>
				)}

				{/* Obstacles */}
				{diary.obstacles && (
					<Card className='border-2 border-border hover:border-orange-300 hover:shadow-md transition-all duration-200'>
						<CardHeader className='pb-4'>
							<CardTitle className='flex items-center gap-2 text-lg'>
								<div className='p-2 rounded-lg bg-orange-100'>
									<AlertTriangle className='w-5 h-5 text-orange-600' />
								</div>
								Hinder/Problem
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-base whitespace-pre-wrap leading-relaxed'>{diary.obstacles}</p>
						</CardContent>
					</Card>
				)}

				{/* Safety Notes */}
				{diary.safety_notes && (
					<Card className='border-2 border-border hover:border-green-300 hover:shadow-md transition-all duration-200'>
						<CardHeader className='pb-4'>
							<CardTitle className='flex items-center gap-2 text-lg'>
								<div className='p-2 rounded-lg bg-green-100'>
									<Shield className='w-5 h-5 text-green-600' />
								</div>
								Säkerhet
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-base whitespace-pre-wrap leading-relaxed'>{diary.safety_notes}</p>
						</CardContent>
					</Card>
				)}

				{/* Deliveries */}
				{diary.deliveries && (
					<Card className='border-2 border-border hover:border-purple-300 hover:shadow-md transition-all duration-200'>
						<CardHeader className='pb-4'>
							<CardTitle className='flex items-center gap-2 text-lg'>
								<div className='p-2 rounded-lg bg-purple-100'>
									<Package className='w-5 h-5 text-purple-600' />
								</div>
								Leveranser
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-base whitespace-pre-wrap leading-relaxed'>{diary.deliveries}</p>
						</CardContent>
					</Card>
				)}

				{/* Visitors */}
				{diary.visitors && (
					<Card className='border-2 border-border hover:border-cyan-300 hover:shadow-md transition-all duration-200'>
						<CardHeader className='pb-4'>
							<CardTitle className='flex items-center gap-2 text-lg'>
								<div className='p-2 rounded-lg bg-cyan-100'>
									<UserCheck className='w-5 h-5 text-cyan-600' />
								</div>
								Besökare
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-base whitespace-pre-wrap leading-relaxed'>{diary.visitors}</p>
						</CardContent>
					</Card>
				)}

				{/* Photos */}
				{photos && photos.length > 0 && (
					<Card className='border-2 border-border hover:border-primary/30 hover:shadow-md transition-all duration-200'>
						<CardHeader className='pb-4'>
							<CardTitle className='flex items-center gap-2 text-lg'>
								<div className='p-2 rounded-lg bg-purple-100'>
									<ImageIcon className='w-5 h-5 text-purple-600' />
								</div>
								Foton ({photos.length})
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
								{photos.map((photo, index) => (
									<div
										key={photo.id}
										className='relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 border-border hover:border-primary hover:shadow-lg hover:scale-105 transition-all duration-200'
										onClick={() => setSelectedImageIndex(index)}
									>
										<img
											src={photo.photo_url}
											alt={`Foto ${index + 1}`}
											className='w-full h-full object-cover'
										/>
										<div className='absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200' />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Signature */}
				{diary.signed_by_name && (
					<Card className='border-2 border-green-200 bg-green-50/50 hover:shadow-md transition-all duration-200'>
						<CardHeader className='pb-4'>
							<CardTitle className='flex items-center gap-2 text-lg'>
								<div className='p-2 rounded-lg bg-green-100'>
									<CheckCircle className='w-5 h-5 text-green-600' />
								</div>
								Signatur
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-2'>
								<p className='text-base'>
									<span className='font-medium'>Signerad av:</span> {diary.signed_by_name}
								</p>
								<p className='text-sm text-muted-foreground'>
									{new Date(diary.signed_at!).toLocaleString('sv-SE', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
										second: '2-digit'
									})}
								</p>
							</div>
						</CardContent>
					</Card>
				)}
			</main>

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

