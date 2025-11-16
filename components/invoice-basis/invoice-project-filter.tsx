'use client';

import { useState } from 'react';
import { Calendar, Check, ChevronDown, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
	isFetchingDateRange?: boolean;
}

/**
 * Step 1: Project & Period Filter Component
 * 
 * Single-select project filter with date range and "Hämta underlag" button.
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
	isFetchingDateRange = false,
}: InvoiceProjectFilterProps) {
	const [isProjectPopoverOpen, setIsProjectPopoverOpen] = useState(false);

	const selectedProjectId = selectedProjectIds[0] || null;

	const selectProject = (projectId: string) => {
		if (selectedProjectId === projectId) {
			// Om samma projekt väljs igen, avmarkera det
			onProjectIdsChange([]);
		} else {
			// Välj det nya projektet (ersätt tidigare val)
			onProjectIdsChange([projectId]);
		}
		setIsProjectPopoverOpen(false);
	};

	const selectedProjectsDisplay =
		selectedProjectId
			? projects.find((p) => p.id === selectedProjectId)?.name || 'Välj projekt'
			: 'Välj projekt';

	return (
		<div className="rounded-lg border border-border/60 bg-card/50 p-4 shadow-sm">
			<div className="mb-3 flex items-center gap-2">
				<Filter className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm font-semibold text-foreground">Steg 1: Välj projekt & period</span>
			</div>
			<div className="flex flex-col gap-4 md:flex-row md:items-end">
				{/* Single-select Project */}
				<div className="flex-1 space-y-2">
					<Label className="text-xs font-medium text-muted-foreground">Projekt *</Label>
					<Popover open={isProjectPopoverOpen} onOpenChange={setIsProjectPopoverOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								role="combobox"
								className={cn(
									'h-10 w-full justify-between',
									!selectedProjectId && 'text-muted-foreground'
								)}
							>
								<span className="truncate">{selectedProjectsDisplay}</span>
								<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[400px] p-0" align="start">
							<div className="p-3">
								<div className="mb-2">
									<span className="text-sm font-medium">Välj projekt</span>
								</div>
								<div className="max-h-[300px] overflow-y-auto">
									<div className="space-y-1">
										{projects.map((project) => {
											const isSelected = selectedProjectId === project.id;
											return (
												<div
													key={project.id}
													onClick={() => selectProject(project.id)}
													className={cn(
														"flex items-center space-x-2 rounded-md p-2 cursor-pointer hover:bg-accent",
														isSelected && "bg-accent"
													)}
												>
													<div
														className={cn(
															"flex h-4 w-4 items-center justify-center rounded-full border-2",
															isSelected
																? "border-primary bg-primary"
																: "border-input"
														)}
													>
														{isSelected && (
															<div className="h-2 w-2 rounded-full bg-primary-foreground" />
														)}
													</div>
													<label
														className="flex-1 cursor-pointer text-sm leading-none"
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
							{isFetchingDateRange ? (
								<Loader2 className="h-3 w-3 animate-spin" />
							) : (
								<Calendar className="h-3 w-3" />
							)}
							Från *
						</Label>
						<Input
							type="date"
							value={periodStart}
							onChange={(e) => onPeriodStartChange(e.target.value)}
							className="h-10"
							disabled={isFetchingDateRange}
							placeholder={isFetchingDateRange ? 'Hämtar...' : undefined}
						/>
					</div>
					<div className="flex-1 space-y-2">
						<Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
							{isFetchingDateRange ? (
								<Loader2 className="h-3 w-3 animate-spin" />
							) : (
								<Calendar className="h-3 w-3" />
							)}
							Till *
						</Label>
						<Input
							type="date"
							value={periodEnd}
							onChange={(e) => onPeriodEndChange(e.target.value)}
							className="h-10"
							min={periodStart}
							disabled={isFetchingDateRange}
							placeholder={isFetchingDateRange ? 'Hämtar...' : undefined}
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

