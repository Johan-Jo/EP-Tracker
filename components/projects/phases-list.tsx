'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phase } from '@/lib/schemas/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';

interface PhasesListProps {
	projectId: string;
	phases: Phase[];
	canEdit: boolean;
	projectBudgetHours?: number | null;
	projectBudgetAmount?: number | null;
}

export function PhasesList({ projectId, phases, canEdit, projectBudgetHours, projectBudgetAmount }: PhasesListProps) {
	const router = useRouter();
	const [isAdding, setIsAdding] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [newPhaseName, setNewPhaseName] = useState('');
	const [newPhaseBudgetHours, setNewPhaseBudgetHours] = useState('');
	const [newPhaseBudgetAmount, setNewPhaseBudgetAmount] = useState('');
	const [editPhaseName, setEditPhaseName] = useState('');
	const [editPhaseBudgetHours, setEditPhaseBudgetHours] = useState('');
	const [editPhaseBudgetAmount, setEditPhaseBudgetAmount] = useState('');

	const sortedPhases = [...phases].sort((a, b) => a.sort_order - b.sort_order);

	// Calculate total allocated budget from phases
	const totalAllocatedHours = phases.reduce((sum, p) => sum + (p.budget_hours || 0), 0);
	const totalAllocatedAmount = phases.reduce((sum, p) => sum + (p.budget_amount || 0), 0);

	// Check if adding/editing would exceed budget
	const wouldExceedBudget = (newHours: number, newAmount: number, excludePhaseId?: string) => {
		const currentHours = phases
			.filter(p => p.id !== excludePhaseId)
			.reduce((sum, p) => sum + (p.budget_hours || 0), 0);
		const currentAmount = phases
			.filter(p => p.id !== excludePhaseId)
			.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
		
		const exceedsHours = projectBudgetHours && (currentHours + newHours > projectBudgetHours);
		const exceedsAmount = projectBudgetAmount && (currentAmount + newAmount > projectBudgetAmount);
		
		return { exceedsHours, exceedsAmount };
	};

	const handleAdd = async () => {
		if (!newPhaseName.trim()) return;
		
		const hoursToAdd = newPhaseBudgetHours ? parseFloat(newPhaseBudgetHours) : 0;
		const amountToAdd = newPhaseBudgetAmount ? parseFloat(newPhaseBudgetAmount) : 0;
		
		// Validate against project budget
		const { exceedsHours, exceedsAmount } = wouldExceedBudget(hoursToAdd, amountToAdd);
		
		if (exceedsHours || exceedsAmount) {
			let message = 'Delbudgeten överskrider projektets totalbudget!\n\n';
			if (exceedsHours) {
				message += `Timmar: ${(totalAllocatedHours + hoursToAdd).toFixed(1)}h av ${projectBudgetHours}h\n`;
			}
			if (exceedsAmount) {
				message += `Belopp: ${(totalAllocatedAmount + amountToAdd).toLocaleString('sv-SE')} kr av ${projectBudgetAmount?.toLocaleString('sv-SE')} kr\n`;
			}
			message += '\nVänligen höj projektets totalbudget eller minska fasens budget.';
			alert(message);
			return;
		}
		
		setIsLoading(true);
		try {
			const response = await fetch('/api/phases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					name: newPhaseName,
					budget_hours: hoursToAdd || null,
					budget_amount: amountToAdd || null,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to create phase');
			}

			setNewPhaseName('');
			setNewPhaseBudgetHours('');
			setNewPhaseBudgetAmount('');
			setIsAdding(false);
			router.refresh();
		} catch (error) {
			console.error('Error creating phase:', error);
			alert('Kunde inte skapa fas. Försök igen.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleEdit = async (phaseId: string) => {
		if (!editPhaseName.trim()) return;

		const hoursToSet = editPhaseBudgetHours ? parseFloat(editPhaseBudgetHours) : 0;
		const amountToSet = editPhaseBudgetAmount ? parseFloat(editPhaseBudgetAmount) : 0;
		
		// Validate against project budget (excluding current phase)
		const { exceedsHours, exceedsAmount } = wouldExceedBudget(hoursToSet, amountToSet, phaseId);
		
		if (exceedsHours || exceedsAmount) {
			const currentPhase = phases.find(p => p.id === phaseId);
			const otherPhasesHours = phases
				.filter(p => p.id !== phaseId)
				.reduce((sum, p) => sum + (p.budget_hours || 0), 0);
			const otherPhasesAmount = phases
				.filter(p => p.id !== phaseId)
				.reduce((sum, p) => sum + (p.budget_amount || 0), 0);
			
			let message = 'Delbudgeten överskrider projektets totalbudget!\n\n';
			if (exceedsHours) {
				message += `Timmar: ${(otherPhasesHours + hoursToSet).toFixed(1)}h av ${projectBudgetHours}h\n`;
			}
			if (exceedsAmount) {
				message += `Belopp: ${(otherPhasesAmount + amountToSet).toLocaleString('sv-SE')} kr av ${projectBudgetAmount?.toLocaleString('sv-SE')} kr\n`;
			}
			message += '\nVänligen höj projektets totalbudget eller minska fasens budget.';
			alert(message);
			return;
		}

		setIsLoading(true);
		try {
			const response = await fetch(`/api/phases/${phaseId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editPhaseName,
					budget_hours: hoursToSet || null,
					budget_amount: amountToSet || null,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to update phase');
			}

			setEditingId(null);
			setEditPhaseName('');
			setEditPhaseBudgetHours('');
			setEditPhaseBudgetAmount('');
			router.refresh();
		} catch (error) {
			console.error('Error updating phase:', error);
			alert('Kunde inte uppdatera fas. Försök igen.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleDelete = async (phaseId: string) => {
		if (!confirm('Är du säker på att du vill radera denna fas?')) return;

		setIsLoading(true);
		try {
			const response = await fetch(`/api/phases/${phaseId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete phase');
			}

			router.refresh();
		} catch (error) {
			console.error('Error deleting phase:', error);
			alert('Kunde inte radera fas. Försök igen.');
		} finally {
			setIsLoading(false);
		}
	};

	const startEdit = (phase: Phase) => {
		setEditingId(phase.id);
		setEditPhaseName(phase.name);
		setEditPhaseBudgetHours(phase.budget_hours?.toString() || '');
		setEditPhaseBudgetAmount(phase.budget_amount?.toString() || '');
	};

	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
				<CardTitle>Faser</CardTitle>
				{canEdit && !isAdding && (
					<Button size='sm' onClick={() => setIsAdding(true)}>
						<Plus className='w-4 h-4 mr-2' />
						Lägg till fas
					</Button>
				)}
			</CardHeader>
			<CardContent className='space-y-3'>
				{isAdding && (
					<div className='space-y-2 p-3 bg-muted/50 rounded-lg'>
						<Input
							placeholder='Fasnamn'
							value={newPhaseName}
							onChange={(e) => setNewPhaseName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleAdd();
								if (e.key === 'Escape') {
									setIsAdding(false);
									setNewPhaseName('');
									setNewPhaseBudgetHours('');
									setNewPhaseBudgetAmount('');
								}
							}}
							autoFocus
							disabled={isLoading}
						/>
						<div className='grid grid-cols-2 gap-2'>
							<Input
								type='number'
								step='0.5'
								placeholder='Timmar (valfritt)'
								value={newPhaseBudgetHours}
								onChange={(e) => setNewPhaseBudgetHours(e.target.value)}
								disabled={isLoading}
							/>
							<Input
								type='number'
								step='1'
								placeholder='Budget kr (valfritt)'
								value={newPhaseBudgetAmount}
								onChange={(e) => setNewPhaseBudgetAmount(e.target.value)}
								disabled={isLoading}
							/>
						</div>
						<div className='flex gap-2'>
							<Button 
								size='sm' 
								variant='ghost' 
								onClick={handleAdd}
								disabled={isLoading}
								className='flex-1'
							>
								{isLoading ? (
									<Loader2 className='w-4 h-4 mr-2 animate-spin' />
								) : (
									<Check className='w-4 h-4 mr-2 text-green-600' />
								)}
								Spara
							</Button>
							<Button
								size='sm'
								variant='ghost'
								onClick={() => {
									setIsAdding(false);
									setNewPhaseName('');
									setNewPhaseBudgetHours('');
									setNewPhaseBudgetAmount('');
								}}
								disabled={isLoading}
								className='flex-1'
							>
								<X className='w-4 h-4 mr-2 text-red-600' />
								Avbryt
							</Button>
						</div>
					</div>
				)}

				{sortedPhases.length === 0 && !isAdding && (
					<p className='text-sm text-muted-foreground text-center py-8'>
						Inga faser har skapats ännu
					</p>
				)}

				{sortedPhases.map((phase) => (
					<div
						key={phase.id}
						className='p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors'
					>
						{editingId === phase.id ? (
							<div className='space-y-2'>
								<Input
									placeholder='Fasnamn'
									value={editPhaseName}
									onChange={(e) => setEditPhaseName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') handleEdit(phase.id);
										if (e.key === 'Escape') {
											setEditingId(null);
											setEditPhaseName('');
											setEditPhaseBudgetHours('');
											setEditPhaseBudgetAmount('');
										}
									}}
									autoFocus
									disabled={isLoading}
								/>
								<div className='grid grid-cols-2 gap-2'>
									<Input
										type='number'
										step='0.5'
										placeholder='Timmar (valfritt)'
										value={editPhaseBudgetHours}
										onChange={(e) => setEditPhaseBudgetHours(e.target.value)}
										disabled={isLoading}
									/>
									<Input
										type='number'
										step='1'
										placeholder='Budget kr (valfritt)'
										value={editPhaseBudgetAmount}
										onChange={(e) => setEditPhaseBudgetAmount(e.target.value)}
										disabled={isLoading}
									/>
								</div>
								<div className='flex gap-2'>
									<Button
										size='sm'
										variant='ghost'
										onClick={() => handleEdit(phase.id)}
										disabled={isLoading}
										className='flex-1'
									>
										{isLoading ? (
											<Loader2 className='w-4 h-4 mr-2 animate-spin' />
										) : (
											<Check className='w-4 h-4 mr-2 text-green-600' />
										)}
										Spara
									</Button>
									<Button
										size='sm'
										variant='ghost'
										onClick={() => {
											setEditingId(null);
											setEditPhaseName('');
											setEditPhaseBudgetHours('');
											setEditPhaseBudgetAmount('');
										}}
										disabled={isLoading}
										className='flex-1'
									>
										<X className='w-4 h-4 mr-2 text-red-600' />
										Avbryt
									</Button>
								</div>
							</div>
						) : (
							<div className='flex items-center gap-2'>
								<div className='flex-1'>
									<span className='font-medium block'>{phase.name}</span>
									<div className='flex gap-3 text-sm text-muted-foreground mt-1'>
										{phase.budget_hours && (
											<span>Timmar: {phase.budget_hours}h</span>
										)}
										{phase.budget_amount && (
											<span>Budget: {phase.budget_amount.toLocaleString('sv-SE')} kr</span>
										)}
										{!phase.budget_hours && !phase.budget_amount && (
											<span className='text-xs italic'>Ingen budget angiven</span>
										)}
									</div>
								</div>
								{canEdit && (
									<>
										<Button
											size='icon'
											variant='ghost'
											onClick={() => startEdit(phase)}
											disabled={isLoading}
										>
											<Edit2 className='w-4 h-4' />
										</Button>
										<Button
											size='icon'
											variant='ghost'
											onClick={() => handleDelete(phase.id)}
											disabled={isLoading}
										>
											<Trash2 className='w-4 h-4 text-destructive' />
										</Button>
									</>
								)}
							</div>
						)}
					</div>
				))}
			</CardContent>
		</Card>
	);
}

