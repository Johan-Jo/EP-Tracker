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
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-xs">
				<span className="text-muted-foreground">{day}</span>
				<div className="flex items-center gap-2">
					<span className={`${isUnderCapacity ? 'text-destructive' : isOverCapacity ? 'text-orange-600' : 'text-green-600'}`}>
						{assigned}/{needed}
					</span>
				</div>
			</div>
			<div className="h-2 bg-muted rounded-full overflow-hidden">
				<div
					className={`h-full transition-all duration-300 ${
						isUnderCapacity ? 'bg-destructive' : isOverCapacity ? 'bg-orange-500' : 'bg-green-500'
					}`}
					style={{ width: `${Math.min(percentage, 100)}%` }}
				/>
			</div>
		</div>
	);
}

