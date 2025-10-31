'use client';

import QRCode from 'react-qr-code';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface QRDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	value: string;
	expiresAt?: Date;
}

export function QRDialog({ open, onOpenChange, title, description, value, expiresAt }: QRDialogProps) {
	const handleDownload = () => {
		// Create SVG data URI
		const svg = document.querySelector('.qr-code-svg');
		if (!svg) return;
		
		const svgData = new XMLSerializer().serializeToString(svg);
		const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
		const svgUrl = URL.createObjectURL(svgBlob);
		
		// Create download link
		const link = document.createElement('a');
		link.download = `qr-code-${Date.now()}.svg`;
		link.href = svgUrl;
		link.click();
		
		URL.revokeObjectURL(svgUrl);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<div className='flex flex-col items-center gap-4 py-4'>
					<div className='bg-white p-4 rounded-lg border-2'>
						<QRCode 
							value={value} 
							size={256}
							className='qr-code-svg'
						/>
					</div>
					{expiresAt && (
						<p className='text-sm text-muted-foreground'>
							Utgår: {expiresAt.toLocaleString('sv-SE')}
						</p>
					)}
					<div className='flex gap-2 w-full'>
						<Button variant='outline' onClick={handleDownload} className='flex-1'>
							<Download className='w-4 h-4 mr-2' />
							Ladda ner
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

