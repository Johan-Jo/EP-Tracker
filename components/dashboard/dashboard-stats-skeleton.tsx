/**
 * EPIC 26.7: Skeleton for Dashboard Stats
 * Shows while stats are loading with Suspense
 */
export function DashboardStatsSkeleton() {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{[1, 2, 3, 4].map((i) => (
				<div 
					key={i}
					className="rounded-xl border bg-card p-6 animate-pulse"
				>
					<div className="flex items-center justify-between space-y-0 pb-2">
						<div className="h-4 w-24 bg-muted rounded" />
						<div className="h-4 w-4 bg-muted rounded" />
					</div>
					<div className="space-y-2">
						<div className="h-8 w-16 bg-muted rounded" />
						<div className="h-3 w-32 bg-muted rounded" />
					</div>
				</div>
			))}
		</div>
	);
}

