'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTimerStore } from '@/lib/stores/timer-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Play, Square, Pause, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { billingTypeOptions, type BillingType } from '@/lib/schemas/billing-types';

const NO_PHASE_SELECT_VALUE = '__no_phase__';
const NO_FIXED_BLOCK_SELECT_VALUE = '__no_fixed_block__';

type ProjectOption = {
	id: string;
	name: string;
	project_number: string | null;
	billing_mode: 'FAST_ONLY' | 'LOPANDE_ONLY' | 'BOTH';
	default_time_billing_type: BillingType;
};

type FixedBlockOption = {
	id: string;
	name: string;
	amount_sek: number;
	status: 'open' | 'closed';
};

interface TimerWidgetProps {
	userId: string;
	orgId: string;
	inline?: boolean; // If true, renders inline instead of fixed/floating
}

export function TimerWidget({ userId, orgId, inline = false }: TimerWidgetProps) {
	const { isRunning, currentEntry, startTimer, stopTimer } = useTimerStore();
	const [isExpanded, setIsExpanded] = useState(false);
	const [selectedProject, setSelectedProject] = useState<string>('');
	const [selectedPhase, setSelectedPhase] = useState<string>(NO_PHASE_SELECT_VALUE);
	const [selectedBillingType, setSelectedBillingType] = useState<BillingType>('LOPANDE');
	const [selectedFixedBlock, setSelectedFixedBlock] = useState<string>(NO_FIXED_BLOCK_SELECT_VALUE);
	const [fixedBlocks, setFixedBlocks] = useState<FixedBlockOption[]>([]);
	const [fixedBlocksLoading, setFixedBlocksLoading] = useState(false);
	const [fixedBlocksError, setFixedBlocksError] = useState<string | null>(null);
	const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

	const supabase = createClient();

	// Fetch active projects
	const { data: projects } = useQuery<ProjectOption[]>({
		queryKey: ['active-projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number, billing_mode, default_time_billing_type')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data || [];
		},
	});

	const selectedProjectDetails = useMemo(
		() => projects?.find((p) => p.id === selectedProject) ?? null,
		[projects, selectedProject],
	);

	useEffect(() => {
		if (!selectedProjectDetails) {
			setSelectedBillingType('LOPANDE');
			setSelectedFixedBlock(NO_FIXED_BLOCK_SELECT_VALUE);
			setSelectedPhase(NO_PHASE_SELECT_VALUE);
			setFixedBlocks([]);
			setFixedBlocksError(null);
			return;
		}

		switch (selectedProjectDetails.billing_mode) {
			case 'FAST_ONLY':
				setSelectedBillingType('FAST');
				break;
			case 'LOPANDE_ONLY':
				setSelectedBillingType('LOPANDE');
				break;
			case 'BOTH':
				setSelectedBillingType(selectedProjectDetails.default_time_billing_type ?? 'LOPANDE');
				break;
			default:
				setSelectedBillingType('LOPANDE');
		}
}, [selectedProjectDetails]);

useEffect(() => {
	if (
		!selectedProjectDetails ||
		(selectedProjectDetails.billing_mode !== 'FAST_ONLY' &&
			selectedProjectDetails.billing_mode !== 'BOTH')
	) {
		setFixedBlocks([]);
		setSelectedFixedBlock(NO_FIXED_BLOCK_SELECT_VALUE);
		setFixedBlocksError(null);
		return;
	}

	let isCancelled = false;
	const loadBlocks = async () => {
		try {
			setFixedBlocksLoading(true);
			setFixedBlocksError(null);
			const response = await fetch(`/api/fixed-time-blocks?projectId=${selectedProjectDetails.id}`);
			if (!response.ok) throw new Error('Kunde inte hämta fasta poster');
			const json = await response.json();
			if (!isCancelled) {
				setFixedBlocks(json.blocks || []);
			}
		} catch (error) {
			if (!isCancelled) {
				console.error(error);
				setFixedBlocksError(error instanceof Error ? error.message : 'Ett fel uppstod');
				setFixedBlocks([]);
			}
		} finally {
			if (!isCancelled) setFixedBlocksLoading(false);
		}
	};

	loadBlocks();

	return () => {
		isCancelled = true;
	};
}, [selectedProjectDetails]);

