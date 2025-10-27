'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Calendar, Users, Cloud, Thermometer, ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { formatPlainDate, formatSwedishFull } from '@/lib/utils/formatPlainDate';

interface DiaryEntry {
	id: string;
	date: string;
	weather: string | null;
	temperature_c: number | null;
	crew_count: number | null;
	work_performed: string | null;
	signature_name: string | null;
	signature_timestamp: string | null;
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
			// Optimized: Single query with photo count aggregation
			let query = supabase
				.from('diary_entries')
				.select(`
					*,
					project:projects(name, project_number),
					diary_photos(id)
				`)
				.eq('org_id', orgId)
				.order('date', { ascending: false });

			if (projectId) {
				query = query.eq('project_id', projectId);
			}

			const { data, error } = await query;

			if (error) throw error;

			// Count photos from the joined data (no extra queries!)
			const entriesWithPhotos = (data || []).map((entry: any) => ({
				...entry,
				_count: { 
					photos: entry.diary_photos?.length || 0 
				},
				// Remove the raw diary_photos array to clean up the response
				diary_photos: undefined,
			}));

			return entriesWithPhotos as DiaryEntry[];
		},
		staleTime: 2 * 60 * 1000,  // 2 minutes (diary entries don't change often)
		gcTime: 5 * 60 * 1000,      // 5 minutes
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
										{formatPlainDate(entry.date, 'sv-SE', 'medium')}
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
									Dagbok - {formatSwedishFull(entry.date)}
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
							{entry.signature_name && (
								<p className="text-xs text-muted-foreground">
									Signerad av: {entry.signature_name} • {new Date(entry.signature_timestamp!).toLocaleString('sv-SE')}
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

