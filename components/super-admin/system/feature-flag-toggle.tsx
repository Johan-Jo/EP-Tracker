'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface FeatureFlagToggleProps {
	flagName: string;
	isEnabled: boolean;
	description?: string | null;
	onToggle?: (flagName: string, isEnabled: boolean) => void;
}

export function FeatureFlagToggle({ flagName, isEnabled, description, onToggle }: FeatureFlagToggleProps) {
	const [enabled, setEnabled] = useState(isEnabled);
	const [loading, setLoading] = useState(false);

	async function handleToggle(checked: boolean) {
		setLoading(true);
		try {
			const response = await fetch(`/api/super-admin/system/features/${flagName}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_enabled: checked }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte uppdatera feature flag');
			}

			const data = await response.json();
			setEnabled(data.is_enabled);
			
			toast.success(checked ? 'Feature aktiverad' : 'Feature inaktiverad', {
				description: `${flagName} är nu ${checked ? 'påslagen' : 'avstängd'}`,
			});

			if (onToggle) {
				onToggle(flagName, checked);
			}
		} catch (error) {
			console.error('Error toggling feature flag:', error);
			toast.error('Kunde inte uppdatera feature flag', {
				description: error instanceof Error ? error.message : 'Ett fel uppstod',
			});
			// Revert the state
			setEnabled(enabled);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex items-center justify-between p-4 border rounded-lg">
			<div className="flex-1">
				<div className="flex items-center gap-2">
					<h4 className="font-medium">{flagName}</h4>
					<span className={`text-xs px-2 py-0.5 rounded-full ${
						enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
					}`}>
						{enabled ? 'Aktiv' : 'Inaktiv'}
					</span>
				</div>
				{description && (
					<p className="text-sm text-muted-foreground mt-1">{description}</p>
				)}
			</div>
			<Switch
				checked={enabled}
				onCheckedChange={handleToggle}
				disabled={loading}
			/>
		</div>
	);
}

