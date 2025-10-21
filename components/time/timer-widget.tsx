'use client';

import { useState, useEffect } from 'react';
import { useTimerStore } from '@/lib/stores/timer-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Play, Square, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface TimerWidgetProps {
	userId: string;
	orgId: string;
	inline?: boolean; // If true, renders inline instead of fixed/floating
}

export function TimerWidget({ userId, orgId, inline = false }: TimerWidgetProps) {
	const { isRunning, currentEntry, startTimer, stopTimer } = useTimerStore();
	const [isExpanded, setIsExpanded] = useState(false);
	const [selectedProject, setSelectedProject] = useState<string>('');
	const [selectedPhase, setSelectedPhase] = useState<string>('');
	const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

	const supabase = createClient();

	// Fetch active projects
	const { data: projects } = useQuery({
		queryKey: ['active-projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data || [];
		},
	});

	// Fetch phases for selected project
	const { data: phases } = useQuery({
		queryKey: ['phases', selectedProject],
		queryFn: async () => {
			if (!selectedProject) return [];
			const { data, error } = await supabase
				.from('phases')
				.select('id, name')
				.eq('project_id', selectedProject)
				.order('sort_order');

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedProject,
	});

	// Update elapsed time every second when timer is running
	useEffect(() => {
		if (!isRunning || !currentEntry) {
			setElapsedTime('00:00:00');
			return;
		}

		const updateElapsed = () => {
			const start = new Date(currentEntry.start_at);
			const now = new Date();
			const diff = Math.floor((now.getTime() - start.getTime()) / 1000);

			const hours = Math.floor(diff / 3600);
			const minutes = Math.floor((diff % 3600) / 60);
			const seconds = diff % 60;

			setElapsedTime(
				`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
			);
		};

		updateElapsed();
		const interval = setInterval(updateElapsed, 1000);

		return () => clearInterval(interval);
	}, [isRunning, currentEntry]);

	const handleStart = async () => {
		if (!selectedProject) {
			alert('Välj ett projekt först');
			return;
		}

		const project = projects?.find(p => p.id === selectedProject);
		if (!project) return;

		const entryId = crypto.randomUUID();

		// Start timer in store
		startTimer({
			id: entryId,
			project_id: selectedProject,
			project_name: project.name,
			phase_id: selectedPhase || undefined,
		});

		// Create time entry in database (draft, no stop time)
		try {
			await fetch('/api/time/entries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					project_id: selectedProject,
					phase_id: selectedPhase || null,
					start_at: new Date().toISOString(),
				}),
			});
		} catch (error) {
			console.error('Failed to create time entry:', error);
		}

		setIsExpanded(false);
	};

	const handleStop = async () => {
		if (!currentEntry) return;

		const stopTime = new Date().toISOString();

		// Stop timer in store
		stopTimer();

		// Update time entry with stop time
		try {
			await fetch(`/api/time/entries/${currentEntry.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					stop_at: stopTime,
				}),
			});
		} catch (error) {
			console.error('Failed to stop time entry:', error);
		}
	};

	const cardClassName = inline 
		? "w-full shadow-md" 
		: "fixed bottom-20 md:bottom-4 right-4 z-[1003] w-80 shadow-lg";

	return (
		<Card className={cardClassName}>
			{/* Collapsed View */}
			{!isExpanded && (
				<div className="p-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Clock className="w-5 h-5 text-primary" />
						{isRunning && currentEntry ? (
							<div>
								<p className="text-sm font-medium">{currentEntry.project_name}</p>
								<p className="text-xs text-muted-foreground">{elapsedTime}</p>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">Ingen aktiv tid</p>
						)}
					</div>
					<div className="flex items-center gap-2">
						{isRunning ? (
							<Button size="sm" variant="destructive" onClick={handleStop}>
								<Square className="w-4 h-4 mr-1" />
								Stopp
							</Button>
						) : (
							<Button size="sm" onClick={() => setIsExpanded(true)}>
								<Play className="w-4 h-4 mr-1" />
								Start
							</Button>
						)}
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setIsExpanded(!isExpanded)}
						>
							{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
						</Button>
					</div>
				</div>
			)}

			{/* Expanded View */}
			{isExpanded && (
				<div className="p-4 space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Clock className="w-5 h-5 text-primary" />
							<h3 className="font-semibold">Tidtagning</h3>
						</div>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setIsExpanded(false)}
						>
							<ChevronDown className="w-4 h-4" />
						</Button>
					</div>

					{isRunning && currentEntry ? (
						<>
							<div className="space-y-2">
								<p className="text-sm font-medium">{currentEntry.project_name}</p>
								<p className="text-2xl font-bold text-primary">{elapsedTime}</p>
							</div>
							<Button className="w-full" variant="destructive" onClick={handleStop}>
								<Square className="w-4 h-4 mr-2" />
								Stoppa tid
							</Button>
						</>
					) : (
						<>
							<div className="space-y-3">
								<div className="space-y-2">
									<label className="text-sm font-medium">Projekt</label>
									<Select value={selectedProject} onValueChange={setSelectedProject}>
										<SelectTrigger>
											<SelectValue placeholder="Välj projekt" />
										</SelectTrigger>
										<SelectContent>
											{projects?.map((project) => (
												<SelectItem key={project.id} value={project.id}>
													{project.name}
													{project.project_number && ` (${project.project_number})`}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{selectedProject && phases && phases.length > 0 && (
									<div className="space-y-2">
										<label className="text-sm font-medium">Fas (valfritt)</label>
										<Select value={selectedPhase} onValueChange={setSelectedPhase}>
											<SelectTrigger>
												<SelectValue placeholder="Välj fas" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="">Ingen fas</SelectItem>
												{phases?.map((phase) => (
													<SelectItem key={phase.id} value={phase.id}>
														{phase.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
							</div>

							<Button 
								className="w-full" 
								onClick={handleStart}
								disabled={!selectedProject}
							>
								<Play className="w-4 h-4 mr-2" />
								Starta tid
							</Button>
						</>
					)}
				</div>
			)}
		</Card>
	);
}

