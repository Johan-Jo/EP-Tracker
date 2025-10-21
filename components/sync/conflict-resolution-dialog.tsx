'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AlertTriangle, Check } from 'lucide-react';
import { ConflictData, ConflictStrategy, formatConflictForDisplay } from '@/lib/sync/conflict-resolver';

interface ConflictResolutionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	conflict: ConflictData;
	onResolve: (strategy: ConflictStrategy) => void;
}

export function ConflictResolutionDialog({
	open,
	onOpenChange,
	conflict,
	onResolve,
}: ConflictResolutionDialogProps) {
	const [selectedStrategy, setSelectedStrategy] = useState<ConflictStrategy | null>(null);
	const { title, localSummary, serverSummary, recommendation } = formatConflictForDisplay(conflict);

	function handleResolve() {
		if (selectedStrategy) {
			onResolve(selectedStrategy);
			onOpenChange(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-orange-600" />
						{title}
					</DialogTitle>
					<DialogDescription>
						Samma data har ändrats både lokalt och på servern. Välj vilken version du vill behålla.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Recommendation */}
					<div className="p-3 bg-muted rounded-lg">
						<p className="text-sm font-medium mb-1">Rekommendation:</p>
						<p className="text-sm text-muted-foreground">{recommendation}</p>
					</div>

					{/* Local Version */}
					<Card
						className={`p-4 cursor-pointer transition-all ${
							selectedStrategy === 'keep_local'
								? 'ring-2 ring-primary'
								: 'hover:bg-muted/50'
						}`}
						onClick={() => setSelectedStrategy('keep_local')}
					>
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<Badge variant="default">Din version</Badge>
									{selectedStrategy === 'keep_local' && (
										<Check className="h-4 w-4 text-primary" />
									)}
								</div>
								<p className="text-sm text-muted-foreground mb-3">{localSummary}</p>
								<div className="bg-muted p-3 rounded text-sm font-mono">
									<pre className="overflow-x-auto">
										{JSON.stringify(conflict.localVersion, null, 2)}
									</pre>
								</div>
							</div>
						</div>
					</Card>

					{/* Server Version */}
					<Card
						className={`p-4 cursor-pointer transition-all ${
							selectedStrategy === 'use_server'
								? 'ring-2 ring-primary'
								: 'hover:bg-muted/50'
						}`}
						onClick={() => setSelectedStrategy('use_server')}
					>
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<Badge variant="secondary">Server-version</Badge>
									{selectedStrategy === 'use_server' && (
										<Check className="h-4 w-4 text-primary" />
									)}
								</div>
								<p className="text-sm text-muted-foreground mb-3">{serverSummary}</p>
								<div className="bg-muted p-3 rounded text-sm font-mono">
									<pre className="overflow-x-auto">
										{JSON.stringify(conflict.serverVersion, null, 2)}
									</pre>
								</div>
							</div>
						</div>
					</Card>

					{/* Action Buttons */}
					<div className="flex justify-end gap-2 pt-4">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Avbryt
						</Button>
						<Button
							onClick={handleResolve}
							disabled={!selectedStrategy}
						>
							Lös konflikt
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

