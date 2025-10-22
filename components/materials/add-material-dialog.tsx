'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Package, Receipt, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AddMaterialDialogProps {
	open: boolean;
	onClose: () => void;
	orgId: string;
	editingMaterial?: any;
}

export function AddMaterialDialog({ open, onClose, orgId, editingMaterial }: AddMaterialDialogProps) {
	const [type, setType] = useState<'material' | 'expense'>('material');
	const [project, setProject] = useState('');
	const [name, setName] = useState('');
	const [quantity, setQuantity] = useState('');
	const [unit, setUnit] = useState('st');
	const [unitPrice, setUnitPrice] = useState('');
	const [supplier, setSupplier] = useState('');
	const [notes, setNotes] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const supabase = createClient();
	const queryClient = useQueryClient();

	// Populate form when editing
	useEffect(() => {
		if (editingMaterial) {
			setType(editingMaterial.category);
			setProject(editingMaterial.project_id);
			setName(editingMaterial.name);
			setQuantity(String(editingMaterial.quantity));
			setUnit(editingMaterial.unit || 'st');
			setUnitPrice(String(editingMaterial.unit_price));
			setSupplier(editingMaterial.supplier || '');
			setNotes(editingMaterial.notes || '');
		}
	}, [editingMaterial]);

	// Fetch projects
	const { data: projects } = useQuery({
		queryKey: ['projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data || [];
		},
	});

	const units = [
		{ value: 'st', label: 'st' },
		{ value: 'm²', label: 'm²' },
		{ value: 'm', label: 'm' },
		{ value: 'kg', label: 'kg' },
		{ value: 'l', label: 'l' },
		{ value: 'förp', label: 'förp' },
	];

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!project || !name || !quantity || !unitPrice) {
			return;
		}

		setIsSubmitting(true);

		try {
			const totalPrice = parseFloat(quantity) * parseFloat(unitPrice);

			// Get current user
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error('Not authenticated');

			if (editingMaterial) {
				// Update existing material/expense
				if (type === 'material') {
					const { error } = await supabase
						.from('materials')
						.update({
							project_id: project,
							description: name,
							qty: parseFloat(quantity),
							unit,
							unit_price_sek: parseFloat(unitPrice),
							notes: notes || supplier || null,
						})
						.eq('id', editingMaterial.id);

					if (error) throw error;
				} else {
					const { error } = await supabase
						.from('expenses')
						.update({
							project_id: project,
							description: name,
							amount_sek: totalPrice,
							category: supplier || 'Övrigt',
							notes: notes || null,
						})
						.eq('id', editingMaterial.id);

					if (error) throw error;
				}
			} else {
				// Create new material/expense
				if (type === 'material') {
					const { error } = await supabase.from('materials').insert({
						org_id: orgId,
						project_id: project,
						user_id: user.id,
						description: name,
						qty: parseFloat(quantity),
						unit,
						unit_price_sek: parseFloat(unitPrice),
						notes: notes || supplier || null,
						status: 'draft',
					});

					if (error) throw error;
				} else {
					const { error } = await supabase.from('expenses').insert({
						org_id: orgId,
						project_id: project,
						user_id: user.id,
						description: name,
						amount_sek: totalPrice,
						category: supplier || 'Övrigt',
						notes: notes || null,
						status: 'draft',
						vat: true,
					});

					if (error) throw error;
				}
			}

			// Invalidate cache
			queryClient.invalidateQueries({ queryKey: ['materials-expenses', orgId] });

			// Reset form
			handleReset();
			onClose();
		} catch (error) {
			console.error('Error adding material:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleReset = () => {
		setType('material');
		setProject('');
		setName('');
		setQuantity('');
		setUnit('st');
		setUnitPrice('');
		setSupplier('');
		setNotes('');
	};

	const handleClose = () => {
		handleReset();
		onClose();
	};

	const totalPrice = quantity && unitPrice ? parseFloat(quantity) * parseFloat(unitPrice) : 0;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>
						{editingMaterial ? 'Redigera' : 'Lägg till'} {type === 'material' ? 'Material' : 'Utgift'}
					</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className='space-y-5'>
					{/* Type Selection - Disabled when editing */}
					<div className='grid grid-cols-2 gap-3'>
						<button
							type='button'
							onClick={() => !editingMaterial && setType('material')}
							disabled={!!editingMaterial}
							className={`p-4 rounded-xl border-2 transition-all duration-200 ${
								type === 'material'
									? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30'
									: 'bg-card border-border hover:border-orange-300 hover:bg-orange-50'
							} ${editingMaterial ? 'opacity-50 cursor-not-allowed' : ''}`}
						>
							<div className='flex items-center justify-center gap-2'>
								<Package className='w-5 h-5' />
								<span>Material</span>
							</div>
						</button>
						<button
							type='button'
							onClick={() => !editingMaterial && setType('expense')}
							disabled={!!editingMaterial}
							className={`p-4 rounded-xl border-2 transition-all duration-200 ${
								type === 'expense'
									? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30'
									: 'bg-card border-border hover:border-orange-300 hover:bg-orange-50'
							} ${editingMaterial ? 'opacity-50 cursor-not-allowed' : ''}`}
						>
							<div className='flex items-center justify-center gap-2'>
								<Receipt className='w-5 h-5' />
								<span>Utgift</span>
							</div>
						</button>
					</div>

					{/* Project - REQUIRED */}
					<div className='space-y-2'>
						<Label htmlFor='project' className='flex items-center gap-1'>
							Projekt <span className='text-destructive'>*</span>
						</Label>
						<Select value={project} onValueChange={setProject}>
							<SelectTrigger id='project' className='h-11'>
								<SelectValue placeholder='Välj projekt' />
							</SelectTrigger>
							<SelectContent>
								{projects?.map((proj) => (
									<SelectItem key={proj.id} value={proj.id}>
										{proj.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className='text-xs text-muted-foreground'>
							Material och utgifter måste kopplas till ett projekt
						</p>
					</div>

					{/* Name */}
					<div className='space-y-2'>
						<Label htmlFor='name' className='flex items-center gap-1'>
							{type === 'material' ? 'Materialnamn' : 'Utgiftsbeskrivning'}{' '}
							<span className='text-destructive'>*</span>
						</Label>
						<Input
							id='name'
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={
								type === 'material'
									? 'T.ex. Köksskåp - Vit högglans 60cm'
									: 'T.ex. Bensinkostnad - Transport'
							}
							className='h-11'
						/>
					</div>

					{/* Quantity & Unit */}
					<div className='grid grid-cols-2 gap-4'>
						<div className='space-y-2'>
							<Label htmlFor='quantity' className='flex items-center gap-1'>
								Antal <span className='text-destructive'>*</span>
							</Label>
							<Input
								id='quantity'
								type='number'
								step='0.01'
								min='0'
								value={quantity}
								onChange={(e) => setQuantity(e.target.value)}
								placeholder='0'
								className='h-11'
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='unit'>Enhet</Label>
							<Select value={unit} onValueChange={setUnit}>
								<SelectTrigger id='unit' className='h-11'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{units.map((u) => (
										<SelectItem key={u.value} value={u.value}>
											{u.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Unit Price */}
					<div className='space-y-2'>
						<Label htmlFor='unitPrice' className='flex items-center gap-1'>
							À-pris (kr) <span className='text-destructive'>*</span>
						</Label>
						<Input
							id='unitPrice'
							type='number'
							step='0.01'
							min='0'
							value={unitPrice}
							onChange={(e) => setUnitPrice(e.target.value)}
							placeholder='0.00'
							className='h-11'
						/>
					</div>

					{/* Total Price Preview */}
					{quantity && unitPrice && (
						<div className='bg-orange-50 rounded-xl p-4 border-2 border-orange-200'>
							<div className='flex items-center justify-between'>
								<span className='text-sm text-muted-foreground'>Totalpris</span>
								<span className='text-xl font-semibold text-orange-600'>
									{totalPrice.toLocaleString('sv-SE')} kr
								</span>
							</div>
						</div>
					)}

					{/* Supplier */}
					<div className='space-y-2'>
						<Label htmlFor='supplier'>Leverantör/Betalare</Label>
						<Input
							id='supplier'
							value={supplier}
							onChange={(e) => setSupplier(e.target.value)}
							placeholder='T.ex. IKEA, Byggmax, Circle K'
							className='h-11'
						/>
					</div>

					{/* Notes */}
					<div className='space-y-2'>
						<Label htmlFor='notes'>Anteckningar</Label>
						<Textarea
							id='notes'
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder='Valfria anteckningar...'
							className='resize-none h-20'
						/>
					</div>

					{/* Actions */}
					<div className='flex gap-3 pt-4'>
						<Button type='button' variant='outline' onClick={handleClose} className='flex-1'>
							Avbryt
						</Button>
						<Button
							type='submit'
							disabled={isSubmitting}
							className='flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40'
						>
							{isSubmitting && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
							{editingMaterial ? 'Spara ändringar' : 'Lägg till'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

