'use client';

import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PhotoUploadButtons } from '@/components/shared/photo-upload-buttons';

interface ReceiptUploadProps {
	onUpload: (urls: string[]) => void;
	existingUrls?: string[];
	maxFiles?: number;
}

export function ReceiptUpload({ onUpload, existingUrls = [], maxFiles = 10 }: ReceiptUploadProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const supabase = createClient();

	const uploadFiles = async (files: FileList | File[]) => {
		if (existingUrls.length + files.length > maxFiles) {
			alert(`Du kan max ladda upp ${maxFiles} bilder totalt`);
			return;
		}

		setIsUploading(true);

		try {
			const fileArray = Array.from(files);
			const uploadPromises = fileArray.map(async (file) => {
				// Generate unique filename
				const fileExt = file.name.split('.').pop();
				const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
				const filePath = `${fileName}`;

				const { data, error } = await supabase.storage.from('receipts').upload(filePath, file, {
					cacheControl: '3600',
					upsert: false,
				});

				if (error) throw error;

				// Get public URL
				const {
					data: { publicUrl },
				} = supabase.storage.from('receipts').getPublicUrl(data.path);

				return publicUrl;
			});

			const newUrls = await Promise.all(uploadPromises);
			onUpload([...existingUrls, ...newUrls]);
		} catch (error) {
			console.error('Error uploading files:', error);
			alert('Ett fel uppstod vid uppladdning');
		} finally {
			setIsUploading(false);
		}
	};

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);

			const files = e.dataTransfer.files;
			if (files.length > 0) {
				uploadFiles(files);
			}
		},
		[existingUrls]
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			uploadFiles(files);
		}
	};

	const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			uploadFiles(files);
		}
	};

	return (
		<div
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
				isDragging
					? 'border-orange-500 bg-orange-50'
					: 'border-gray-300 hover:border-orange-300'
			} ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
		>
			<div className='flex flex-col items-center gap-4'>
				{/* Icon */}
				<div className='w-16 h-16 rounded-lg bg-orange-100 flex items-center justify-center'>
					<Upload className='w-8 h-8 text-orange-600' />
				</div>

				{/* Title */}
				<div>
					<h3 className='text-lg font-semibold mb-1'>
						{isUploading ? 'Laddar upp...' : 'Ladda upp kvitton'}
					</h3>
					<p className='text-sm text-muted-foreground'>
						Dra och släpp eller använd knapparna nedan
					</p>
					<p className='text-xs text-muted-foreground mt-1'>
						{existingUrls.length} av {maxFiles} bilder uppladdade
					</p>
				</div>

				{/* Buttons */}
				<PhotoUploadButtons
					onFileChange={handleFileSelect}
					onCameraChange={handleCameraCapture}
					disabled={isUploading}
					fileLabel='Välj fil'
					cameraLabel='Ta foto'
					fileButtonVariant='outline'
					cameraButtonVariant='default'
					fileButtonClassName='flex-1'
					cameraButtonClassName='flex-1 bg-orange-500 hover:bg-orange-600 text-white'
				/>
			</div>
		</div>
	);
}

