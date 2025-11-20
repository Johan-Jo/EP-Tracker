'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, Loader2, Save, RefreshCw } from 'lucide-react';

interface FortnoxPayrollMappingsProps {
	orgId: string;
}

interface WageMapping {
	id?: string;
	ep_wage_type: string;
	fortnox_salary_code: string;
	description?: string;
	is_active: boolean;
}

type WageTypeConfig = {
	label: string;
	recommended?: boolean;
};

/**
 * UI configuration for each EP-Tracker wage type
 * Maps internal wage types to human-readable Swedish labels
 */
const WAGE_TYPE_UI_CONFIG: Record<string, WageTypeConfig> = {
	normal: {
		label: 'Normal arbetstid (timlön)',
		recommended: true,
	},
	overtime: {
		label: 'Övertid',
		recommended: true,
	},
	ob: {
		label: 'OB (natt/helg/helgdag)',
		recommended: true,
	},
};

/**
 * Default wage types that should always be available in the UI
 */
const DEFAULT_WAGE_TYPES = ['normal', 'overtime', 'ob'] as const;

export function FortnoxPayrollMappings({ orgId }: FortnoxPayrollMappingsProps) {
	const queryClient = useQueryClient();

	// Fetch existing mappings
	const { data, isLoading, error } = useQuery<{ mappings: WageMapping[] }>({
		queryKey: ['fortnox-wage-mappings', orgId],
		queryFn: async () => {
			const response = await fetch('/api/integrations/fortnox/payroll-mappings/wage-codes');
			if (!response.ok) {
				throw new Error('Kunde inte hämta mappningar');
			}
			return response.json();
		},
	});

	// Local state for editable mappings
	const [localMappings, setLocalMappings] = useState<Record<string, WageMapping>>({});
	const [hasChanges, setHasChanges] = useState(false);

	// Merge backend mappings with default wage types
	const allMappings = useMemo(() => {
		const backendMappings = (data?.mappings || []).reduce(
			(acc, mapping) => {
				acc[mapping.ep_wage_type] = mapping;
				return acc;
			},
			{} as Record<string, WageMapping>
		);

		// Start with backend data, then merge with local changes
		const merged = { ...backendMappings, ...localMappings };

		// Ensure all default wage types exist
		for (const wageType of DEFAULT_WAGE_TYPES) {
			if (!merged[wageType]) {
				merged[wageType] = {
					ep_wage_type: wageType,
					fortnox_salary_code: '',
					is_active: true,
				};
			}
		}

		return merged;
	}, [data?.mappings, localMappings]);

	// Update local state when backend data changes (but preserve unsaved changes)
	useEffect(() => {
		if (data?.mappings && Object.keys(localMappings).length === 0 && !hasChanges) {
			const initialMappings = data.mappings.reduce(
				(acc, mapping) => {
					acc[mapping.ep_wage_type] = mapping;
					return acc;
				},
				{} as Record<string, WageMapping>
			);
			setLocalMappings(initialMappings);
			setHasChanges(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.mappings]);

	// Save mutation
	const saveMappings = useMutation({
		mutationFn: async (mappings: WageMapping[]) => {
			const response = await fetch('/api/integrations/fortnox/payroll-mappings/wage-codes', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ mappings }),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Kunde inte spara mappningar');
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['fortnox-wage-mappings', orgId] });
			setHasChanges(false);
			setLocalMappings({});
			toast.success('Lönemappning sparad');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte spara mappningar');
		},
	});

	const handleUpdateMapping = (wageType: string, field: keyof WageMapping, value: unknown) => {
		setLocalMappings((prev) => ({
			...prev,
			[wageType]: {
				...allMappings[wageType],
				[field]: value,
			},
		}));
		setHasChanges(true);
	};

	const handleSave = () => {
		const mappingsToSave = Object.values(allMappings).filter(
			(m) => m.fortnox_salary_code.trim() !== ''
		);

		if (mappingsToSave.length === 0) {
			toast.error('Fyll i minst en Fortnox-kod innan du sparar');
			return;
		}

		// Validate that all required mappings have codes
		for (const wageType of DEFAULT_WAGE_TYPES) {
			const mapping = allMappings[wageType];
			if (mapping && !mapping.fortnox_salary_code.trim()) {
				const config = WAGE_TYPE_UI_CONFIG[wageType];
				toast.error(`Fyll i Fortnox-kod för "${config.label}" innan du sparar`);
				return;
			}
		}

		saveMappings.mutate(mappingsToSave);
	};

	const handleReset = () => {
		setLocalMappings({});
		setHasChanges(false);
		queryClient.invalidateQueries({ queryKey: ['fortnox-wage-mappings', orgId] });
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className='pt-6'>
					<div className='flex items-center justify-center py-8'>
						<Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
						<span className='ml-2 text-sm text-muted-foreground'>Laddar mappningar...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className='pt-6'>
					<Alert variant='destructive'>
						<AlertDescription>
							Kunde inte ladda mappningar. Försök igen senare.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className='space-y-6'>
			{/* Intro Card */}
			<Card>
				<CardHeader>
					<CardTitle>Lönearter & koder</CardTitle>
					<CardDescription>
						Här kopplar du EP-Trackers lönetyper till Fortnox lönearter och registreringskoder.
						Export av löner till Fortnox fungerar först när minst grundläggande koder är
						ifyllda.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert>
						<InfoIcon className='h-4 w-4' />
						<AlertDescription>
							Tips: Öppna Fortnox → Register → Lönearter och koder och använd samma koder
							här.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>

			{/* Mapping Table Card */}
			<Card>
				<CardHeader>
					<CardTitle>Mappning av lönetyper</CardTitle>
					<CardDescription>
						Ange Fortnox lönearter (SalaryCode) för varje EP-Tracker lönetyp
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='overflow-x-auto'>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>EP-lönetyp</TableHead>
									<TableHead>Fortnox-kod</TableHead>
									<TableHead>Beskrivning</TableHead>
									<TableHead>Aktiv</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{DEFAULT_WAGE_TYPES.map((wageType) => {
									const mapping = allMappings[wageType];
									const config = WAGE_TYPE_UI_CONFIG[wageType];

									if (!mapping) return null;

									return (
										<TableRow key={wageType}>
											<TableCell>
												<div className='flex flex-col gap-1'>
													<span className='font-medium'>{config.label}</span>
													<Badge variant='outline' className='w-fit'>
														{wageType}
													</Badge>
													{config.recommended && (
														<span className='text-xs text-muted-foreground'>
															Rekommenderad
														</span>
													)}
												</div>
											</TableCell>
											<TableCell>
												<Input
													value={mapping.fortnox_salary_code || ''}
													onChange={(e) =>
														handleUpdateMapping(
															wageType,
															'fortnox_salary_code',
															e.target.value
														)
													}
													placeholder='t.ex. "100"'
													className='font-mono max-w-[120px]'
												/>
											</TableCell>
											<TableCell>
												<Input
													value={mapping.description || ''}
													onChange={(e) =>
														handleUpdateMapping(
															wageType,
															'description',
															e.target.value
														)
													}
													placeholder='Valfritt'
													className='max-w-[200px]'
												/>
											</TableCell>
											<TableCell>
												<Switch
													checked={mapping.is_active !== false}
													onCheckedChange={(checked) =>
														handleUpdateMapping(wageType, 'is_active', checked)
													}
												/>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</CardContent>
				<CardFooter className='flex justify-between items-center'>
					<Button
						variant='outline'
						onClick={handleReset}
						disabled={!hasChanges || saveMappings.isPending}
					>
						<RefreshCw className='mr-2 h-4 w-4' />
						Återställ ändringar
					</Button>
					<Button
						onClick={handleSave}
						disabled={!hasChanges || saveMappings.isPending}
					>
						{saveMappings.isPending ? (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Sparar...
							</>
						) : (
							<>
								<Save className='mr-2 h-4 w-4' />
								Spara mappning
							</>
						)}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
