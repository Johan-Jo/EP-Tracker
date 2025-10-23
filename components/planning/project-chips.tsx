'use client';

import { Badge } from '@/components/ui/badge';

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
			<Badge 
				variant="outline" 
				className={`bg-card cursor-pointer hover:bg-accent transition-colors ${isAllSelected ? 'border-primary bg-primary/10' : ''}`}
				onClick={() => onToggle('all')}
			>
				Alla projekt
			</Badge>
			{projects.map((project) => {
				const isSelected = selectedProjects.includes(project.id);
				return (
					<Badge
						key={project.id}
						variant="outline"
						className={`bg-card cursor-pointer hover:bg-accent transition-colors ${isSelected ? 'border-primary bg-primary/10' : ''}`}
						onClick={() => onToggle(project.id)}
					>
						<div
							className="w-2 h-2 rounded-full mr-1.5"
							style={{ backgroundColor: project.color }}
						/>
						{project.name}
					</Badge>
				);
			})}
		</div>
	);
}

