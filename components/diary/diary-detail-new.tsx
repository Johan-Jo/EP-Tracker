'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { formatPlainDate, formatSwedishFull } from '@/lib/utils/formatPlainDate';

interface DiaryDetailNewProps {
    diaryId: string;
    autoEdit?: boolean;
}

const weatherConfig: Record<string, { label: string; icon: typeof Sun; color: string }> = {
	sunny: { label: 'Soligt', icon: Sun, color: 'text-yellow-500' },
	partly_cloudy: { label: 'Halvklart', icon: Cloud, color: 'text-gray-400' },
	cloudy: { label: 'Molnigt', icon: Cloud, color: 'text-gray-500' },
	rainy: { label: 'Regn', icon: CloudRain, color: 'text-blue-500' },
	snow: { label: 'Snö', icon: CloudSnow, color: 'text-blue-300' },
	windy: { label: 'Blåsigt', icon: Wind, color: 'text-gray-500' },
};

export function DiaryDetailNew({ diaryId, autoEdit }: DiaryDetailNewProps) {
	const supabase = createClient();
	const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    const { data: diary, isLoading, error: loadError } = useQuery({
		queryKey: ['diary', diaryId],
		queryFn: async () => {
            const res = await fetch(`/api/diary/${diaryId}`);
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || 'Kunde inte hämta dagbokspost');
            }
            const j = await res.json();
            return j.diary;
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

    // Hooks that must be called unconditionally (before any early returns)
    const [isEditing, setIsEditing] = useState(!!autoEdit);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        weather: diary?.weather || '',
        temperature_c: diary?.temperature_c ?? '',
        crew_count: diary?.crew_count ?? '',
        work_performed: diary?.work_performed || '',
        obstacles: diary?.obstacles || '',
        safety_notes: diary?.safety_notes || '',
        deliveries: diary?.deliveries || '',
        visitors: diary?.visitors || '',
        signature_name: diary?.signature_name || '',
        signature_timestamp: diary?.signature_timestamp || '',
    });
    useEffect(() => {
        if (diary) {
            setForm({
                weather: diary.weather || '',
                temperature_c: diary.temperature_c ?? '',
                crew_count: diary.crew_count ?? '',
                work_performed: diary.work_performed || '',
                obstacles: diary.obstacles || '',
                safety_notes: diary.safety_notes || '',
                deliveries: diary.deliveries || '',
                visitors: diary.visitors || '',
                signature_name: diary.signature_name || '',
                signature_timestamp: diary.signature_timestamp || '',
            });
        }
    }, [diary]);

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
					{loadError ? (
						<div>
							<p className='text-destructive mb-1'>Kunde inte ladda dagboksposten</p>
							<p className='text-sm text-muted-foreground'>
								{(loadError as Error).message}
							</p>
						</div>
					) : (
						<p className='text-muted-foreground'>Dagbokspost hittades inte</p>
					)}
				</CardContent>
			</Card>
		);
	}

    const weatherInfo = diary.weather ? weatherConfig[diary.weather] : null;
	const WeatherIcon = weatherInfo?.icon;

    const saveEdits = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/diary/${diaryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    temperature_c: form.temperature_c === '' ? null : Number(form.temperature_c),
                    crew_count: form.crew_count === '' ? null : Number(form.crew_count),
                }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || 'Kunde inte spara');
            }
            // Refresh page data
            window.location.reload();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			<main className='px-4 md:px-8 py-6 max-w-5xl mx-auto space-y-4'>
				{/* Header Card */}
                <Card className='border-2 border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200'>
					<CardHeader className='pb-4'>
						<div className='space-y-3'>
							<CardTitle className='text-2xl md:text-3xl font-bold'>
								Dagbok - {formatSwedishFull(diary.date)}
							</CardTitle>
							<p className='text-base text-muted-foreground'>
								<span className='font-medium'>Projekt:</span> {diary.project?.project_number ? `${diary.project.project_number} - ` : ''}{diary.project?.name}
							</p>
						</div>
                        <div className='mt-2'>
                            <Button 
                                size='sm' 
                                onClick={() => setIsEditing(true)} 
                            >
                                Redigera
                            </Button>
                        </div>
						
						{/* Key Details Row */}
						<div className='flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-border'>
							<div className='flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20'>
								<Calendar className='w-5 h-5 text-primary' />
								<span className='text-sm font-medium'>{formatPlainDate(diary.date, 'sv-SE', 'medium')}</span>
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

                {/* Edit Form */}
                {isEditing && (
                    <Card className='border-2 border-primary/30'>
                        <CardHeader className='pb-4'>
                            <CardTitle className='text-lg'>Redigera dagbokspost</CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-3'>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                                <div>
                                    <label className='text-sm font-medium'>Väder</label>
                                    <select className='mt-1 w-full border rounded p-2' value={form.weather}
                                        onChange={e => setForm({ ...form, weather: e.target.value })}>
                                        <option value=''>—</option>
                                        <option value='sunny'>Soligt</option>
                                        <option value='partly_cloudy'>Halvklart</option>
                                        <option value='cloudy'>Molnigt</option>
                                        <option value='rainy'>Regn</option>
                                        <option value='snow'>Snö</option>
                                        <option value='windy'>Blåsigt</option>
                                    </select>
                                </div>
                                <div>
                                    <label className='text-sm font-medium'>Temperatur (°C)</label>
                                    <Input className='mt-1' type='number' value={form.temperature_c as any}
                                        onChange={e => setForm({ ...form, temperature_c: e.target.value })} />
                                </div>
                                <div>
                                    <label className='text-sm font-medium'>Manskap</label>
                                    <Input className='mt-1' type='number' value={form.crew_count as any}
                                        onChange={e => setForm({ ...form, crew_count: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className='text-sm font-medium'>Utfört arbete</label>
                                <Textarea className='mt-1' rows={4} value={form.work_performed}
                                    onChange={e => setForm({ ...form, work_performed: e.target.value })} />
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                <div>
                                    <label className='text-sm font-medium'>Hinder/Problem</label>
                                    <Textarea className='mt-1' rows={3} value={form.obstacles}
                                        onChange={e => setForm({ ...form, obstacles: e.target.value })} />
                                </div>
                                <div>
                                    <label className='text-sm font-medium'>Säkerhet</label>
                                    <Textarea className='mt-1' rows={3} value={form.safety_notes}
                                        onChange={e => setForm({ ...form, safety_notes: e.target.value })} />
                                </div>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                <div>
                                    <label className='text-sm font-medium'>Leveranser</label>
                                    <Textarea className='mt-1' rows={3} value={form.deliveries}
                                        onChange={e => setForm({ ...form, deliveries: e.target.value })} />
                                </div>
                                <div>
                                    <label className='text-sm font-medium'>Besökare</label>
                                    <Textarea className='mt-1' rows={3} value={form.visitors}
                                        onChange={e => setForm({ ...form, visitors: e.target.value })} />
                                </div>
                            </div>
                            <div className='flex justify-end gap-2'>
                                <Button variant='outline' onClick={() => setIsEditing(false)} disabled={saving}>Avbryt</Button>
                                <Button onClick={saveEdits} disabled={saving}>{saving ? 'Sparar…' : 'Spara'}</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

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
			{diary.signature_name && (
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
								<span className='font-medium'>Signerad av:</span> {diary.signature_name}
							</p>
							<p className='text-sm text-muted-foreground'>
								{new Date(diary.signature_timestamp!).toLocaleString('sv-SE', {
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

