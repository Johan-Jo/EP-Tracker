'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Package, Receipt, Calendar, User, Tag, DollarSign, FileImage, Trash2 } from 'lucide-react';
import { ReceiptUpload } from './receipt-upload';
import { ReceiptLightbox } from './receipt-lightbox';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface MaterialDetailModalProps {
	material: any;
	open: boolean;
	onClose: () => void;
	onEdit: () => void;
}

export function MaterialDetailModal({ material, open, onClose, onEdit }: MaterialDetailModalProps) {
	const [photoUrls, setPhotoUrls] = useState<string[]>(material.photo_urls || []);
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);
	const supabase = createClient();
	const queryClient = useQueryClient();

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'purchased':
			case 'approved':
				return 'bg-green-100 text-green-700 border-green-200';
			case 'submitted':
				return 'bg-yellow-100 text-yellow-700 border-yellow-200';
			default:
				return 'bg-gray-100 text-gray-700 border-gray-200';
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'purchased':
				return 'Köpt';
			case 'approved':
				return 'Godkänd';
			case 'submitted':
				return 'Väntar godkännande';
			case 'draft':
				return 'Utkast';
			default:
				return status;
		}
	};

	const updatePhotos = async (newUrls: string[]) => {
		setIsUpdating(true);
		try {
			const tableName = material.category === 'material' ? 'materials' : 'expenses';
			const { error } = await supabase
				.from(tableName)
				.update({ photo_urls: newUrls })
				.eq('id', material.id);

			if (error) throw error;

			setPhotoUrls(newUrls);
			// Invalidate cache
			queryClient.invalidateQueries({ queryKey: ['materials-expenses'] });
		} catch (error) {
			console.error('Error updating photos:', error);
			alert('Ett fel uppstod vid uppdatering');
		} finally {
			setIsUpdating(false);
		}
	};

	const deletePhoto = async (urlToDelete: string) => {
		if (!confirm('Är du säker på att du vill ta bort denna bild?')) return;

		setIsUpdating(true);
		try {
			// Extract filename from URL
			const fileName = urlToDelete.split('/').pop();
			if (fileName) {
				// Delete from storage
				await supabase.storage.from('receipts').remove([fileName]);
			}

			// Update database
			const newUrls = photoUrls.filter((url) => url !== urlToDelete);
			await updatePhotos(newUrls);
		} catch (error) {
			console.error('Error deleting photo:', error);
			alert('Ett fel uppstod vid borttagning');
		} finally {
			setIsUpdating(false);
		}
	};

	const Icon = material.category === 'material' ? Package : Receipt;

	return (
		<>
			<Dialog open={open} onOpenChange={onClose}>
				<DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
					{/* Header */}
					<div className='flex items-start justify-between mb-4'>
						<div className='flex-1'>
							<div className='flex items-center gap-3 mb-2'>
								<Icon className='w-6 h-6 text-orange-600' />
								<h2 className='text-2xl font-bold'>{material.name}</h2>
							</div>
							<div className='flex items-center gap-3'>
								<Badge className={`border-2 ${getStatusColor(material.status || 'draft')}`}>
									{getStatusText(material.status || 'draft')}
								</Badge>
								<span className='text-sm text-muted-foreground'>
									{material.category === 'material' ? 'Material' : 'Utgift'}
								</span>
							</div>
						</div>
						<button onClick={onClose} className='p-2 hover:bg-gray-100 rounded-lg transition-colors'>
							<X className='w-5 h-5' />
						</button>
					</div>

					{/* Details Grid */}
					<div className='grid grid-cols-2 gap-4 mb-6'>
						<div className='bg-gray-50 rounded-xl p-4'>
							<div className='flex items-center gap-2 mb-2'>
								<Tag className='w-4 h-4 text-muted-foreground' />
								<span className='text-sm text-muted-foreground'>Projekt</span>
							</div>
							<p className='font-medium'>{material.project?.name || 'Inget projekt'}</p>
						</div>

						<div className='bg-gray-50 rounded-xl p-4'>
							<div className='flex items-center gap-2 mb-2'>
								<Calendar className='w-4 h-4 text-muted-foreground' />
								<span className='text-sm text-muted-foreground'>Datum</span>
							</div>
							<p className='font-medium'>
								{new Date(material.created_at).toLocaleDateString('sv-SE')}
							</p>
						</div>

						{material.supplier && (
							<div className='bg-gray-50 rounded-xl p-4'>
								<div className='flex items-center gap-2 mb-2'>
									<User className='w-4 h-4 text-muted-foreground' />
									<span className='text-sm text-muted-foreground'>
										{material.category === 'material' ? 'Leverantör' : 'Kategori'}
									</span>
								</div>
								<p className='font-medium'>{material.supplier}</p>
							</div>
						)}

						<div className='bg-gray-50 rounded-xl p-4'>
							<div className='flex items-center gap-2 mb-2'>
								<Package className='w-4 h-4 text-muted-foreground' />
								<span className='text-sm text-muted-foreground'>Antal</span>
							</div>
							<p className='font-medium'>
								{material.quantity} {material.unit}
							</p>
						</div>
					</div>

					{/* Pricing */}
					<div className='bg-orange-50 rounded-xl p-4 mb-6'>
						<div className='flex items-center gap-2 mb-3'>
							<DollarSign className='w-5 h-5 text-orange-600' />
							<h3 className='font-semibold text-orange-900'>Prisuppgifter</h3>
						</div>
						<div className='space-y-2'>
							<div className='flex justify-between'>
								<span className='text-sm text-muted-foreground'>À-pris</span>
								<span className='font-medium'>
									{(material.unit_price || 0).toLocaleString('sv-SE')} kr
								</span>
							</div>
							<div className='flex justify-between text-lg'>
								<span className='font-medium text-orange-900'>Totalpris</span>
								<span className='font-bold text-orange-600'>
									{(material.total_price || 0).toLocaleString('sv-SE')} kr
								</span>
							</div>
						</div>
					</div>

					{/* Receipts Section */}
					<div className='mb-6'>
						<div className='flex items-center gap-2 mb-4'>
							<FileImage className='w-5 h-5 text-orange-600' />
							<h3 className='font-semibold'>
								Kvitton {photoUrls.length > 0 && `(${photoUrls.length})`}
							</h3>
						</div>

						{/* Existing Photos */}
						{photoUrls.length > 0 && (
							<div className='grid grid-cols-4 gap-3 mb-4'>
								{photoUrls.map((url, index) => (
									<div key={index} className='relative group'>
										<button
											onClick={() => setLightboxIndex(index)}
											className='relative w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-orange-300 transition-colors'
										>
											<Image
												src={url}
												alt={`Kvitto ${index + 1}`}
												fill
												className='object-cover'
												sizes='(max-width: 768px) 50vw, 25vw'
											/>
										</button>
										<button
											onClick={() => deletePhoto(url)}
											disabled={isUpdating}
											className='absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50'
										>
											<Trash2 className='w-3 h-3' />
										</button>
									</div>
								))}
							</div>
						)}

						{/* Upload Component */}
						{photoUrls.length < 10 && (
							<ReceiptUpload
								onUpload={updatePhotos}
								existingUrls={photoUrls}
								maxFiles={10}
							/>
						)}
					</div>

					{/* Actions */}
					<div className='flex gap-3 pt-4 border-t'>
						<Button variant='outline' onClick={onClose} className='flex-1'>
							Stäng
						</Button>
						<Button
							onClick={() => {
								onClose();
								onEdit();
							}}
							className='flex-1 bg-orange-500 hover:bg-orange-600 text-white'
						>
							Redigera
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Lightbox */}
			{lightboxIndex !== null && (
				<ReceiptLightbox
					images={photoUrls}
					initialIndex={lightboxIndex}
					open={lightboxIndex !== null}
					onClose={() => setLightboxIndex(null)}
				/>
			)}
		</>
	);
}

