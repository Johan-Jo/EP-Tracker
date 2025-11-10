'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Member {
	id: string;
	user_id: string;
	role: string;
	hourly_rate_sek: number | null; // Faktureringsvärde
	salary_per_hour_sek: number | null; // Faktisk lön
	profiles: {
		id: string;
		full_name: string;
		email: string;
	};
}

export function PayrollSalaryRates() {
	const queryClient = useQueryClient();
	const [editingRates, setEditingRates] = useState<Map<string, string>>(new Map());

	// Fetch all organization members
	const { data: membersData, isLoading } = useQuery<{ members: Member[] }>({
		queryKey: ['organization-members'],
		queryFn: async () => {
			const response = await fetch('/api/organizations/members');
			if (!response.ok) {
				throw new Error('Failed to fetch members');
			}
			return response.json();
		},
	});

	// Update salary mutation
	const updateSalaryMutation = useMutation({
		mutationFn: async ({ userId, salaryPerHour }: { userId: string; salaryPerHour: number | null }) => {
			const payload = { salary_per_hour_sek: salaryPerHour };
			console.log('[PayrollSalaryRates] Updating salary:', { userId, payload });
			
			const response = await fetch(`/api/users/${userId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
				console.error('[PayrollSalaryRates] Update failed:', { status: response.status, error: errorData });
				throw new Error(errorData.details || errorData.error || 'Failed to update salary');
			}

			const result = await response.json();
			console.log('[PayrollSalaryRates] Update successful:', result);
			return result;
		},
		onSuccess: () => {
			toast.success('Timlön uppdaterad');
			queryClient.invalidateQueries({ queryKey: ['organization-members'] });
			setEditingRates(new Map()); // Clear editing state
		},
		onError: (error: Error) => {
			console.error('[PayrollSalaryRates] Mutation error:', error);
			toast.error(error.message || 'Kunde inte uppdatera timlön');
		},
	});

	const handleEdit = (userId: string, currentSalary: number | null) => {
		setEditingRates(new Map(editingRates.set(userId, currentSalary?.toString() || '')));
	};

	const handleSave = (userId: string, value: string) => {
		const numValue = value.trim() === '' ? null : parseFloat(value);
		if (value.trim() !== '' && (isNaN(numValue!) || numValue! < 0)) {
			toast.error('Ogiltigt värde. Ange ett positivt tal.');
			return;
		}
		updateSalaryMutation.mutate({ userId, salaryPerHour: numValue });
		setEditingRates(new Map());
	};

	const handleCancel = (userId: string) => {
		setEditingRates(new Map());
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className='py-12 text-center'>
					<Loader2 className='w-8 h-8 animate-spin mx-auto text-muted-foreground' />
					<p className='text-muted-foreground mt-4'>Laddar anställda...</p>
				</CardContent>
			</Card>
		);
	}

	const members = membersData?.members || [];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Timlöner och faktureringsvärden</CardTitle>
				<CardDescription>
					Hantera faktisk lön per anställd och faktureringsvärde per timme. Lön används för löneberäkningar, faktureringsvärde för fakturering till kunder.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className='space-y-4'>
					{members.length === 0 ? (
						<p className='text-muted-foreground text-center py-8'>
							Inga anställda hittades i organisationen.
						</p>
					) : (
						<div className='space-y-3'>
							{members.map((member) => {
								const isEditing = editingRates.has(member.user_id);
								const editingValue = editingRates.get(member.user_id) || '';
								const currentSalary = member.salary_per_hour_sek;
								const billingRate = member.hourly_rate_sek;

								return (
									<div
										key={member.user_id}
										className='p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-3'
									>
										<div className='flex items-center justify-between'>
											<div className='flex-1'>
												<p className='font-medium'>{member.profiles.full_name || member.profiles.email}</p>
												<p className='text-sm text-muted-foreground'>{member.profiles.email}</p>
												<p className='text-xs text-muted-foreground mt-1'>
													Roll: {member.role === 'admin' ? 'Admin' : member.role === 'foreman' ? 'Arbetsledare' : 'Arbetare'}
												</p>
											</div>
										</div>
										<div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t'>
											{/* Faktisk lön */}
											<div>
												<Label className='text-sm font-semibold mb-2 block'>Faktisk lön (för löneberäkning)</Label>
												{isEditing ? (
													<div className='flex items-center gap-2'>
														<Input
															type='number'
															min='0'
															step='1'
															value={editingValue}
															onChange={(e) =>
																setEditingRates(new Map(editingRates.set(member.user_id, e.target.value)))
															}
															placeholder='Ingen lön angiven'
															className='flex-1'
														/>
														<span className='text-sm text-muted-foreground'>SEK/timme</span>
														<Button
															size='sm'
															onClick={() => handleSave(member.user_id, editingValue)}
															disabled={updateSalaryMutation.isPending}
														>
															{updateSalaryMutation.isPending ? (
																<Loader2 className='w-4 h-4 animate-spin' />
															) : (
																<Save className='w-4 h-4' />
															)}
														</Button>
														<Button
															size='sm'
															variant='outline'
															onClick={() => handleCancel(member.user_id)}
														>
															Avbryt
														</Button>
													</div>
												) : (
													<div className='flex items-center justify-between'>
														<div>
															{currentSalary !== null && currentSalary !== undefined ? (
																<p className='font-semibold text-lg'>{currentSalary.toFixed(2)} SEK/timme</p>
															) : (
																<p className='text-muted-foreground text-sm'>Ej angiven</p>
															)}
														</div>
														<Button
															size='sm'
															variant='outline'
															onClick={() => handleEdit(member.user_id, currentSalary)}
														>
															<Pencil className='w-4 h-4 mr-2' />
															Redigera
														</Button>
													</div>
												)}
											</div>
											{/* Faktureringsvärde */}
											<div>
												<Label className='text-sm font-semibold mb-2 block'>Faktureringsvärde (till kund)</Label>
												<div className='flex items-center justify-between'>
													<div>
														{billingRate !== null && billingRate !== undefined ? (
															<p className='font-semibold text-lg'>{billingRate.toFixed(2)} SEK/timme</p>
														) : (
															<p className='text-muted-foreground text-sm'>Ej angiven</p>
														)}
													</div>
													<p className='text-xs text-muted-foreground'>
														Redigeras i <br />Användarinställningar
													</p>
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

