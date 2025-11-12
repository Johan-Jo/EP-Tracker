'use client';

import { useId, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';

interface PhotoUploadButtonsProps {
	onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onCameraChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
	disabled?: boolean;
	accept?: string;
	multiple?: boolean;
	cameraAllowsMultiple?: boolean;
	cameraCapture?: 'environment' | 'user';
	fileLabel?: string;
	cameraLabel?: string;
	fileButtonVariant?: ButtonProps['variant'];
	cameraButtonVariant?: ButtonProps['variant'];
	fileButtonClassName?: string;
	cameraButtonClassName?: string;
	containerClassName?: string;
	showFileButton?: boolean;
	showCameraButton?: boolean;
}

export function PhotoUploadButtons({
	onFileChange,
	onCameraChange,
	disabled = false,
	accept = 'image/*',
	multiple = true,
	cameraAllowsMultiple = false,
	cameraCapture = 'environment',
	fileLabel = 'Välj fil',
	cameraLabel = 'Ta foto',
	fileButtonVariant = 'outline',
	cameraButtonVariant = 'default',
	fileButtonClassName,
	cameraButtonClassName,
	containerClassName,
	showFileButton = true,
	showCameraButton = true,
}: PhotoUploadButtonsProps) {
	const uniqueId = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const cameraInputRef = useRef<HTMLInputElement>(null);

	const handleFileClick = () => {
		fileInputRef.current?.click();
	};

	const handleCameraClick = () => {
		cameraInputRef.current?.click();
	};

	const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		onFileChange(event);
		// Allow selecting the same file again
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const handleCameraInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (onCameraChange) {
			onCameraChange(event);
		} else {
			onFileChange(event);
		}

		if (cameraInputRef.current) {
			cameraInputRef.current.value = '';
		}
	};

	return (
		<div className={cn('flex flex-col gap-3 sm:flex-row', containerClassName)}>
			{showFileButton && (
				<>
					<Button
						type="button"
						variant={fileButtonVariant}
						onClick={handleFileClick}
						disabled={disabled}
						className={cn('flex-1', fileButtonClassName)}
					>
						<Upload className="h-4 w-4" />
						<span>{fileLabel}</span>
					</Button>
					<input
						ref={fileInputRef}
						id={`${uniqueId}-file-input`}
						type="file"
						accept={accept}
						multiple={multiple}
						onChange={handleFileInputChange}
						className="hidden"
					/>
				</>
			)}
			{showCameraButton && (
				<>
					<Button
						type="button"
						variant={cameraButtonVariant}
						onClick={handleCameraClick}
						disabled={disabled}
						className={cn('flex-1', cameraButtonClassName)}
					>
						<Camera className="h-4 w-4" />
						<span>{cameraLabel}</span>
					</Button>
					<input
						ref={cameraInputRef}
						id={`${uniqueId}-camera-input`}
						type="file"
						accept={accept}
						capture={cameraCapture}
						multiple={cameraAllowsMultiple}
						onChange={handleCameraInputChange}
						className="hidden"
					/>
				</>
			)}
		</div>
	);
}


