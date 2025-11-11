'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	CheckCircle2,
	Clock,
	XCircle,
	FileText,
	Calendar,
	User,
	Image as ImageIcon,
	DollarSign,
	Package,
	Tag,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { GalleryViewer } from '@/components/shared/gallery-viewer';
import Image from 'next/image';
import type { BillingType } from '@/lib/schemas/billing-types';

interface AtaDetailClientProps {
	ataId: string;
	userRole: 'admin' | 'foreman' | 'worker' | 'finance';
}

const statusConfig = {
	draft: {
		icon: FileText,
		label: 'Utkast',
		color: 'bg-gray-100 text-gray-700 border-gray-200',
	},
	pending_approval: {
		icon: Clock,
		label: 'Väntar på godkännande',
		color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
	},
	approved: {
		icon: CheckCircle2,
		label: 'Godkänd',
		color: 'bg-green-100 text-green-700 border-green-200',
	},
	rejected: {
		icon: XCircle,
		label: 'Avvisad',
		color: 'bg-red-100 text-red-700 border-red-200',
	},
	invoiced: {
		icon: CheckCircle2,
		label: 'Fakturerad',
		color: 'bg-blue-100 text-blue-700 border-blue-200',
	},
};

export function AtaDetailClient({ ataId }: AtaDetailClientProps) {
	const supabase = createClient();
	const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

	const { data: ata, isLoading } = useQuery({
		queryKey: ['ata', ataId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('ata')
				.select(`
					*,
					project:projects(name, project_number),
					created_by_user:profiles!ata_created_by_fkey(full_name),
					approved_by_user:profiles!ata_approved_by_fkey(full_name)
				`)
				.eq('id', ataId)
				.single();

			if (error) throw error;
			return data;
		},
	});

	const { data: photos } = useQuery({
		queryKey: ['ata-photos', ataId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('ata_photos')
				.select('*')
				.eq('ata_id', ataId)
				.order('sort_order');

			if (error) throw error;
			return data;
		},
	});

	if (isLoading) {
		return (
			<div className='flex items-center justify-center py-12'>
				<div className='text-muted-foreground'>Laddar ÄTA...</div>
			</div>
		);
	}

	if (!ata) {
		return (
			<div className='bg-card border-2 border-border rounded-xl p-12 text-center'>
				<FileText className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
				<p className='text-muted-foreground'>ÄTA hittades inte</p>
			</div>
		);
	}

	const config = statusConfig[ata.status as keyof typeof statusConfig];
	const StatusIcon = config.icon;

	const toNumber = (value: unknown): number => {
		if (value === undefined || value === null) return 0;
		if (typeof value === 'number') return value;
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	};

	const billingType = (ata.billing_type as BillingType) ?? 'LOPANDE';
	const billingLabel = billingType === 'FAST' ? 'FAST' : 'LÖPANDE';
	const billingBadgeClasses =
		billingType === 'FAST'
			? 'bg-orange-500/20 text-orange-700 border-orange-300'
			: 'bg-slate-200 text-slate-700 border-slate-300';

	const qty = toNumber(ata.qty);
	const unitPrice = toNumber(ata.unit_price_sek);
	const fixedAmount = toNumber(ata.fixed_amount_sek);
	const total = billingType === 'FAST' ? fixedAmount : qty * unitPrice;

	return (
		<div className='max-w-5xl space-y-6'>
			{/* Hero Section with Gradient */}
			<div className='bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 md:p-8 border-2 border-orange-200'>
				<div className='flex items-start justify-between mb-4'>
					<div className='flex items-center gap-3'>
						<div className='p-3 bg-white rounded-xl shadow-sm'>
							<FileText className='w-6 h-6 text-orange-600' />
						</div>
						<div>
							<div className='flex items-center gap-2 mb-2'>
								{ata.ata_number && (
									<Badge variant='outline' className='bg-white border-orange-300'>
										{ata.ata_number}
									</Badge>
								)}
								<Badge className={`border-2 uppercase tracking-wide ${billingBadgeClasses}`}>
									{billingLabel}
								</Badge>
								<Badge className={`border-2 ${config.color}`}>
									<StatusIcon className='h-3 w-3 mr-1' />
									{config.label}
								</Badge>
							</div>
							<h1 className='text-2xl md:text-3xl font-bold text-gray-900'>{ata.title}</h1>
						</div>
					</div>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div className='bg-white rounded-xl p-4'>
						<div className='flex items-center gap-2 mb-2'>
							<Tag className='w-4 h-4 text-muted-foreground' />
							<span className='text-sm text-muted-foreground'>Projekt</span>
						</div>
						<p className='font-medium'>
							{ata.project.project_number ? `${ata.project.project_number} - ` : ''}
							{ata.project.name}
						</p>
					</div>

					<div className='bg-white rounded-xl p-4'>
						<div className='flex items-center gap-2 mb-2'>
							<Calendar className='w-4 h-4 text-muted-foreground' />
							<span className='text-sm text-muted-foreground'>Skapad</span>
						</div>
						<p className='font-medium'>
							{new Date(ata.created_at).toLocaleDateString('sv-SE', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							})}
						</p>
					</div>

					{ata.created_by_user && (
						<div className='bg-white rounded-xl p-4'>
							<div className='flex items-center gap-2 mb-2'>
								<User className='w-4 h-4 text-muted-foreground' />
								<span className='text-sm text-muted-foreground'>Skapad av</span>
							</div>
							<p className='font-medium'>{ata.created_by_user.full_name}</p>
						</div>
					)}

					{billingType === 'FAST' ? (
						<div className='bg-white rounded-xl p-4'>
							<div className='flex items-center gap-2 mb-2'>
								<DollarSign className='w-4 h-4 text-muted-foreground' />
								<span className='text-sm text-muted-foreground'>Fast belopp</span>
							</div>
							<p className='font-medium'>
								{fixedAmount.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
							</p>
						</div>
					) : (
						<div className='bg-white rounded-xl p-4'>
							<div className='flex items-center gap-2 mb-2'>
								<Package className='w-4 h-4 text-muted-foreground' />
								<span className='text-sm text-muted-foreground'>Antal</span>
							</div>
							<p className='font-medium'>
								{qty.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} {ata.unit || 'st'}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Description */}
			{ata.description && (
				<div className='bg-card border-2 border-border rounded-xl p-6 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
					<div className='flex items-center gap-2 mb-4'>
						<FileText className='w-5 h-5 text-orange-600' />
						<h2 className='text-xl font-semibold'>Beskrivning</h2>
					</div>
					<p className='whitespace-pre-wrap text-muted-foreground'>{ata.description}</p>
				</div>
			)}

			{/* Pricing */}
			<div className='bg-orange-50 rounded-xl p-6 border-2 border-orange-200'>
				<div className='flex items-center gap-2 mb-4'>
					<DollarSign className='w-5 h-5 text-orange-600' />
					<h2 className='text-xl font-semibold text-orange-900'>Kostnadsuppgifter</h2>
				</div>
				<div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
					{billingType === 'FAST' ? (
						<>
							<div className='bg-white rounded-xl p-4 md:col-span-1 col-span-2'>
								<p className='text-sm text-muted-foreground mb-1'>Fast belopp</p>
								<p className='text-2xl text-gray-900'>{fixedAmount.toLocaleString('sv-SE')} kr</p>
							</div>
							<div className='bg-white rounded-xl p-4 md:col-span-1 col-span-2'>
								<p className='text-sm text-muted-foreground mb-1'>Totalt</p>
								<p className='text-2xl text-gray-900'>{total.toLocaleString('sv-SE')} kr</p>
							</div>
						</>
					) : (
						<>
							<div className='bg-white rounded-xl p-4'>
								<p className='text-sm text-muted-foreground mb-1'>À-pris</p>
								<p className='text-2xl text-gray-900'>
									{unitPrice.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
								</p>
							</div>
							<div className='bg-white rounded-xl p-4'>
								<p className='text-sm text-muted-foreground mb-1'>Antal</p>
								<p className='text-2xl text-gray-900'>
									{qty.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} {ata.unit || 'st'}
								</p>
							</div>
							<div className='bg-white rounded-xl p-4 md:col-span-1 col-span-2'>
								<p className='text-sm text-muted-foreground mb-1'>Totalt</p>
								<p className='text-2xl text-gray-900'>
									{total.toLocaleString('sv-SE', { minimumFractionDigits: 2 })} kr
								</p>
							</div>
						</>
					)}
				</div>
			</div>

			{/* Photos */}
			{photos && photos.length > 0 && (
				<div className='bg-card border-2 border-border rounded-xl p-6 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
					<div className='flex items-center gap-2 mb-4'>
						<ImageIcon className='w-5 h-5 text-orange-600' />
						<h2 className='text-xl font-semibold'>
							Foton <span className='text-muted-foreground'>({photos.length})</span>
						</h2>
					</div>
					<div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
						{photos.map((photo, index) => (
							<button
								key={photo.id}
								onClick={() => setSelectedPhotoIndex(index)}
								className='relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-orange-300 hover:shadow-lg hover:scale-[1.02] transition-all duration-200'
							>
								<Image
									src={photo.photo_url}
									alt={`Foto ${index + 1}`}
									fill
									className='object-cover'
									sizes='(max-width: 768px) 50vw, 25vw'
								/>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Signature */}
			{ata.signed_by_name && (
				<div className='bg-card border-2 border-border rounded-xl p-6 hover:border-orange-300 hover:shadow-md transition-all duration-200'>
					<div className='flex items-center gap-2 mb-4'>
						<CheckCircle2 className='w-5 h-5 text-orange-600' />
						<h2 className='text-xl font-semibold'>Signatur</h2>
					</div>
					<div className='space-y-2'>
						<p className='text-sm'>
							<span className='font-medium'>Signerad av:</span> {ata.signed_by_name}
						</p>
						{ata.signed_at && (
							<p className='text-sm text-muted-foreground'>
								{new Date(ata.signed_at).toLocaleString('sv-SE')}
							</p>
						)}
					</div>
				</div>
			)}

			{/* Approval */}
			{ata.status === 'approved' && (
				<div className='bg-green-50 border-2 border-green-200 rounded-xl p-6'>
					<div className='flex items-center gap-2 mb-4'>
						<CheckCircle2 className='w-6 h-6 text-green-600' />
						<h2 className='text-xl font-semibold text-green-900'>Godkänd</h2>
					</div>
					<div className='space-y-2'>
						{ata.approved_by_user && (
							<p className='text-sm'>
								<span className='font-medium'>Godkänd av:</span> {ata.approved_by_user.full_name}
							</p>
						)}
						{ata.approved_by_name && (
							<p className='text-sm'>
								<span className='font-medium'>Signerad av:</span> {ata.approved_by_name}
							</p>
						)}
						{ata.approved_at && (
							<p className='text-sm text-muted-foreground'>
								{new Date(ata.approved_at).toLocaleString('sv-SE')}
							</p>
						)}
						{ata.comments && (
							<div className='mt-4 p-4 bg-white rounded-lg'>
								<p className='text-sm font-medium mb-1'>Kommentar:</p>
								<p className='text-sm whitespace-pre-wrap text-muted-foreground'>{ata.comments}</p>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Rejection */}
			{ata.status === 'rejected' && (
				<div className='bg-red-50 border-2 border-red-200 rounded-xl p-6'>
					<div className='flex items-center gap-2 mb-4'>
						<XCircle className='w-6 h-6 text-red-600' />
						<h2 className='text-xl font-semibold text-red-900'>Avvisad</h2>
					</div>
					<div className='space-y-2'>
						{ata.approved_by_user && (
							<p className='text-sm'>
								<span className='font-medium'>Avvisad av:</span> {ata.approved_by_user.full_name}
							</p>
						)}
						{ata.approved_by_name && (
							<p className='text-sm'>
								<span className='font-medium'>Signerad av:</span> {ata.approved_by_name}
							</p>
						)}
						{ata.approved_at && (
							<p className='text-sm text-muted-foreground'>
								{new Date(ata.approved_at).toLocaleString('sv-SE')}
							</p>
						)}
						{ata.comments && (
							<div className='mt-4 p-4 bg-white rounded-lg'>
								<p className='text-sm font-medium mb-1'>Skäl till avvisning:</p>
								<p className='text-sm whitespace-pre-wrap text-muted-foreground'>{ata.comments}</p>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Photo Gallery Viewer */}
			{selectedPhotoIndex !== null && photos && (
				<GalleryViewer
					images={photos.map((p) => p.photo_url)}
					initialIndex={selectedPhotoIndex}
					onClose={() => setSelectedPhotoIndex(null)}
				/>
			)}
		</div>
	);
}
