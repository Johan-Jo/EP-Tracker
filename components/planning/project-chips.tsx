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
					'flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-all duration-200',
					'border-border/60 bg-white/90 text-muted-foreground hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-orange-500/10 dark:border-border/40 dark:bg-white/5 dark:text-white/70',
					isAllSelected ? 'border-orange-500/60 bg-[#1f130d] text-white shadow-md dark:bg-white dark:text-[#21140d]' : '',
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
							'flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-all duration-200',
							'border-border/60 bg-white/90 text-muted-foreground hover:-translate-y-0.5 hover:border-orange-500/40 hover:bg-orange-500/10 dark:border-border/40 dark:bg-white/5 dark:text-white/70',
							isSelected ? 'border-orange-500/60 bg-[#22160e] text-white shadow-md dark:bg-white dark:text-[#22160e]' : '',
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

