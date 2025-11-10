'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PayrollRules {
	normal_hours_threshold: number;
	auto_break_duration: number;
	auto_break_after_hours: number;
	overtime_multiplier: number;
	ob_rates: {
		night: number;
		weekend: number;
		holiday: number;
	};
}

export function PayrollRulesForm() {
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState<PayrollRules>({
		normal_hours_threshold: 40,
		auto_break_duration: 30,
		auto_break_after_hours: 6.0,
		overtime_multiplier: 1.5,
		ob_rates: {
			night: 1.2,
			weekend: 1.5,
			holiday: 2.0,
		},
	});

	// Fetch existing rules
	const { data: rulesData, isLoading } = useQuery<{ rules: PayrollRules }>({
		queryKey: ['payroll-rules'],
		queryFn: async () => {
			const response = await fetch('/api/payroll/rules');
			if (!response.ok) {
				throw new Error('Failed to fetch payroll rules');
			}
			return response.json();
		},
	});

	// Update form when rules are loaded
	useEffect(() => {
		if (rulesData?.rules) {
			setFormData(rulesData.rules);
		}
	}, [rulesData]);

	// Save mutation
	const saveMutation = useMutation({
		mutationFn: async (data: PayrollRules) => {
			const response = await fetch('/api/payroll/rules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to save payroll rules');
			}

			return response.json();
		},
		onSuccess: () => {
			toast.success('Löneregler sparade');
			queryClient.invalidateQueries({ queryKey: ['payroll-rules'] });
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Kunde inte spara löneregler');
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		saveMutation.mutate(formData);
	};

	const updateField = (field: keyof PayrollRules, value: number) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const updateOBRate = (rate: keyof PayrollRules['ob_rates'], value: number) => {
		setFormData((prev) => ({
			...prev,
			ob_rates: { ...prev.ob_rates, [rate]: value },
		}));
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className='py-12 text-center'>
					<Loader2 className='w-8 h-8 animate-spin mx-auto text-muted-foreground' />
					<p className='text-muted-foreground mt-4'>Laddar löneregler...</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<form onSubmit={handleSubmit}>
			<Card>
				<CardHeader>
					<CardTitle>Löneregler</CardTitle>
					<CardDescription>
						Konfigurera regler för beräkning av löneunderlag: övertid, rastar och OB-timmar
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-6'>
					{/* Overtime Rules */}
					<div className='space-y-4'>
						<h3 className='text-lg font-semibold'>Övertidsregler</h3>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div>
								<Label htmlFor='normal_hours_threshold'>
									Normal arbetstid per vecka (timmar)
								</Label>
								<Input
									id='normal_hours_threshold'
									type='number'
									min='1'
									max='80'
									value={formData.normal_hours_threshold}
									onChange={(e) => updateField('normal_hours_threshold', Number(e.target.value))}
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Timmar över detta räknas som övertid (standard: 40h/vecka)
								</p>
							</div>
							<div>
								<Label htmlFor='overtime_multiplier'>Övertidsmultiplikator</Label>
								<Input
									id='overtime_multiplier'
									type='number'
									step='0.1'
									min='1'
									max='3'
									value={formData.overtime_multiplier}
									onChange={(e) => updateField('overtime_multiplier', Number(e.target.value))}
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Multiplikator för övertidstimmar (standard: 1.5)
								</p>
							</div>
						</div>
					</div>

					{/* Break Rules */}
					<div className='space-y-4'>
						<h3 className='text-lg font-semibold'>Rastregler</h3>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div>
								<Label htmlFor='auto_break_after_hours'>
									Automatisk rast efter (timmar)
								</Label>
								<Input
									id='auto_break_after_hours'
									type='number'
									step='0.5'
									min='0'
									max='12'
									value={formData.auto_break_after_hours}
									onChange={(e) => updateField('auto_break_after_hours', Number(e.target.value))}
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Automatisk rast läggs till efter detta antal timmar (standard: 6.0h)
								</p>
							</div>
							<div>
								<Label htmlFor='auto_break_duration'>Rastlängd (minuter)</Label>
								<Input
									id='auto_break_duration'
									type='number'
									min='0'
									max='120'
									value={formData.auto_break_duration}
									onChange={(e) => updateField('auto_break_duration', Number(e.target.value))}
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Längd på automatisk rast (standard: 30 min)
								</p>
							</div>
						</div>
					</div>

					{/* OB Rates */}
					<div className='space-y-4'>
						<h3 className='text-lg font-semibold'>OB-timmar (Overtid/Belöningspengar)</h3>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
							<div>
								<Label htmlFor='ob_night'>Natt (22:00 - 06:00)</Label>
								<Input
									id='ob_night'
									type='number'
									step='0.1'
									min='1'
									max='3'
									value={formData.ob_rates.night}
									onChange={(e) => updateOBRate('night', Number(e.target.value))}
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Multiplikator för nattarbete (standard: 1.2)
								</p>
							</div>
							<div>
								<Label htmlFor='ob_weekend'>Helg (lördag/söndag)</Label>
								<Input
									id='ob_weekend'
									type='number'
									step='0.1'
									min='1'
									max='3'
									value={formData.ob_rates.weekend}
									onChange={(e) => updateOBRate('weekend', Number(e.target.value))}
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Multiplikator för helgar arbete (standard: 1.5)
								</p>
							</div>
							<div>
								<Label htmlFor='ob_holiday'>Helgdag</Label>
								<Input
									id='ob_holiday'
									type='number'
									step='0.1'
									min='1'
									max='3'
									value={formData.ob_rates.holiday}
									onChange={(e) => updateOBRate('holiday', Number(e.target.value))}
								/>
								<p className='text-xs text-muted-foreground mt-1'>
									Multiplikator för helgdagsarbete (standard: 2.0)
								</p>
							</div>
						</div>
					</div>

					{/* Submit Button */}
					<div className='flex justify-end pt-4 border-t'>
						<Button type='submit' disabled={saveMutation.isPending}>
							{saveMutation.isPending ? (
								<>
									<Loader2 className='w-4 h-4 mr-2 animate-spin' />
									Sparar...
								</>
							) : (
								<>
									<Save className='w-4 h-4 mr-2' />
									Spara regler
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</form>
	);
}

