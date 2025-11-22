'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, ExternalLink } from 'lucide-react';
import { WorkOrderWithRelations } from '@/lib/schemas/work-order';
import { toast } from 'sonner';

interface Customer {
	id: string;
	type: 'COMPANY' | 'PRIVATE';
	company_name?: string;
	first_name?: string;
	last_name?: string;
}

interface WorkOrderLocationTabProps {
	workOrder: WorkOrderWithRelations;
	customer: Customer | null | undefined;
	canEdit: boolean;
	onUpdate: () => void;
}

export function WorkOrderLocationTab({
	workOrder,
	customer,
	canEdit,
	onUpdate,
}: WorkOrderLocationTabProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		location_address: workOrder.location_address || '',
		location_city: workOrder.location_city || '',
		location_zip: workOrder.location_zip || '',
		door_code: workOrder.door_code || '',
		location_notes: workOrder.location_notes || '',
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const response = await fetch(`/api/work-orders/${workOrder.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update location');
			}

			toast.success('Plats uppdaterad');
			setIsEditing(false);
			onUpdate();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Ett fel uppstod');
		} finally {
			setIsSubmitting(false);
		}
	};

	const getCustomerName = () => {
		if (!customer) return '-';
		if (customer.type === 'COMPANY') {
			return customer.company_name || '-';
		}
		return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '-';
	};

	const getGoogleMapsUrl = () => {
		const address = [
			workOrder.location_address,
			workOrder.location_zip,
			workOrder.location_city,
		]
			.filter(Boolean)
			.join(', ');
		if (!address) return null;
		return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
	};

	const mapsUrl = getGoogleMapsUrl();

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<CardTitle>Kund & Plats</CardTitle>
					{canEdit && !isEditing && (
						<Button variant='outline' onClick={() => setIsEditing(true)}>
							Redigera
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div>
					<Label>Kund</Label>
					<p className='text-sm font-medium'>{getCustomerName()}</p>
				</div>

				{!isEditing ? (
					<>
						<div>
							<Label>Adress</Label>
							<p className='text-sm'>{workOrder.location_address || '-'}</p>
						</div>
						<div className='grid gap-4 md:grid-cols-2'>
							<div>
								<Label>Stad</Label>
								<p className='text-sm'>{workOrder.location_city || '-'}</p>
							</div>
							<div>
								<Label>Postnummer</Label>
								<p className='text-sm'>{workOrder.location_zip || '-'}</p>
							</div>
						</div>
						<div>
							<Label>Portkod</Label>
							<p className='text-sm'>{workOrder.door_code || '-'}</p>
						</div>
						{workOrder.location_notes && (
							<div>
								<Label>Platsanteckningar</Label>
								<p className='text-sm whitespace-pre-wrap'>
									{workOrder.location_notes}
								</p>
							</div>
						)}
						{mapsUrl && (
							<div>
								<Button
									variant='outline'
									onClick={() => window.open(mapsUrl, '_blank')}
								>
									<MapPin className='w-4 h-4 mr-2' />
									Öppna i Maps
									<ExternalLink className='w-3 h-3 ml-2' />
								</Button>
							</div>
						)}
					</>
				) : (
					<form onSubmit={handleSubmit} className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='location_address'>Adress</Label>
							<Input
								id='location_address'
								value={formData.location_address}
								onChange={(e) =>
									setFormData({ ...formData, location_address: e.target.value })
								}
							/>
						</div>
						<div className='grid gap-4 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label htmlFor='location_city'>Stad</Label>
								<Input
									id='location_city'
									value={formData.location_city}
									onChange={(e) =>
										setFormData({ ...formData, location_city: e.target.value })
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='location_zip'>Postnummer</Label>
								<Input
									id='location_zip'
									value={formData.location_zip}
									onChange={(e) =>
										setFormData({ ...formData, location_zip: e.target.value })
									}
								/>
							</div>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='door_code'>Portkod</Label>
							<Input
								id='door_code'
								value={formData.door_code}
								onChange={(e) =>
									setFormData({ ...formData, door_code: e.target.value })
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='location_notes'>Platsanteckningar</Label>
							<Textarea
								id='location_notes'
								value={formData.location_notes}
								onChange={(e) =>
									setFormData({ ...formData, location_notes: e.target.value })
								}
								rows={3}
							/>
						</div>
						<div className='flex gap-2 justify-end'>
							<Button
								type='button'
								variant='outline'
								onClick={() => {
									setIsEditing(false);
									setFormData({
										location_address: workOrder.location_address || '',
										location_city: workOrder.location_city || '',
										location_zip: workOrder.location_zip || '',
										door_code: workOrder.door_code || '',
										location_notes: workOrder.location_notes || '',
									});
								}}
							>
								Avbryt
							</Button>
							<Button type='submit' disabled={isSubmitting}>
								{isSubmitting && 'Sparar...'}
								{!isSubmitting && 'Spara'}
							</Button>
						</div>
					</form>
				)}
			</CardContent>
		</Card>
	);
}

