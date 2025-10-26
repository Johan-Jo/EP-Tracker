/**
 * EPIC 26.7: Skeleton for Recent Activities
 * Shows while activities are loading with Suspense
 */
export function DashboardActivitiesSkeleton() {
	return (
		<div className="rounded-xl border bg-card">
			<div className="border-b p-6">
				<div className="h-5 w-32 bg-muted rounded animate-pulse" />
			</div>
			<div className="p-6 space-y-4">
				{[1, 2, 3, 4, 5].map((i) => (
					<div key={i} className="flex items-start gap-4 animate-pulse">
						<div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-3/4 bg-muted rounded" />
							<div className="h-3 w-1/2 bg-muted rounded" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

