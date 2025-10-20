'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Calendar, Users, Cloud, Thermometer, ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface DiaryEntry {
	id: string;
	date: string;
	weather: string | null;
	temperature_c: number | null;
	crew_count: number | null;
	work_performed: string | null;
	signed_by_name: string | null;
	signed_at: string | null;
	created_at: string;
	project: {
		name: string;
		project_number: string | null;
	};
	_count?: {
		photos: number;
	};
}

interface DiaryListProps {
	projectId?: string;
	orgId: string;
}

const weatherEmojis: Record<string, string> = {
	sunny: '☀️',
	partly_cloudy: '⛅',
	cloudy: '☁️',
	rainy: '🌧️',
	snow: '❄️',
	windy: '💨',
};

export function DiaryList({ projectId, orgId }: DiaryListProps) {
	const supabase = createClient();

	const { data: diaryEntries, isLoading } = useQuery({
		queryKey: ['diary', orgId, projectId],
		queryFn: async () => {
			let query = supabase
				.from('diary_entries')
				.select(`
					*,
					project:projects(name, project_number)
				`)
				.eq('org_id', orgId)
				.order('date', { ascending: false });

			if (projectId) {
				query = query.eq('project_id', projectId);
			}

			const { data, error } = await query;

			if (error) throw error;

			// Fetch photo counts for each entry
			const entriesWithPhotos = await Promise.all(
				(data || []).map(async (entry) => {
					const { count } = await supabase
						.from('diary_photos')
						.select('*', { count: 'exact', head: true })
						.eq('diary_entry_id', entry.id);
					
					return {
						...entry,
						_count: { photos: count || 0 },
					};
				})
			);

			return entriesWithPhotos as DiaryEntry[];
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-muted-foreground">Laddar dagboksposter...</div>
			</div>
		);
	}

	if (!diaryEntries || diaryEntries.length === 0) {
		return (
			<Card>
				<CardContent className="py-12 text-center">
					<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<p className="text-muted-foreground">Inga dagboksposter ännu</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{diaryEntries.map((entry) => (
				<Card key={entry.id} className="hover:shadow-md transition-shadow">
					<CardHeader className="pb-3">
						<div className="flex items-start justify-between">
							<div className="space-y-1 flex-1">
								<div className="flex items-center gap-2">
									<Badge variant="outline" className="flex items-center gap-1">
										<Calendar className="h-3 w-3" />
										{new Date(entry.date).toLocaleDateString('sv-SE')}
									</Badge>
									{entry.weather && (
										<Badge variant="secondary">
											{weatherEmojis[entry.weather]} {entry.weather}
										</Badge>
									)}
									{entry.temperature_c !== null && (
										<Badge variant="secondary" className="flex items-center gap-1">
											<Thermometer className="h-3 w-3" />
											{entry.temperature_c}°C
										</Badge>
									)}
									{entry.crew_count !== null && entry.crew_count > 0 && (
										<Badge variant="secondary" className="flex items-center gap-1">
											<Users className="h-3 w-3" />
											{entry.crew_count}
										</Badge>
									)}
									{entry._count && entry._count.photos > 0 && (
										<Badge variant="secondary" className="flex items-center gap-1">
											<ImageIcon className="h-3 w-3" />
											{entry._count.photos}
										</Badge>
									)}
								</div>
								<CardTitle className="text-lg">
									Dagbok - {new Date(entry.date).toLocaleDateString('sv-SE', { 
										weekday: 'long', 
										year: 'numeric', 
										month: 'long', 
										day: 'numeric' 
									})}
								</CardTitle>
								{entry.work_performed && (
									<p className="text-sm text-muted-foreground line-clamp-2">
										{entry.work_performed}
									</p>
								)}
							</div>
							<Button variant="ghost" size="icon" asChild>
								<Link href={`/dashboard/diary/${entry.id}`}>
									<Eye className="h-4 w-4" />
								</Link>
							</Button>
						</div>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="flex items-center justify-between text-sm">
							<div className="space-y-1">
								<p className="text-muted-foreground">
									Projekt: {entry.project.project_number ? `${entry.project.project_number} - ` : ''}{entry.project.name}
								</p>
								{entry.signed_by_name && (
									<p className="text-xs text-muted-foreground">
										Signerad av: {entry.signed_by_name} • {new Date(entry.signed_at!).toLocaleString('sv-SE')}
									</p>
								)}
								<p className="text-xs text-muted-foreground">
									Skapad: {new Date(entry.created_at).toLocaleDateString('sv-SE')}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

