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
			onClick={onClick}
			{...listeners}
			{...attributes}
			className={[
				'group relative w-full cursor-grab overflow-hidden rounded-lg border border-transparent p-3 text-left transition-transform duration-200 active:cursor-grabbing',
				'hover:-translate-y-0.5 hover:shadow-lg',
				isDragging ? 'scale-95 opacity-70' : '',
			].join(' ')}
			style={{
				...style,
				backgroundColor: projectColor,
			}}
		>
			{/* Drag Handle - visual indicator only */}
			<div 
				className="pointer-events-none absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
			>
				<GripVertical className="h-4 w-4 text-muted-foreground" />
			</div>

			{/* Project Color Strip */}
			<div
				className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
				style={{ backgroundColor: projectColor }}
			/>

			<div className="ml-1.5 space-y-1.5">
				{/* Project Name */}
				<div className="flex items-center gap-1.5">
					<div className="h-2 w-2 shrink-0 rounded-full bg-white/70" />
					<p className="truncate text-sm font-semibold text-white">{project}</p>
				</div>

				{/* Time */}
				<div className="flex items-center gap-1 text-xs text-white/80">
					<Clock className="h-3 w-3 text-white/90" />
					<span>{startTime}–{endTime}</span>
				</div>

				{/* Address */}
				{address && (
					<div className="flex items-center gap-1 text-xs text-white/80" title={address}>
						<MapPin className="h-3 w-3 shrink-0 text-white/90" />
						<span className="truncate">{address}</span>
					</div>
				)}

				{/* Icon & Person Count */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1 text-white/90">
						<Drill className="h-4 w-4" />
					</div>
					{personCount && personCount > 1 && (
						<div className="flex items-center gap-1 text-xs text-white/80">
							<Users className="h-3.5 w-3.5" />
							<span>{personCount}</span>
						</div>
					)}
				</div>
			</div>
		</button>
	);
}

