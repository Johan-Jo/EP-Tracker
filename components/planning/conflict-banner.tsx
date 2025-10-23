'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import type { Conflict } from '@/lib/schemas/planning';

interface ConflictBannerProps {
	conflicts: Conflict[];
	onOverride?: () => void;
	onCancel: () => void;
	canOverride?: boolean;
}

export function ConflictBanner({ conflicts, onOverride, onCancel, canOverride = false }: ConflictBannerProps) {
	if (conflicts.length === 0) return null;

	return (
		<Alert variant="destructive" className="relative mb-4">
			<Button
				variant="ghost"
				size="icon"
				className="absolute right-2 top-2 h-6 w-6"
				onClick={onCancel}
			>
				<X className="h-4 w-4" />
			</Button>

			<AlertTriangle className="h-4 w-4" />
			<AlertTitle>Konflikter upptäckta</AlertTitle>
			<AlertDescription className="mt-2">
				<div className="space-y-2">
					{conflicts.map((conflict, idx) => (
						<div key={idx} className="text-sm">
							<span className="font-medium">
								{conflict.type === 'absence' ? 'Frånvaro' : 'Överlappning'}:
							</span>{' '}
							{conflict.details}
						</div>
					))}
				</div>

				{canOverride && onOverride && (
					<div className="mt-4 flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={onOverride}
							className="bg-background"
						>
							Åsidosätt konflikt
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={onCancel}
						>
							Avbryt
						</Button>
					</div>
				)}
			</AlertDescription>
		</Alert>
	);
}

