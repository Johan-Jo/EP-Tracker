'use client';

import { useState } from 'react';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersonRow } from './person-row';
import { AssignmentCard } from './assignment-card';
import { CapacityIndicator } from './capacity-indicator';
import { ProjectChips } from './project-chips';
import { AddAssignmentDialog } from './add-assignment-dialog';
import { DroppableCell } from './droppable-cell';
import { AddToProjectDialog } from './add-to-project-dialog';
import type { WeekPlanningData, PersonStatus } from '@/lib/schemas/planning';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { sv } from 'date-fns/locale';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { toast } from 'sonner';

interface WeekScheduleViewProps {
	data: WeekPlanningData;
	onAddAssignment: (data: any) => Promise<void>;
	onDragDropUpdate: (params: { assignmentId: string; payload: any }) => void;
	onRefresh: () => Promise<void>;
}

export function WeekScheduleView({ data, onAddAssignment, onDragDropUpdate, onRefresh }: WeekScheduleViewProps) {
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [selectedDate, setSelectedDate] = useState('');
	const [selectedPerson, setSelectedPerson] = useState('');
	const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
	const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
	const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [activeId, setActiveId] = useState<string | null>(null);
	const [showAddToProjectDialog, setShowAddToProjectDialog] = useState(false);
	const [pendingDrop, setPendingDrop] = useState<{
		assignmentId: string;
		projectId: string;
		projectName: string;
		userId: string;
		userName: string;
		payload: any;
	} | null>(null);

	// Configure drag sensors
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // Require 8px movement before drag starts
			},
		})
	);

	const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
	const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

	// Generate week days
	const weekDays = Array.from({ length: 7 }, (_, i) => {
		const date = new Date(weekStart);
		date.setDate(weekStart.getDate() + i);
		return {
			short: format(date, 'EEE', { locale: sv }).substring(0, 3),
			full: format(date, 'EEEE', { locale: sv }),
			date: format(date, 'd MMM', { locale: sv }),
			isoDate: format(date, 'yyyy-MM-dd'),
		};
	});

	// Calculate person status for the week
	const getPersonStatus = (userId: string): PersonStatus => {
		// Check if person has absence this week
		const hasAbsence = data.absences.some(
			a => a.user_id === userId &&
			new Date(a.start_ts) <= weekEnd &&
			new Date(a.end_ts) >= weekStart
		);
		if (hasAbsence) return 'vacation';

		// Check if person has assignments this week
		const hasAssignments = data.assignments.some(
			a => a.user_id === userId
		);
		if (hasAssignments) return 'busy';

		return 'available';
	};

	// EPIC 26.6: Create project lookup map for fast access
	const projectsMap = new Map(data.projects.map(p => [p.id, p]));
	
	// Group assignments by user and day
	const assignmentsByUserDay: { [key: string]: { [day: number]: any[] } } = {};
	data.assignments.forEach(assignment => {
		const assignmentDate = new Date(assignment.start_ts);
		const dayIndex = Math.floor((assignmentDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
		
		// EPIC 26.6: Map project_id to project object
		const project = projectsMap.get(assignment.project_id);
		if (!project) return; // Skip if project not found
		
		if (dayIndex >= 0 && dayIndex < 7) {
			if (!assignmentsByUserDay[assignment.user_id]) {
				assignmentsByUserDay[assignment.user_id] = {};
			}
			if (!assignmentsByUserDay[assignment.user_id][dayIndex]) {
				assignmentsByUserDay[assignment.user_id][dayIndex] = [];
			}
			assignmentsByUserDay[assignment.user_id][dayIndex].push({
				id: assignment.id,
				project: project.name,
				projectColor: project.color,
				startTime: assignment.all_day ? 'Heldag' : format(new Date(assignment.start_ts), 'HH:mm'),
				endTime: assignment.all_day ? '' : format(new Date(assignment.end_ts), 'HH:mm'),
				address: assignment.address || project.client_name,
			});
		}
	});

	// Calculate capacity per day
	const capacity = weekDays.map((_, dayIndex) => {
		// Count unique users with assignments on this day
		const assigned = new Set();
		Object.keys(assignmentsByUserDay).forEach(userId => {
			if (assignmentsByUserDay[userId][dayIndex]) {
				assigned.add(userId);
			}
		});

		// Sum daily_capacity_need from projects with assignments on this day
		let needed = 0;
		data.assignments.forEach(assignment => {
			const assignmentDate = new Date(assignment.start_ts);
			const assignmentDayIndex = Math.floor((assignmentDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
			if (assignmentDayIndex === dayIndex) {
				// EPIC 26.6: Map project_id to project object
				const project = projectsMap.get(assignment.project_id);
				needed += project?.daily_capacity_need || 0;
			}
		});

		return {
			needed: needed || assigned.size, // Use assigned count if no capacity_need set
			assigned: assigned.size,
		};
	});

	// Filter resources by search query
	const filteredResources = data.resources.filter(resource => {
		const matchesSearch = searchQuery === '' || 
			resource.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			resource.email.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesSearch;
	});

	const handleCellClick = (userId: string, dayIndex: number) => {
		const user = data.resources.find(r => r.id === userId);
		setSelectedPerson(userId);
		setSelectedDate(weekDays[dayIndex].isoDate);
		setShowAddDialog(true);
	};

	const handleProjectToggle = (projectId: string) => {
		if (projectId === 'all') {
			setSelectedProjects([]);
		} else {
			setSelectedProjects(prev => 
				prev.includes(projectId) 
					? prev.filter(id => id !== projectId)
					: [...prev, projectId]
			);
		}
	};

	const handlePreviousWeek = () => {
		setCurrentWeekStart(prev => subWeeks(prev, 1));
		onRefresh();
	};

	const handleNextWeek = () => {
		setCurrentWeekStart(prev => addWeeks(prev, 1));
		onRefresh();
	};

	// Get week number
	const weekNumber = format(weekStart, 'I');
	const year = format(weekStart, 'yyyy');

	// Drag and drop handlers
	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);

		if (!over) return;

		// Parse drop target: "cell-{userId}-{dayIndex}"
		const overId = over.id as string;
		if (!overId.startsWith('cell-')) {
			// Not a valid cell, ignore drop
			return;
		}

		// Split and validate format: should be exactly 3 parts after split
		const parts = overId.split('-');
		if (parts.length < 3) {
			console.error('Invalid cell ID format:', overId);
			return;
		}

		// Extract userId (everything between 'cell-' and last '-{dayIndex}')
		const dayIndexStr = parts[parts.length - 1];
		const userId = parts.slice(1, -1).join('-'); // Rejoin in case userId contains dashes
		
		const dayIndex = parseInt(dayIndexStr);

		// Validate dayIndex
		if (isNaN(dayIndex) || dayIndex < 0 || dayIndex > 6) {
			console.error('Invalid dayIndex in cell ID:', overId);
			return;
		}

		// Find the assignment being dragged
		const assignment = data.assignments.find(a => a.id === active.id);
		if (!assignment) return;

		// Calculate new date - use weekDays array for reliable date
		const newDateStr = weekDays[dayIndex].isoDate;
		if (!newDateStr) {
			console.error('Invalid date for dayIndex:', dayIndex);
			return;
		}

		// If same date and user, do nothing
		const oldDate = format(new Date(assignment.start_ts), 'yyyy-MM-dd');
		if (assignment.user_id === userId && oldDate === newDateStr) {
			return;
		}

		// Update assignment - parse date in local timezone
		const [year, month, day] = newDateStr.split('-').map(Number);
		const startDate = new Date(year, month - 1, day); // month is 0-indexed
		const endDate = new Date(year, month - 1, day);
		
		if (assignment.all_day) {
			startDate.setHours(0, 0, 0, 0);
			endDate.setHours(23, 59, 59, 999);
		} else {
			// Keep same time of day
			const oldStart = new Date(assignment.start_ts);
			const oldEnd = new Date(assignment.end_ts);
			startDate.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
			endDate.setHours(oldEnd.getHours(), oldEnd.getMinutes(), 0, 0);
		}

		const payload = {
			user_id: userId,
			start_ts: startDate.toISOString(),
			end_ts: endDate.toISOString(),
		};

		// Check if user is being assigned to a different person
		if (assignment.user_id !== userId) {
			// Check if the new user is a member of the project
			try {
				const response = await fetch(`/api/projects/${assignment.project_id}/members`);
				if (response.ok) {
					const { members } = await response.json();
					const isMember = members.some((m: any) => m.user_id === userId);
					
					if (!isMember) {
						// User is not a member - show confirmation dialog
						const targetUser = data.resources.find(r => r.id === userId);
						if (targetUser) {
							setPendingDrop({
								assignmentId: assignment.id,
								projectId: assignment.project_id,
								projectName: assignment.project.name,
								userId: userId,
								userName: targetUser.full_name || targetUser.email,
								payload,
							});
							setShowAddToProjectDialog(true);
							return; // Don't proceed with update yet
						}
					}
				}
			} catch (error) {
				console.error('Error checking project membership:', error);
				// Continue with assignment update even if check fails
			}
		}
		
		// Use optimistic mutation - UI updates instantly!
		onDragDropUpdate({
			assignmentId: assignment.id,
			payload,
		});
	};

	const handleDragCancel = () => {
		setActiveId(null);
	};

	const handleConfirmAddToProject = async () => {
		if (!pendingDrop) return;

		try {
			// Add user to project
			const response = await fetch(`/api/projects/${pendingDrop.projectId}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userIds: [pendingDrop.userId],
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to add user to project');
			}

			toast.success(`${pendingDrop.userName.split(' ')[0]} har lagts till i ${pendingDrop.projectName}`);

			// Now proceed with the assignment update
			onDragDropUpdate({
				assignmentId: pendingDrop.assignmentId,
				payload: pendingDrop.payload,
			});

			// Close dialog and clear pending
			setShowAddToProjectDialog(false);
			setPendingDrop(null);
		} catch (error) {
			console.error('Error adding user to project:', error);
			toast.error('Kunde inte lägga till användaren i projektet');
		}
	};

	// Find active assignment for drag overlay and format it
	const activeAssignment = activeId 
		? (() => {
			const assignment = data.assignments.find(a => a.id === activeId);
			if (!assignment) return null;
			return {
				id: assignment.id,
				project: assignment.project.name,
				projectColor: assignment.project.color,
				startTime: assignment.all_day ? 'Heldag' : format(new Date(assignment.start_ts), 'HH:mm'),
				endTime: assignment.all_day ? '' : format(new Date(assignment.end_ts), 'HH:mm'),
				address: assignment.address || assignment.project.client_name || undefined,
				personCount: undefined,
			};
		})()
		: null;

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
			<div className="flex h-full flex-col gap-6 px-4 pb-10 pt-4 md:px-8">
				<div className="space-y-6">
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<h1 className="text-2xl font-bold text-foreground dark:text-white">Veckoplanering</h1>
							<p className="text-sm text-muted-foreground dark:text-white/60">Vecka {weekNumber} • {year}</p>
						</div>
						<Button
							onClick={() => setShowAddDialog(true)}
							className="rounded-full bg-orange-500 px-5 py-2 text-white shadow-lg shadow-orange-500/30 transition-colors hover:bg-orange-600 hover:shadow-orange-500/40"
						>
							<Plus className="mr-2 h-4 w-4" />
							Lägg till uppdrag
						</Button>
					</div>

					<div className="flex flex-wrap gap-2" data-tour="project-chips">
						<ProjectChips projects={data.projects} selectedProjects={selectedProjects} onToggle={handleProjectToggle} />
					</div>

					<div className="flex flex-col gap-2 sm:flex-row" data-tour="planning-search">
						<div className="relative flex-1">
							<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-white/50" />
							<Input
								placeholder="Sök uppdrag, personal eller projekt..."
								className="h-12 rounded-xl border border-border/60 bg-white pl-11 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-orange-500 dark:border-[#3a251d] dark:bg-[#261912] dark:text-white dark:placeholder:text-white/50"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
						<Button
							variant="outline"
							className="h-12 gap-2 rounded-xl border border-border/60 bg-muted/40 text-sm text-foreground transition-colors hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-500 dark:border-[#3a251d] dark:bg-[#261912] dark:text-white/80 dark:hover:text-white"
						>
							<Filter className="h-4 w-4" />
							Filter
						</Button>
					</div>
				</div>

			{/* Week Navigation & Capacity */}
			<div className="rounded-2xl border border-border/60 bg-white px-4 py-5 shadow-sm dark:border-[#2d1b15] dark:bg-[#21140f]">
				<div className="mb-4 flex items-center gap-3" data-tour="week-navigation">
					<Button
						variant="outline"
						size="icon"
						className="h-10 w-10 rounded-full border border-border/60 bg-white dark:border-[#3a251d] dark:bg-[#2a1a15]"
						onClick={handlePreviousWeek}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<div className="flex flex-1 flex-col items-center text-center">
						<span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
							Vecka {weekNumber}
						</span>
						<h3 className="text-lg font-semibold text-foreground dark:text-white">
							{format(weekStart, 'd', { locale: sv })}–{format(weekEnd, 'd MMMM yyyy', { locale: sv })}
						</h3>
					</div>
					<Button
						variant="outline"
						size="icon"
						className="h-10 w-10 rounded-full border border-border/60 bg-white dark:border-[#3a251d] dark:bg-[#2a1a15]"
						onClick={handleNextWeek}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>

				{/* Capacity Indicators */}
				<div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 md:grid-cols-7">
					{weekDays.map((day, index) => (
						<CapacityIndicator key={day.short} day={day.short} needed={capacity[index].needed} assigned={capacity[index].assigned} />
					))}
				</div>
			</div>

			{/* Schedule Grid */}
			<div className="flex-1 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm dark:border-[#2d1b15] dark:bg-[#19100d]" data-tour="schedule-grid">
				<div className="h-full overflow-auto">
					<div className="min-w-[1200px]">
						{/* Header Row */}
						<div className="sticky top-0 z-10 grid grid-cols-[220px_repeat(7,1fr)] border-b border-border/40 bg-muted/40 backdrop-blur dark:border-[#312016] dark:bg-[#23160f]">
							<div className="border-r border-border/40 p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:border-[#312016] dark:text-white/60">
								Personal
							</div>
							{weekDays.map((day) => (
								<div key={day.short} className="border-r border-border/40 p-4 text-center last:border-r-0 dark:border-[#312016]">
									<p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground dark:text-white/60">
										{day.short}
									</p>
									<p className="mt-1 text-sm font-semibold text-foreground dark:text-white">{day.date}</p>
								</div>
							))}
						</div>

						{/* Person Rows */}
						{filteredResources.map((person) => (
							<div
								key={person.id}
								className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-border/40 bg-white transition-colors hover:bg-muted/50 dark:border-[#312016] dark:bg-[#1c110d] dark:hover:bg-[#23160f]"
							>
								{/* Person Info */}
								<div className="sticky left-0 z-10 border-r border-border/40 bg-white p-3 dark:border-[#312016] dark:bg-[#1c110d]">
									<PersonRow
										id={person.id}
										name={person.full_name || person.email}
										role={person.role}
										status={getPersonStatus(person.id)}
									/>
								</div>

								{/* Week Cells */}
								{weekDays.map((day, dayIndex) => (
									<DroppableCell
										key={`${person.id}-${dayIndex}`}
										id={`cell-${person.id}-${dayIndex}`}
										onClick={() => handleCellClick(person.id, dayIndex)}
									>
										{assignmentsByUserDay[person.id]?.[dayIndex]?.map((assignment) => (
											<AssignmentCard
												key={assignment.id}
												{...assignment}
												onClick={(e) => {
													e.stopPropagation();
													const fullAssignment = data.assignments.find(a => a.id === assignment.id);
													setSelectedAssignment(fullAssignment);
													setShowAddDialog(true);
												}}
											/>
										))}
									</DroppableCell>
								))}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Add Assignment Dialog */}
			<AddAssignmentDialog
				open={showAddDialog}
				onClose={() => {
					setShowAddDialog(false);
					setSelectedDate('');
					setSelectedPerson('');
					setSelectedAssignment(null);
				}}
				date={selectedDate}
				person={selectedPerson}
				assignment={selectedAssignment}
				onSubmit={onAddAssignment}
				projects={data.projects.map(p => ({ ...p, site_address: p.site_address || undefined }))}
				users={data.resources.map(r => ({ id: r.id, name: r.full_name || r.email }))}
			/>

			{/* Add to Project Confirmation Dialog */}
			<AddToProjectDialog
				open={showAddToProjectDialog}
				onOpenChange={(open) => {
					setShowAddToProjectDialog(open);
					if (!open) {
						setPendingDrop(null);
					}
				}}
				onConfirm={handleConfirmAddToProject}
				userName={pendingDrop?.userName || ''}
				projectName={pendingDrop?.projectName || ''}
			/>
		</div>

		{/* Drag Overlay */}
		<DragOverlay>
			{activeAssignment ? (
				<AssignmentCard
					id={activeAssignment.id}
					project={activeAssignment.project}
					projectColor={activeAssignment.projectColor}
					startTime={activeAssignment.startTime}
					endTime={activeAssignment.endTime}
					address={activeAssignment.address}
					personCount={activeAssignment.personCount}
				/>
			) : null}
		</DragOverlay>
		</DndContext>
	);
}

