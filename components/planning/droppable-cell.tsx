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
			className={[
				'relative min-h-[88px] cursor-pointer border-r border-border/30 p-2 transition-colors last:border-r-0',
				'bg-white hover:bg-muted/40 dark:border-[#2d1c15] dark:bg-[#1c110d] dark:hover:bg-[#23160f]',
				isOver ? 'border-2 border-dashed border-orange-500/70 bg-orange-500/10 dark:border-orange-400/60 dark:bg-orange-500/10' : '',
			].join(' ')}
		>
			<div className="space-y-2">
				{children}
			</div>
		</div>
	);
}