useEffect(() => {
	if (selectedBillingType !== 'FAST') {
		setSelectedFixedBlock(NO_FIXED_BLOCK_SELECT_VALUE);
	}
}, [selectedBillingType]);

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

		const project = selectedProjectDetails;
		if (!project) return;

	if (
		selectedBillingType === 'FAST' &&
		fixedBlocks.length > 0 &&
		selectedFixedBlock === NO_FIXED_BLOCK_SELECT_VALUE
	) {
			alert('Välj en fast post innan du startar tid på detta projekt.');
			return;
		}

		const entryId = crypto.randomUUID();

		// Start timer in store
		startTimer({
			id: entryId,
			project_id: selectedProject,
			project_name: project.name,
			phase_id: selectedPhase === NO_PHASE_SELECT_VALUE ? undefined : selectedPhase,
			billing_type: selectedBillingType,
			fixed_block_id:
				selectedBillingType === 'FAST' && fixedBlocks.length > 0
					? selectedFixedBlock === NO_FIXED_BLOCK_SELECT_VALUE
						? undefined
						: selectedFixedBlock
					: undefined,
		});

		// Create time entry in database (draft, no stop time)
		try {
			await fetch('/api/time/entries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					project_id: selectedProject,
					phase_id: selectedPhase === NO_PHASE_SELECT_VALUE ? null : selectedPhase,
					start_at: new Date().toISOString(),
					billing_type: selectedBillingType,
					fixed_block_id:
						selectedBillingType === 'FAST' && fixedBlocks.length > 0
							? selectedFixedBlock === NO_FIXED_BLOCK_SELECT_VALUE
								? null
								: selectedFixedBlock
							: null,
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
								<p className="text-xs text-muted-foreground">
									{elapsedTime}{' '}
									{currentEntry.billing_type === 'FAST' ? '· Fast' : '· Löpande'}
								</p>
							</div>
						) : (
							<p className="text-base font-semibold text-black dark:text-[#c47a2c] dark:[text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
								Ingen aktiv tid
							</p>
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
									<Select
										value={selectedProject}
										onValueChange={(value) => {
											setSelectedProject(value);
											setSelectedPhase(NO_PHASE_SELECT_VALUE);
											setSelectedFixedBlock(NO_FIXED_BLOCK_SELECT_VALUE);
											setFixedBlocks([]);
											setFixedBlocksError(null);
										}}
									>
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
												<SelectItem value={NO_PHASE_SELECT_VALUE}>Ingen fas</SelectItem>
												{phases?.map((phase) => (
													<SelectItem key={phase.id} value={phase.id}>
														{phase.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{selectedProjectDetails && selectedProjectDetails.billing_mode === 'BOTH' && (
									<div className="space-y-2">
										<label className="text-sm font-medium">Debitering</label>
										<Select
											value={selectedBillingType}
											onValueChange={(value) => setSelectedBillingType(value as BillingType)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Välj debitering" />
											</SelectTrigger>
											<SelectContent>
												{billingTypeOptions.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{selectedProjectDetails && selectedProjectDetails.billing_mode !== 'BOTH' && (
									<div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
										Debitering: {selectedProjectDetails.billing_mode === 'FAST_ONLY' ? 'Fast' : 'Löpande'}
									</div>
								)}

								{selectedProjectDetails &&
									selectedBillingType === 'FAST' &&
									(selectedProjectDetails.billing_mode === 'FAST_ONLY' ||
										selectedProjectDetails.billing_mode === 'BOTH') &&
									(fixedBlocksLoading || fixedBlocks.length > 0) && (
										<div className="space-y-2">
											<label className="text-sm font-medium">Fast post</label>
											{fixedBlocksLoading ? (
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<Loader2 className="w-3 h-3 animate-spin" />
													Hämtar fasta poster...
												</div>
											) : (
												<Select
													value={selectedFixedBlock}
													onValueChange={setSelectedFixedBlock}
													disabled={fixedBlocks.length === 0}
												>
													<SelectTrigger>
														<SelectValue placeholder="Välj fast post" />
													</SelectTrigger>
													<SelectContent>
														{fixedBlocks.map((block) => (
															<SelectItem key={block.id} value={block.id}>
																{block.name} ({Math.round(Number(block.amount_sek || 0))} SEK)
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
											{fixedBlocksError && (
												<p className="text-xs text-red-600">{fixedBlocksError}</p>
											)}
											<p className="text-xs text-muted-foreground">
												Fast tid måste kopplas till en fast post.
											</p>
										</div>
									)}
							</div>

							<Button 
								className="w-full" 
								onClick={handleStart}
								disabled={
									!selectedProject ||
									(selectedBillingType === 'FAST' &&
										((fixedBlocksLoading && fixedBlocks.length === 0) ||
											(fixedBlocks.length > 0 && selectedFixedBlock === NO_FIXED_BLOCK_SELECT_VALUE)))
								}
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

