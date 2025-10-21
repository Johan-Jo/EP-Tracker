'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MaintenanceMode } from '@/lib/super-admin/maintenance';

interface MaintenanceModeToggleProps {
	initialStatus: MaintenanceMode | null;
}

export function MaintenanceModeToggle({ initialStatus }: MaintenanceModeToggleProps) {
	const [status, setStatus] = useState(initialStatus);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState(
		initialStatus?.message || 'Systemet är tillfälligt under underhåll. Vänligen försök igen senare.'
	);

	const isActive = status?.is_active ?? false;

	async function handleToggle(checked: boolean) {
		setLoading(true);
		try {
			const endpoint = checked ? '/api/super-admin/system/maintenance/enable' : '/api/super-admin/system/maintenance/disable';
			
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: checked ? JSON.stringify({ message }) : undefined,
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte uppdatera underhållsläge');
			}

			const data = await response.json();
			setStatus(data);

			toast.success(checked ? 'Underhållsläge aktiverat' : 'Underhållsläge inaktiverat', {
				description: checked 
					? 'Användare kan inte längre logga in (utom super admins)'
					: 'Systemet är nu tillgängligt igen',
			});
		} catch (error) {
			console.error('Error toggling maintenance mode:', error);
			toast.error('Kunde inte uppdatera underhållsläge', {
				description: error instanceof Error ? error.message : 'Ett fel uppstod',
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<Card className={isActive ? 'border-orange-300 bg-orange-50/50' : ''}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							{isActive ? (
								<>
									<AlertTriangle className="w-5 h-5 text-orange-600" />
									Underhållsläge aktivt
								</>
							) : (
								<>
									<CheckCircle2 className="w-5 h-5 text-green-600" />
									System igång
								</>
							)}
						</CardTitle>
						<CardDescription>
							{isActive 
								? 'Endast super admins kan logga in'
								: 'Alla användare kan logga in normalt'
							}
						</CardDescription>
					</div>
					<Switch
						checked={isActive}
						onCheckedChange={handleToggle}
						disabled={loading}
					/>
				</div>
			</CardHeader>

			{isActive && (
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="maintenance-message">Meddelande till användare</Label>
						<Textarea
							id="maintenance-message"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={3}
							placeholder="Meddelande som visas för användare..."
						/>
						<p className="text-xs text-muted-foreground">
							Detta meddelande visas för användare som försöker logga in
						</p>
					</div>

					{status?.enabled_at && (
						<div className="text-sm text-muted-foreground">
							Aktiverat: {new Date(status.enabled_at).toLocaleString('sv-SE')}
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
}

