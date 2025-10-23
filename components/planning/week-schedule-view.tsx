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

	// Group assignments by user and day
	const assignmentsByUserDay: { [key: string]: { [day: number]: any[] } } = {};
	data.assignments.forEach(assignment => {
		const assignmentDate = new Date(assignment.start_ts);
		const dayIndex = Math.floor((assignmentDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
		
		if (dayIndex >= 0 && dayIndex < 7) {
			if (!assignmentsByUserDay[assignment.user_id]) {
				assignmentsByUserDay[assignment.user_id] = {};
			}
			if (!assignmentsByUserDay[assignment.user_id][dayIndex]) {
				assignmentsByUserDay[assignment.user_id][dayIndex] = [];
			}
			assignmentsByUserDay[assignment.user_id][dayIndex].push({
				id: assignment.id,
				project: assignment.project.name,
				projectColor: assignment.project.color,
				startTime: assignment.all_day ? 'Heldag' : format(new Date(assignment.start_ts), 'HH:mm'),
				endTime: assignment.all_day ? '' : format(new Date(assignment.end_ts), 'HH:mm'),
				address: assignment.address || assignment.project.client_name,
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
				needed += assignment.project.daily_capacity_need || 0;
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
		
		// Use optimistic mutation - UI updates instantly!
		onDragDropUpdate({
			assignmentId: assignment.id,
			payload,
		});
	};

	const handleDragCancel = () => {
		setActiveId(null);
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
				address: assignment.address || assignment.project.client_name,
				personCount: undefined,
			};
		})()
		: null;

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="bg-background border-b border-border">
				<div className="px-6 py-4">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-2xl font-bold mb-1">Veckoplanering</h1>
							<p className="text-sm text-muted-foreground">
								Vecka {weekNumber} • {year}
							</p>
						</div>
						<Button
							onClick={() => setShowAddDialog(true)}
							className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200"
						>
							<Plus className="w-4 h-4 mr-2" />
							Lägg till uppdrag
						</Button>
					</div>

					{/* Project Filter Chips */}
					<div className="mb-4">
						<ProjectChips
							projects={data.projects}
							selectedProjects={selectedProjects}
							onToggle={handleProjectToggle}
						/>
					</div>

					{/* Search and Filters */}
					<div className="flex gap-2">
						<div className="relative flex-1 max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								placeholder="Sök uppdrag, personal eller projekt..."
								className="pl-9"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
						<Button variant="outline" className="shrink-0">
							<Filter className="w-4 h-4 mr-2" />
							Filter
						</Button>
					</div>
				</div>
			</div>

			{/* Week Navigation & Capacity */}
			<div className="px-6 py-3 bg-accent/50 border-b border-border">
				<div className="flex items-center gap-4 mb-3">
					<Button variant="outline" size="sm" onClick={handlePreviousWeek}>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<div className="flex-1 flex items-center justify-center gap-2">
						<h3 className="text-base font-medium">
							{format(weekStart, 'd', { locale: sv })}–{format(weekEnd, 'd MMMM yyyy', { locale: sv })}
						</h3>
					</div>
					<Button variant="outline" size="sm" onClick={handleNextWeek}>
						<ChevronRight className="w-4 h-4" />
					</Button>
				</div>

				{/* Capacity Indicators */}
				<div className="grid grid-cols-7 gap-2">
					{weekDays.map((day, index) => (
						<CapacityIndicator
							key={day.short}
							day={day.short}
							needed={capacity[index].needed}
							assigned={capacity[index].assigned}
						/>
					))}
				</div>
			</div>

			{/* Schedule Grid */}
			<div className="flex-1 overflow-auto">
				<div className="min-w-[1200px]">
					{/* Header Row */}
					<div className="sticky top-0 z-10 bg-background border-b border-border grid grid-cols-[200px_repeat(7,1fr)]">
						<div className="p-3 border-r border-border bg-card">
							<p className="text-sm font-medium text-muted-foreground">Personal</p>
						</div>
						{weekDays.map((day) => (
							<div key={day.short} className="p-3 border-r border-border bg-card last:border-r-0">
								<p className="text-sm font-medium">{day.short}</p>
								<p className="text-xs text-muted-foreground">{day.date}</p>
							</div>
						))}
					</div>

					{/* Person Rows */}
					{filteredResources.map((person) => (
						<div
							key={person.id}
							className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-border hover:bg-accent/30 transition-colors"
						>
							{/* Person Info */}
							<div className="border-r border-border bg-card sticky left-0 z-10">
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
												// Find the full assignment data
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
				projects={data.projects}
				users={data.resources.map(r => ({ id: r.id, name: r.full_name || r.email }))}
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

