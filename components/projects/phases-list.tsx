'use client';

import { useState } from 'react';
import { Phase } from '@/lib/schemas/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface PhasesListProps {
	projectId: string;
	phases: Phase[];
	canEdit: boolean;
}

export function PhasesList({ projectId, phases, canEdit }: PhasesListProps) {
	const [isAdding, setIsAdding] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [newPhaseName, setNewPhaseName] = useState('');
	const [editPhaseName, setEditPhaseName] = useState('');

	const sortedPhases = [...phases].sort((a, b) => a.sort_order - b.sort_order);

	const handleAdd = async () => {
		if (!newPhaseName.trim()) return;

		// TODO: Add API call to create phase
		console.log('Creating phase:', newPhaseName);
		setNewPhaseName('');
		setIsAdding(false);
	};

	const handleEdit = async (phaseId: string) => {
		if (!editPhaseName.trim()) return;

		// TODO: Add API call to update phase
		console.log('Updating phase:', phaseId, editPhaseName);
		setEditingId(null);
		setEditPhaseName('');
	};

	const handleDelete = async (phaseId: string) => {
		if (!confirm('Är du säker på att du vill radera denna fas?')) return;

		// TODO: Add API call to delete phase
		console.log('Deleting phase:', phaseId);
	};

	const startEdit = (phase: Phase) => {
		setEditingId(phase.id);
		setEditPhaseName(phase.name);
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
					<div className='flex gap-2 p-3 bg-muted/50 rounded-lg'>
						<Input
							placeholder='Fasnamn'
							value={newPhaseName}
							onChange={(e) => setNewPhaseName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleAdd();
								if (e.key === 'Escape') {
									setIsAdding(false);
									setNewPhaseName('');
								}
							}}
							autoFocus
						/>
						<Button size='icon' variant='ghost' onClick={handleAdd}>
							<Check className='w-4 h-4 text-green-600' />
						</Button>
						<Button
							size='icon'
							variant='ghost'
							onClick={() => {
								setIsAdding(false);
								setNewPhaseName('');
							}}
						>
							<X className='w-4 h-4 text-red-600' />
						</Button>
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
						className='flex items-center gap-2 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors'
					>
						{editingId === phase.id ? (
							<>
								<Input
									value={editPhaseName}
									onChange={(e) => setEditPhaseName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') handleEdit(phase.id);
										if (e.key === 'Escape') {
											setEditingId(null);
											setEditPhaseName('');
										}
									}}
									autoFocus
									className='flex-1'
								/>
								<Button
									size='icon'
									variant='ghost'
									onClick={() => handleEdit(phase.id)}
								>
									<Check className='w-4 h-4 text-green-600' />
								</Button>
								<Button
									size='icon'
									variant='ghost'
									onClick={() => {
										setEditingId(null);
										setEditPhaseName('');
									}}
								>
									<X className='w-4 h-4 text-red-600' />
								</Button>
							</>
						) : (
							<>
								<span className='flex-1 font-medium'>{phase.name}</span>
								{canEdit && (
									<>
										<Button
											size='icon'
											variant='ghost'
											onClick={() => startEdit(phase)}
										>
											<Edit2 className='w-4 h-4' />
										</Button>
										<Button
											size='icon'
											variant='ghost'
											onClick={() => handleDelete(phase.id)}
										>
											<Trash2 className='w-4 h-4 text-destructive' />
										</Button>
									</>
								)}
							</>
						)}
					</div>
				))}
			</CardContent>
		</Card>
	);
}

