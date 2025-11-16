'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface OrganizationLogoUploadProps {
	orgId: string;
	logoUrl: string | null;
	onChange: (url: string | null) => void;
}

export function OrganizationLogoUpload({ orgId, logoUrl, onChange }: OrganizationLogoUploadProps) {
	const supabase = createClient();
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Basic client-side validation
		if (!file.type.startsWith('image/')) {
			alert('Endast bildfiler (PNG, JPG, SVG) är tillåtna');
			return;
		}

		if (file.size > 2 * 1024 * 1024) {
			alert('Logotypen får max vara 2 MB');
			return;
		}

		setIsUploading(true);

		try {
			const ext = file.name.split('.').pop() || 'png';
			const path = `${orgId}/logo.${ext}`;

			// Upload to dedicated organization-logos bucket (must exist in Supabase)
			const { data, error } = await supabase.storage.from('organization-logos').upload(path, file, {
				cacheControl: '3600',
				upsert: true,
			});

			if (error) {
				console.error('Error uploading organization logo:', error);
				alert('Kunde inte ladda upp logotypen. Försök igen.');
				return;
			}

			const {
				data: { publicUrl },
			} = supabase.storage.from('organization-logos').getPublicUrl(data.path);

			onChange(publicUrl || null);
		} finally {
			setIsUploading(false);
			// Reset input so same file can be selected again if needed
			event.target.value = '';
		}
	};

	const handleRemove = useCallback(() => {
		onChange(null);
	}, [onChange]);

	return (
		<div className='space-y-3'>
			<div className='flex items-center gap-4'>
				<div className='w-20 h-20 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/40 overflow-hidden'>
					{logoUrl ? (
						<Image
							src={logoUrl}
							alt='Organisationslogotyp'
							width={80}
							height={80}
							className='object-contain w-full h-full'
						/>
					) : (
						<Upload className='w-6 h-6 text-muted-foreground' />
					)}
				</div>
				<div className='flex flex-col gap-2'>
					<div className='flex flex-wrap gap-2'>
						<input
							ref={fileInputRef}
							type='file'
							accept='image/png,image/jpeg,image/jpg,image/webp,image/svg+xml'
							className='hidden'
							onChange={handleFileChange}
							disabled={isUploading}
						/>
						<Button
							type='button'
							size='sm'
							variant='outline'
							disabled={isUploading}
							onClick={() => fileInputRef.current?.click()}
						>
							<span>{isUploading ? 'Laddar upp...' : logoUrl ? 'Byt logotyp' : 'Ladda upp logotyp'}</span>
						</Button>
						{logoUrl && (
							<Button type='button' size='sm' variant='ghost' onClick={handleRemove}>
								<X className='w-4 h-4 mr-1' />
								Ta bort
							</Button>
						)}
					</div>
					<p className='text-[11px] text-muted-foreground'>
						PNG, JPG eller SVG. Max 2 MB. Logotypen sparas på servern och används för fakturaunderlag (PDF).
					</p>
				</div>
			</div>
		</div>
	);
}


