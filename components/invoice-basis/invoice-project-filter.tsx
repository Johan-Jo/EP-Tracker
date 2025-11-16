'use client';

import { useState } from 'react';
import { Calendar, Check, ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Project {
	id: string;
	name: string;
	projectNumber: string | null;
}

interface InvoiceProjectFilterProps {
	projects: Project[];
	selectedProjectIds: string[];
	onProjectIdsChange: (ids: string[]) => void;
	periodStart: string;
	onPeriodStartChange: (date: string) => void;
	periodEnd: string;
	onPeriodEndChange: (date: string) => void;
	onFetchBasis: () => void;
	isLoading?: boolean;
	canFetch?: boolean;
}

/**
 * Step 1: Project & Period Filter Component
 * 
 * Multi-select project filter with date range and "Hämta underlag" button.
 */
export function InvoiceProjectFilter({
	projects,
	selectedProjectIds,
	onProjectIdsChange,
	periodStart,
	onPeriodStartChange,
	periodEnd,
	onPeriodEndChange,
	onFetchBasis,
	isLoading = false,
	canFetch = false,
}: InvoiceProjectFilterProps) {
	const [isProjectPopoverOpen, setIsProjectPopoverOpen] = useState(false);

	const toggleProject = (projectId: string) => {
		if (selectedProjectIds.includes(projectId)) {
			onProjectIdsChange(selectedProjectIds.filter((id) => id !== projectId));
		} else {
			onProjectIdsChange([...selectedProjectIds, projectId]);
		}
	};

	const selectAllProjects = () => {
		onProjectIdsChange(projects.map((p) => p.id));
	};

	const deselectAllProjects = () => {
		onProjectIdsChange([]);
	};

	const selectedProjectsDisplay =
		selectedProjectIds.length === 0
			? 'Välj projekt'
			: selectedProjectIds.length === 1
			? projects.find((p) => p.id === selectedProjectIds[0])?.name || 'Välj projekt'
			: `${selectedProjectIds.length} projekt valda`;

	return (
		<div className="rounded-lg border border-border/60 bg-card/50 p-4 shadow-sm">
			<div className="mb-3 flex items-center gap-2">
				<Filter className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm font-semibold text-foreground">Steg 1: Välj projekt & period</span>
			</div>
			<div className="flex flex-col gap-4 md:flex-row md:items-end">
				{/* Multi-select Project */}
				<div className="flex-1 space-y-2">
					<Label className="text-xs font-medium text-muted-foreground">Projekt *</Label>
					<Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								role="combobox"
								className={cn(
									'h-10 w-full justify-between',
									!selectedProjectIds.length && 'text-muted-foreground'
								)}
							>
								<span className="truncate">{selectedProjectsDisplay}</span>
								<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[400px] p-0" align="start">
							<div className="p-3">
								<div className="mb-2 flex items-center justify-between">
									<span className="text-sm font-medium">Välj projekt</span>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={selectAllProjects}
											className="h-7 text-xs"
										>
											Välj alla
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={deselectAllProjects}
											className="h-7 text-xs"
										>
											Avmarkera alla
										</Button>
									</div>
								</div>
								<div className="max-h-[300px] overflow-y-auto">
									<div className="space-y-2">
										{projects.map((project) => {
											const isSelected = selectedProjectIds.includes(project.id);
											return (
												<div
													key={project.id}
													className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent"
												>
													<Checkbox
														id={`project-${project.id}`}
														checked={isSelected}
														onCheckedChange={() => toggleProject(project.id)}
													/>
													<label
														htmlFor={`project-${project.id}`}
														className="flex-1 cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
													>
														{project.projectNumber ? (
															<span>
																<span className="font-medium">{project.projectNumber}</span> – {project.name}
															</span>
														) : (
															<span>{project.name}</span>
														)}
													</label>
													{isSelected && <Check className="h-4 w-4 text-primary" />}
												</div>
											);
										})}
									</div>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				</div>

				{/* Date Range */}
				<div className="flex flex-1 gap-3">
					<div className="flex-1 space-y-2">
						<Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
							<Calendar className="h-3 w-3" />
							Från *
						</Label>
						<Input
							type="date"
							value={periodStart}
							onChange={(e) => onPeriodStartChange(e.target.value)}
							className="h-10"
						/>
					</div>
					<div className="flex-1 space-y-2">
						<Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
							<Calendar className="h-3 w-3" />
							Till *
						</Label>
						<Input
							type="date"
							value={periodEnd}
							onChange={(e) => onPeriodEndChange(e.target.value)}
							className="h-10"
							min={periodStart}
						/>
					</div>
				</div>

				{/* Fetch Button */}
				<div className="flex items-end">
					<Button
						onClick={onFetchBasis}
						disabled={!canFetch || isLoading}
						className="h-10 w-full md:w-auto"
					>
						{isLoading ? 'Hämtar...' : 'Hämta underlag'}
					</Button>
				</div>
			</div>
		</div>
	);
}

