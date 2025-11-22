'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Project {
	id: string;
	name: string;
	color: string;
}

interface ProjectChipsProps {
	projects: Project[];
	selectedProject: string | null;
	onChange: (projectId: string | null) => void;
}

export function ProjectChips({ projects, selectedProject, onChange }: ProjectChipsProps) {
	const selectedValue = selectedProject || 'all';
	const selectedProjectData = selectedProject ? projects.find(p => p.id === selectedProject) : null;

	const handleValueChange = (value: string) => {
		onChange(value === 'all' ? null : value);
	};

	return (
		<Select value={selectedValue} onValueChange={handleValueChange}>
			<SelectTrigger className="h-10 w-full max-w-xs rounded-xl border border-border/60 bg-white text-sm text-foreground focus-visible:ring-orange-500 dark:border-[#3a251d] dark:bg-[#261912] dark:text-white">
				<span className="flex items-center gap-2">
					{selectedProjectData && (
						<div
							className="h-2.5 w-2.5 rounded-full flex-shrink-0"
							style={{ backgroundColor: selectedProjectData.color }}
						/>
					)}
					<SelectValue placeholder="Alla projekt" />
				</span>
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">Alla projekt</SelectItem>
				{projects.map((project) => (
					<SelectItem key={project.id} value={project.id}>
						<div className="flex items-center gap-2">
							<div
								className="h-2.5 w-2.5 rounded-full flex-shrink-0"
								style={{ backgroundColor: project.color }}
							/>
							{project.name}
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

