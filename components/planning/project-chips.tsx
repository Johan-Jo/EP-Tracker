'use client';

import { X } from 'lucide-react';

interface Project {
	id: string;
	name: string;
	color: string;
}

interface ProjectChipsProps {
	projects: Project[];
	selectedProjects: string[];
	onToggle: (projectId: string) => void;
}

export function ProjectChips({ projects, selectedProjects, onToggle }: ProjectChipsProps) {
	const isAllSelected = selectedProjects.length === 0;

	return (
		<div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
			<button
				type="button"
				className={[
					'flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors',
					'border border-border/60 bg-muted/60 text-muted-foreground hover:text-foreground dark:border-[#3a251d] dark:bg-[#2b1a15] dark:text-white/70 dark:hover:text-white',
					isAllSelected ? 'border-orange-500/50 bg-orange-500/10 text-orange-600 dark:border-orange-400/70 dark:bg-orange-500/15 dark:text-white' : '',
				].join(' ')}
				onClick={() => onToggle('all')}
			>
				Alla projekt
				{isAllSelected && <X className="h-3.5 w-3.5" />}
			</button>
			{projects.map((project) => {
				const isSelected = selectedProjects.includes(project.id);
				return (
					<button
						type="button"
						key={project.id}
						className={[
							'flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors',
							'border border-border/60 bg-muted/60 text-muted-foreground hover:text-foreground dark:border-[#3a251d] dark:bg-[#2b1a15] dark:text-white/70 dark:hover:text-white',
							isSelected ? 'border-orange-500/50 bg-orange-500/10 text-orange-600 dark:border-orange-400/70 dark:bg-orange-500/15 dark:text-white' : '',
						].join(' ')}
						onClick={() => onToggle(project.id)}
					>
						<div
							className="h-2.5 w-2.5 rounded-full"
							style={{ backgroundColor: project.color }}
						/>
						{project.name}
						{isSelected && <X className="h-3.5 w-3.5" />}
					</button>
				);
			})}
		</div>
	);
}

