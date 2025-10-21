'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FeatureFlagToggle } from './feature-flag-toggle';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { FeatureFlag } from '@/lib/super-admin/feature-flags';

interface FeatureFlagsPageClientProps {
	initialFlags: FeatureFlag[];
}

export function FeatureFlagsPageClient({ initialFlags }: FeatureFlagsPageClientProps) {
	const [flags, setFlags] = useState(initialFlags);
	const [searchQuery, setSearchQuery] = useState('');
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [creating, setCreating] = useState(false);

	// Form state
	const [newFlagName, setNewFlagName] = useState('');
	const [newFlagDescription, setNewFlagDescription] = useState('');
	const [newFlagEnabled, setNewFlagEnabled] = useState(false);

	const filteredFlags = flags.filter(flag =>
		flag.flag_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		(flag.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
	);

	async function handleCreate() {
		if (!newFlagName.trim()) {
			toast.error('Flag name krävs');
			return;
		}

		setCreating(true);
		try {
			const response = await fetch('/api/super-admin/system/features', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					flag_name: newFlagName,
					is_enabled: newFlagEnabled,
					description: newFlagDescription || null,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte skapa feature flag');
			}

			const newFlag = await response.json();
			setFlags([...flags, newFlag]);
			
			toast.success('Feature flag skapad', {
				description: `${newFlagName} har lagts till`,
			});

			// Reset form
			setNewFlagName('');
			setNewFlagDescription('');
			setNewFlagEnabled(false);
			setShowCreateForm(false);
		} catch (error) {
			console.error('Error creating feature flag:', error);
			toast.error('Kunde inte skapa feature flag', {
				description: error instanceof Error ? error.message : 'Ett fel uppstod',
			});
		} finally {
			setCreating(false);
		}
	}

	function handleToggle(flagName: string, isEnabled: boolean) {
		setFlags(flags.map(flag =>
			flag.flag_name === flagName ? { ...flag, is_enabled: isEnabled } : flag
		));
	}

	const enabledCount = flags.filter(f => f.is_enabled).length;
	const disabledCount = flags.length - enabledCount;

	return (
		<div className="space-y-6">
			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Totalt</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{flags.length}</div>
						<p className="text-xs text-muted-foreground">Feature flags</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Aktiva</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{enabledCount}</div>
						<p className="text-xs text-muted-foreground">Påslagna features</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Inaktiva</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-gray-600">{disabledCount}</div>
						<p className="text-xs text-muted-foreground">Avstängda features</p>
					</CardContent>
				</Card>
			</div>

			{/* Search & Create */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Feature Flags</CardTitle>
							<CardDescription>
								Hantera globala feature toggles
							</CardDescription>
						</div>
						<Button onClick={() => setShowCreateForm(!showCreateForm)}>
							<Plus className="w-4 h-4 mr-2" />
							Ny Flag
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
						<Input
							placeholder="Sök feature flags..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>

					{/* Create Form */}
					{showCreateForm && (
						<Card className="border-2 border-primary/20">
							<CardHeader>
								<CardTitle className="text-lg">Skapa ny Feature Flag</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="flag_name">Flag Name *</Label>
									<Input
										id="flag_name"
										placeholder="enable_feature_name"
										value={newFlagName}
										onChange={(e) => setNewFlagName(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="description">Beskrivning</Label>
									<Textarea
										id="description"
										placeholder="Beskriv vad denna feature flag gör..."
										value={newFlagDescription}
										onChange={(e) => setNewFlagDescription(e.target.value)}
										rows={2}
									/>
								</div>
								<div className="flex items-center gap-2">
									<input
										type="checkbox"
										id="enabled"
										checked={newFlagEnabled}
										onChange={(e) => setNewFlagEnabled(e.target.checked)}
										className="w-4 h-4"
									/>
									<Label htmlFor="enabled">Aktiverad från start</Label>
								</div>
								<div className="flex gap-2">
									<Button onClick={handleCreate} disabled={creating}>
										{creating ? 'Skapar...' : 'Skapa'}
									</Button>
									<Button variant="outline" onClick={() => setShowCreateForm(false)}>
										Avbryt
									</Button>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Flags List */}
					<div className="space-y-2">
						{filteredFlags.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								{searchQuery ? 'Inga feature flags hittades' : 'Inga feature flags än'}
							</div>
						) : (
							filteredFlags.map((flag) => (
								<FeatureFlagToggle
									key={flag.id}
									flagName={flag.flag_name}
									isEnabled={flag.is_enabled}
									description={flag.description}
									onToggle={handleToggle}
								/>
							))
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

