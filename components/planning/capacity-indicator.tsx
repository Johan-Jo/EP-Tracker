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
		<div className="rounded-2xl border border-border/40 bg-white/80 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/10">
			<div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
				<span className="uppercase tracking-[0.3em] text-[10px] text-muted-foreground">{day}</span>
				<span className={isUnderCapacity ? 'text-red-500' : isOverCapacity ? 'text-orange-500' : 'text-emerald-500'}>
					{assigned}/{needed}
				</span>
			</div>
			<div className="mt-2 h-2 rounded-full bg-muted/80 dark:bg-white/10 overflow-hidden">
				<div
					className={`h-full transition-all duration-300 ${isUnderCapacity ? 'bg-red-500' : isOverCapacity ? 'bg-orange-500' : 'bg-emerald-500'}`}
					style={{ width: `${Math.min(percentage, 100)}%` }}
				/>
			</div>
		</div>
	);
}

