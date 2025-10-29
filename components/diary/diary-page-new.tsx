'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, FileText, Cloud, CloudRain, Sun, CloudSnow, Wind, Eye, Users, Calendar, Thermometer, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { formatPlainDate, formatSwedishFull } from '@/lib/utils/formatPlainDate';

interface DiaryPageNewProps {
	orgId: string;
	projectId?: string;
}

export function DiaryPageNew({ orgId, projectId }: DiaryPageNewProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const supabase = createClient();

	// Fetch project info if filtering by project
	const { data: projectInfo } = useQuery({
		queryKey: ['project', projectId],
		queryFn: async () => {
			if (!projectId) return null;
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number')
				.eq('id', projectId)
				.single();
			
			if (error) throw error;
			return data;
		},
		enabled: !!projectId,
	});

	// Fetch diary entries
	const { data: diaryEntries = [], isLoading } = useQuery({
		queryKey: ['diary', orgId, projectId],
		refetchOnMount: 'always', // Always refetch when component mounts
		queryFn: async () => {
			let query = supabase
				.from('diary_entries')
				.select(`
					*,
					project:projects(name, project_number)
				`)
				.eq('org_id', orgId);
			
			// Filter by project if projectId is provided
			if (projectId) {
				query = query.eq('project_id', projectId);
			}
			
			const { data, error } = await query.order('date', { ascending: false });

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
						photoCount: count || 0,
					};
				})
			);

			return entriesWithPhotos;
		},
	});

	const getWeatherIcon = (weather: string | null) => {
		switch (weather) {
			case 'sunny':
				return Sun;
			case 'partly_cloudy':
			case 'cloudy':
				return Cloud;
			case 'rainy':
				return CloudRain;
			case 'snow':
				return CloudSnow;
			case 'windy':
				return Wind;
			default:
				return Cloud;
		}
	};

	const getWeatherColor = (weather: string | null) => {
		switch (weather) {
			case 'sunny':
				return 'text-yellow-500';
			case 'partly_cloudy':
			case 'cloudy':
				return 'text-gray-400';
			case 'rainy':
				return 'text-blue-500';
			case 'snow':
				return 'text-blue-300';
			case 'windy':
				return 'text-gray-500';
			default:
				return 'text-gray-400';
		}
	};

	const filteredEntries = diaryEntries.filter((entry: any) =>
		entry.work_performed?.toLowerCase().includes(searchQuery.toLowerCase()) ||
		entry.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Calculate stats
	const totalEntries = diaryEntries.length;
	const thisWeekEntries = diaryEntries.filter((entry: any) => {
		// Safe date comparison using T00:00:00 to avoid timezone issues
		const entryDate = new Date(`${entry.date}T00:00:00`);
		const now = new Date();
		// Set to start of day for fair comparison
		now.setHours(23, 59, 59, 999);
		const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		weekAgo.setHours(0, 0, 0, 0);
		return entryDate >= weekAgo && entryDate <= now;
	}).length;
	
	const totalCrew = diaryEntries.reduce((sum: number, entry: any) => sum + (entry.crew_count || 0), 0);
	
	const avgTemp = diaryEntries.length > 0
		? Math.round(
			diaryEntries.reduce((sum: number, entry: any) => sum + (entry.temperature_c || 0), 0) / diaryEntries.length
		)
		: 0;

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div className='flex items-center justify-between mb-4'>
						<div>
							<h1 className='text-3xl font-bold tracking-tight mb-1'>Dagbok</h1>
							<p className='text-sm text-muted-foreground'>
								AFC-stil dagboksposter för dina projekt
							</p>
							{projectInfo && (
								<div className='mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-sm'>
									<FileText className='w-4 h-4' />
									<span>Filtrerar: {projectInfo.name}</span>
								</div>
							)}
						</div>
					<Button 
						asChild
						className='shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200'
					>
						<Link href={projectId ? `/dashboard/diary/new?project_id=${projectId}` : '/dashboard/diary/new'}>
							<Plus className='w-4 h-4 mr-2' />
							Ny dagbokspost
						</Link>
					</Button>
					</div>

					{/* Search */}
					<div className='flex gap-2'>
						<div className='relative flex-1'>
							<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
							<Input
								placeholder='Sök dagboksposter...'
								className='pl-9'
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='px-4 md:px-8 py-6 max-w-7xl'>
				{/* Stats */}
				<div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-accent'>
								<FileText className='w-5 h-5 text-primary' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Totalt poster</p>
								<p className='text-xl'>{totalEntries} st</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-blue-100'>
								<Calendar className='w-5 h-5 text-blue-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Denna vecka</p>
								<p className='text-xl'>{thisWeekEntries} st</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-green-100'>
								<Users className='w-5 h-5 text-green-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Total bemanning</p>
								<p className='text-xl'>{totalCrew} pers</p>
							</div>
						</div>
					</div>

					<div className='bg-card border-2 border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200'>
						<div className='flex items-center gap-3'>
							<div className='p-2 rounded-lg bg-yellow-100'>
								<Sun className='w-5 h-5 text-yellow-600' />
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Medeltemperatur</p>
								<p className='text-xl'>{avgTemp}°C</p>
							</div>
						</div>
					</div>
				</div>

				{/* Logbook Entries */}
				<div>
					<h3 className='text-xl font-semibold mb-4'>Dagboksposter</h3>
					{isLoading ? (
						<div className='flex items-center justify-center py-12'>
							<div className='text-muted-foreground'>Laddar dagboksposter...</div>
						</div>
					) : filteredEntries.length === 0 ? (
						<div className='bg-card rounded-xl border border-border p-6 md:p-8 text-center'>
							<div className='inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted mb-3 md:mb-4'>
								<FileText className='w-6 h-6 md:w-8 md:h-8 text-muted-foreground' />
							</div>
							<p className='text-muted-foreground text-sm md:text-base'>
								{searchQuery 
									? 'Inga dagboksposter hittades' 
									: projectInfo 
										? `Inga dagboksposter för ${projectInfo.name}` 
										: 'Inga dagboksposter ännu'}
							</p>
							<p className='text-xs md:text-sm text-muted-foreground mt-2'>
								{searchQuery 
									? 'Prova att söka efter något annat' 
									: 'Skapa din första dagbokspost för att komma igång'}
							</p>
						</div>
					) : (
						<div className='space-y-3'>
							{filteredEntries.map((entry: any) => {
								const WeatherIcon = getWeatherIcon(entry.weather);
								const weatherColor = getWeatherColor(entry.weather);
								
								return (
									<div
										key={entry.id}
										className='bg-card border-2 border-border rounded-xl p-4 md:p-5 hover:border-primary/30 hover:shadow-lg hover:scale-[1.01] transition-all duration-200'
									>
										{/* Header with date, weather, and stats */}
										<div className='flex flex-wrap items-center gap-3 mb-3 pb-3 border-b border-border'>
											<div className='flex items-center gap-2 px-3 py-1.5 bg-accent rounded-lg'>
												<Calendar className='w-4 h-4 text-primary' />
												<span className='text-sm'>{formatPlainDate(entry.date, 'sv-SE', 'medium')}</span>
											</div>
											
											{entry.weather && (
												<div className='flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg'>
													<WeatherIcon className={`w-4 h-4 ${weatherColor}`} />
													{entry.temperature_c !== null && (
														<span className='text-sm text-muted-foreground'>{entry.temperature_c}°C</span>
													)}
												</div>
											)}
											
											{entry.crew_count !== null && entry.crew_count > 0 && (
												<div className='flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg'>
													<Users className='w-4 h-4 text-muted-foreground' />
													<span className='text-sm text-muted-foreground'>{entry.crew_count}</span>
												</div>
											)}

											{entry.photoCount > 0 && (
												<div className='flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg'>
													<ImageIcon className='w-4 h-4 text-purple-600' />
													<span className='text-sm text-purple-600'>{entry.photoCount}</span>
												</div>
											)}

											<div className='ml-auto'>
												<Button
													variant='outline'
													size='sm'
													className='hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-all duration-200'
													asChild
												>
													<Link href={`/dashboard/diary/${entry.id}`}>
														<Eye className='w-4 h-4 mr-1' />
														Visa
													</Link>
												</Button>
											</div>
										</div>

										{/* Content */}
										<div className='mb-3'>
											<h4 className='text-lg font-semibold mb-2'>
												Dagbok - {formatSwedishFull(entry.date)}
											</h4>
											{entry.work_performed && (
												<p className='text-sm text-muted-foreground mb-2 line-clamp-2'>
													{entry.work_performed}
												</p>
											)}
											<p className='text-sm text-muted-foreground'>
												Projekt: {entry.project?.project_number ? `${entry.project.project_number} - ` : ''}{entry.project?.name}
											</p>
										</div>

									{/* Footer */}
									{entry.signature_name && (
										<div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-3 border-t border-border'>
											<span>Signerad av: {entry.signature_name}</span>
											<span>•</span>
											<span>{new Date(entry.signature_timestamp).toLocaleString('sv-SE')}</span>
											<span>•</span>
											<span>Skapad: {new Date(entry.created_at).toLocaleDateString('sv-SE')}</span>
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}

