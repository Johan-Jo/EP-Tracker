'use client';

interface CapacityIndicatorProps {
	needed: number;
	assigned: number;
	day: string;
}

export function CapacityIndicator({ needed, assigned, day }: CapacityIndicatorProps) {
	const ratio = needed > 0 ? Math.min(assigned / needed, 1) : 0;
	const statusClass = ratio < 1
		? assigned === 0
			? 'bg-muted/70 dark:bg-[#2c1a13]'
			: 'bg-orange-500/40 dark:bg-orange-400/30'
		: 'bg-emerald-500/40 dark:bg-emerald-400/30';

	return (
		<div className="flex flex-col items-center gap-2 text-xs text-muted-foreground dark:text-white/70">
			<span className="uppercase tracking-[0.22em]">{day}</span>
			<div className="relative h-3 w-full max-w-[118px] rounded-full bg-muted/60 dark:bg-[#2a1912]">
				<div
					className={`absolute inset-y-0 left-0 rounded-full ${statusClass}`}
					style={{ width: `${ratio * 100}%` }}
				/>
				<span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-muted-foreground dark:text-white/80">
					{assigned}/{needed}
				</span>
			</div>
		</div>
	);
}

