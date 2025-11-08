'use client';

interface CapacityIndicatorProps {
	needed: number;
	assigned: number;
	day: string;
}

export function CapacityIndicator({ needed, assigned, day }: CapacityIndicatorProps) {
	const percentage = needed > 0 ? (assigned / needed) * 100 : 0;
	const isOverCapacity = assigned > needed;
	const isUnderCapacity = assigned < needed;

	return (
		<div className="rounded-lg border border-border/40 bg-white px-3 py-2 text-xs text-muted-foreground dark:border-[#322017] dark:bg-[#20130e] dark:text-white/70">
			<div className="flex items-center justify-between">
				<span className="uppercase tracking-[0.2em]">{day}</span>
				<span className={isUnderCapacity ? 'text-red-500' : isOverCapacity ? 'text-orange-500' : 'text-emerald-400'}>
					{assigned}/{needed}
				</span>
			</div>
			<div className="mt-2 h-1.5 rounded-full bg-muted/80 dark:bg-[#352117] overflow-hidden">
				<div
					className={`h-full transition-all duration-300 ${isUnderCapacity ? 'bg-red-500' : isOverCapacity ? 'bg-orange-500' : 'bg-emerald-400'}`}
					style={{ width: `${Math.min(percentage, 100)}%` }}
				/>
			</div>
		</div>
	);
}

