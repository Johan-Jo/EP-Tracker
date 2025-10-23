'use client';

import { GripVertical, Drill, MapPin, Clock, Users } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

interface AssignmentCardProps {
	id: string;
	project: string;
	projectColor: string;
	startTime: string;
	endTime: string;
	address?: string;
	personCount?: number;
	onClick?: (e: React.MouseEvent) => void;
}

export function AssignmentCard({
	id,
	project,
	projectColor,
	startTime,
	endTime,
	address,
	personCount,
	onClick
}: AssignmentCardProps) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: id,
	});

	const style = transform ? {
		transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
	} : undefined;

	return (
		<button
			ref={setNodeRef}
			style={style}
			onClick={onClick}
			{...listeners}
			{...attributes}
			className={`group relative w-full text-left bg-card border-2 border-border rounded-lg p-2 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
				isDragging ? 'opacity-50 scale-95' : ''
			}`}
		>
			{/* Drag Handle - visual indicator only */}
			<div 
				className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
			>
				<GripVertical className="w-4 h-4 text-muted-foreground" />
			</div>

			{/* Project Color Strip */}
			<div
				className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
				style={{ backgroundColor: projectColor }}
			/>

			<div className="ml-2 space-y-1.5">
				{/* Project Name */}
				<div className="flex items-center gap-1.5">
					<div
						className="w-2 h-2 rounded-full shrink-0"
						style={{ backgroundColor: projectColor }}
					/>
					<p className="text-xs truncate">{project}</p>
				</div>

				{/* Time */}
				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					<Clock className="w-3 h-3" />
					<span>{startTime}–{endTime}</span>
				</div>

				{/* Address */}
				{address && (
					<div className="flex items-center gap-1 text-xs text-muted-foreground" title={address}>
						<MapPin className="w-3 h-3 shrink-0" />
						<span className="truncate">{address}</span>
					</div>
				)}

				{/* Icon & Person Count */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1 text-primary">
						<Drill className="w-3.5 h-3.5" />
					</div>
					{personCount && personCount > 1 && (
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<Users className="w-3 h-3" />
							<span>{personCount}</span>
						</div>
					)}
				</div>
			</div>
		</button>
	);
}

