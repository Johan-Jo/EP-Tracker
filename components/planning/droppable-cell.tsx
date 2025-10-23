'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableCellProps {
	id: string;
	onClick: () => void;
	children: React.ReactNode;
}

export function DroppableCell({ id, onClick, children }: DroppableCellProps) {
	const { isOver, setNodeRef } = useDroppable({
		id: id,
	});

	return (
		<div
			ref={setNodeRef}
			onClick={onClick}
			className={`p-2 border-r border-border last:border-r-0 min-h-[80px] cursor-pointer transition-colors ${
				isOver ? 'bg-primary/10 border-2 border-primary border-dashed' : 'hover:bg-accent/50'
			}`}
		>
			<div className="space-y-2">
				{children}
			</div>
		</div>
	);
}

