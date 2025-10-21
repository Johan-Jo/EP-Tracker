'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, FileText, Calendar, User, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { GalleryViewer } from '@/components/shared/gallery-viewer';

interface AtaDetailClientProps {
	ataId: string;
	userRole: 'admin' | 'foreman' | 'worker' | 'finance';
}

const statusConfig = {
	draft: {
		icon: FileText,
		label: 'Utkast',
		variant: 'secondary' as const,
	},
	pending_approval: {
		icon: Clock,
		label: 'Väntar på godkännande',
		variant: 'default' as const,
	},
	approved: {
		icon: CheckCircle2,
		label: 'Godkänd',
		variant: 'default' as const,
	},
	rejected: {
		icon: XCircle,
		label: 'Avvisad',
		variant: 'destructive' as const,
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
			<div className="flex items-center justify-center py-12">
				<div className="text-muted-foreground">Laddar ÄTA...</div>
			</div>
		);
	}

	if (!ata) {
		return (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">ÄTA hittades inte</p>
				</CardContent>
			</Card>
		);
	}

	const config = statusConfig[ata.status as keyof typeof statusConfig];
	const StatusIcon = config.icon;

	// Calculate total
	const qty = parseFloat(ata.qty || '0');
	const unitPrice = parseFloat(ata.unit_price_sek || '0');
	const total = qty * unitPrice;

	return (
		<div className="max-w-4xl space-y-6">
			{/* Header Card */}
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								{ata.ata_number && (
									<Badge variant="outline">{ata.ata_number}</Badge>
								)}
								<Badge variant={config.variant} className="flex items-center gap-1">
									<StatusIcon className="h-3 w-3" />
									{config.label}
								</Badge>
							</div>
							<CardTitle className="text-2xl">{ata.title}</CardTitle>
							<p className="text-sm text-muted-foreground">
								Projekt: {ata.project.project_number ? `${ata.project.project_number} - ` : ''}{ata.project.name}
							</p>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-sm">
						<p className="flex items-center gap-2 text-muted-foreground">
							<Calendar className="h-4 w-4" />
							Skapad: {new Date(ata.created_at).toLocaleDateString('sv-SE', {
								weekday: 'long',
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							})}
						</p>
						{ata.created_by_user && (
							<p className="flex items-center gap-2 text-muted-foreground">
								<User className="h-4 w-4" />
								Skapad av: {ata.created_by_user.full_name}
							</p>
						)}
					</div>
				</CardContent>
			</Card>

		{/* Description Card */}
		{ata.description && (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Beskrivning
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap">{ata.description}</p>
					</CardContent>
				</Card>
			)}

		{/* Cost Details Card */}
		<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
			<CardHeader>
				<CardTitle>Kostnadsuppgifter</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-3 gap-4">
							<div>
								<p className="text-sm text-muted-foreground">Antal</p>
								<p className="text-lg font-medium">{qty} {ata.unit || 'st'}</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">À-pris</p>
								<p className="text-lg font-medium">{unitPrice.toFixed(2)} SEK</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">Totalt</p>
								<p className="text-lg font-bold text-primary">{total.toFixed(2)} SEK</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

		{/* Photos Card */}
		{photos && photos.length > 0 && (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ImageIcon className="h-5 w-5" />
							Foton ({photos.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
							{photos.map((photo, index) => (
								<button
									key={photo.id}
									onClick={() => setSelectedPhotoIndex(index)}
									className="relative aspect-square rounded-lg overflow-hidden border hover:opacity-80 transition-opacity"
								>
									<img
										src={photo.photo_url}
										alt={`Foto ${index + 1}`}
										className="w-full h-full object-cover"
									/>
								</button>
							))}
						</div>
					</CardContent>
				</Card>
			)}

		{/* Signature Card (for pending or approved) */}
		{ata.signed_by_name && (
			<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
				<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5 text-primary" />
							Signatur
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm">
							<strong>Signerad av:</strong> {ata.signed_by_name}
						</p>
						{ata.signed_at && (
							<p className="text-sm text-muted-foreground mt-1">
								{new Date(ata.signed_at).toLocaleString('sv-SE')}
							</p>
						)}
					</CardContent>
				</Card>
			)}

			{/* Approval/Rejection Card */}
			{ata.status === 'approved' && (
				<Card className="border-primary">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-primary">
							<CheckCircle2 className="h-5 w-5" />
							Godkänd
						</CardTitle>
					</CardHeader>
					<CardContent>
						{ata.approved_by_user && (
							<p className="text-sm">
								<strong>Godkänd av:</strong> {ata.approved_by_user.full_name}
							</p>
						)}
						{ata.approved_by_name && (
							<p className="text-sm mt-1">
								<strong>Signerad av:</strong> {ata.approved_by_name}
							</p>
						)}
						{ata.approved_at && (
							<p className="text-sm text-muted-foreground mt-1">
								{new Date(ata.approved_at).toLocaleString('sv-SE')}
							</p>
						)}
						{ata.comments && (
							<div className="mt-4 p-3 bg-muted rounded-md">
								<p className="text-sm font-medium mb-1">Kommentar:</p>
								<p className="text-sm whitespace-pre-wrap">{ata.comments}</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{ata.status === 'rejected' && (
				<Card className="border-destructive">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<XCircle className="h-5 w-5" />
							Avvisad
						</CardTitle>
					</CardHeader>
					<CardContent>
						{ata.approved_by_user && (
							<p className="text-sm">
								<strong>Avvisad av:</strong> {ata.approved_by_user.full_name}
							</p>
						)}
						{ata.approved_by_name && (
							<p className="text-sm mt-1">
								<strong>Signerad av:</strong> {ata.approved_by_name}
							</p>
						)}
						{ata.approved_at && (
							<p className="text-sm text-muted-foreground mt-1">
								{new Date(ata.approved_at).toLocaleString('sv-SE')}
							</p>
						)}
						{ata.comments && (
							<div className="mt-4 p-3 bg-destructive/10 rounded-md">
								<p className="text-sm font-medium mb-1">Skäl till avvisning:</p>
								<p className="text-sm whitespace-pre-wrap">{ata.comments}</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* Photo Gallery Viewer */}
			{selectedPhotoIndex !== null && photos && (
				<GalleryViewer
					images={photos.map(p => p.photo_url)}
					initialIndex={selectedPhotoIndex}
					onClose={() => setSelectedPhotoIndex(null)}
				/>
			)}
		</div>
	);
}

