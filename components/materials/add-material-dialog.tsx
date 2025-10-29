'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Package, Receipt, Loader2, Camera, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface AddMaterialDialogProps {
	open: boolean;
	onClose: () => void;
	orgId: string;
	editingMaterial?: any;
	projectId?: string;
}

export function AddMaterialDialog({ open, onClose, orgId, editingMaterial, projectId }: AddMaterialDialogProps) {
	const [type, setType] = useState<'material' | 'expense'>('material');
	const [project, setProject] = useState(projectId || '');
	const [name, setName] = useState('');
	const [quantity, setQuantity] = useState('');
	const [unit, setUnit] = useState('st');
	const [unitPrice, setUnitPrice] = useState('');
	const [supplier, setSupplier] = useState('');
	const [notes, setNotes] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [photos, setPhotos] = useState<File[]>([]);
	const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
	const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

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
			// Load existing photos if available
			if (editingMaterial.photo_urls && editingMaterial.photo_urls.length > 0) {
				setPhotosPreviews(editingMaterial.photo_urls);
			}
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

	const uploadPhotosToStorage = async (): Promise<string[]> => {
		if (photos.length === 0) return [];

		setIsUploadingPhotos(true);
		const uploadedUrls: string[] = [];

		try {
			for (const photo of photos) {
				const fileExt = photo.name.split('.').pop();
				const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
				const filePath = `${orgId}/${type}s/${fileName}`;

				const { error: uploadError } = await supabase.storage
					.from('receipts')
					.upload(filePath, photo);

				if (uploadError) throw uploadError;

				const { data: { publicUrl } } = supabase.storage
					.from('receipts')
					.getPublicUrl(filePath);

				uploadedUrls.push(publicUrl);
			}

			return uploadedUrls;
		} finally {
			setIsUploadingPhotos(false);
		}
	};

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

			// Upload photos to storage
			const newPhotoUrls = await uploadPhotosToStorage();
			
			// Combine with existing photos (for editing)
			const allPhotoUrls = [...photosPreviews.filter(url => typeof url === 'string' && url.startsWith('http')), ...newPhotoUrls];

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
							photo_urls: allPhotoUrls,
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
							photo_urls: allPhotoUrls,
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
						photo_urls: allPhotoUrls,
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
						photo_urls: allPhotoUrls,
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
			alert('Ett fel uppstod vid sparande. Försök igen.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (photos.length + photosPreviews.length + files.length > 10) {
			alert('Max 10 foton tillåtna');
			return;
		}

		setPhotos([...photos, ...files]);

		// Create previews
		files.forEach((file) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				setPhotosPreviews((prev) => [...prev, reader.result as string]);
			};
			reader.readAsDataURL(file);
		});
	};

	const removePhoto = (index: number) => {
		// Check if it's a new photo or existing one
		if (index < photosPreviews.length - photos.length) {
			// Existing photo (URL string) - just remove from previews
			setPhotosPreviews(photosPreviews.filter((_, i) => i !== index));
		} else {
			// New photo (File object) - remove from both arrays
			const photoIndex = index - (photosPreviews.length - photos.length);
			setPhotos(photos.filter((_, i) => i !== photoIndex));
			setPhotosPreviews(photosPreviews.filter((_, i) => i !== index));
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
		setPhotos([]);
		setPhotosPreviews([]);
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

				{/* Photos */}
				<div className='space-y-2'>
					<Label>Bilder & Kvitton (max 10)</Label>
					
					{/* Existing photos preview */}
					{photosPreviews.length > 0 && (
						<div className='grid grid-cols-4 gap-3 mb-3'>
							{photosPreviews.map((preview, index) => (
								<div key={index} className='relative group'>
									<div className='relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200'>
										<Image
											src={preview}
											alt={`Foto ${index + 1}`}
											fill
											className='object-cover'
											sizes='(max-width: 768px) 50vw, 25vw'
										/>
									</div>
									<button
										type='button'
										onClick={() => removePhoto(index)}
										className='absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
									>
										<X className='w-3 h-3' />
									</button>
								</div>
							))}
						</div>
					)}

					{/* Photo upload buttons */}
					{photosPreviews.length < 10 && (
						<div className='flex gap-3'>
							<Button
								type='button'
								variant='outline'
								onClick={() => document.getElementById('photo-upload')?.click()}
								disabled={isSubmitting || isUploadingPhotos}
								className='flex-1'
							>
								<Upload className='w-4 h-4 mr-2' />
								Välj fil
							</Button>
							<Button
								type='button'
								onClick={() => document.getElementById('camera-capture')?.click()}
								disabled={isSubmitting || isUploadingPhotos}
								className='flex-1 bg-orange-500 hover:bg-orange-600 text-white'
							>
								<Camera className='w-4 h-4 mr-2' />
								Ta foto
							</Button>
						</div>
					)}

					{/* Hidden inputs */}
					<input
						id='photo-upload'
						type='file'
						accept='image/*'
						multiple
						onChange={handlePhotoChange}
						className='hidden'
					/>
					<input
						id='camera-capture'
						type='file'
						accept='image/*'
						capture='environment'
						onChange={handlePhotoChange}
						className='hidden'
					/>
					
					<p className='text-xs text-muted-foreground'>
						{photosPreviews.length} av 10 bilder uppladdade
					</p>
				</div>

				{/* Actions */}
				<div className='flex gap-3 pt-4'>
					<Button type='button' variant='outline' onClick={handleClose} className='flex-1'>
						Avbryt
					</Button>
					<Button
						type='submit'
						disabled={isSubmitting || isUploadingPhotos}
						className='flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40'
					>
						{(isSubmitting || isUploadingPhotos) && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
						{editingMaterial ? 'Spara ändringar' : 'Lägg till'}
					</Button>
				</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

