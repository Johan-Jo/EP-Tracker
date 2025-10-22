'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface ReceiptLightboxProps {
	images: string[];
	initialIndex?: number;
	open: boolean;
	onClose: () => void;
}

export function ReceiptLightbox({ images, initialIndex = 0, open, onClose }: ReceiptLightboxProps) {
	const [currentIndex, setCurrentIndex] = useState(initialIndex);

	const handlePrevious = () => {
		setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
	};

	if (!images || images.length === 0) return null;

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className='max-w-6xl h-[90vh] p-0 bg-gray-900/95 border-0'>
				{/* Header */}
				<div className='absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent'>
					<div className='flex items-center justify-between text-white'>
						<h3 className='text-lg font-semibold'>Kvitto</h3>
						<div className='flex items-center gap-4'>
							<span className='text-sm'>
								{currentIndex + 1} av {images.length}
							</span>
							<button
								onClick={onClose}
								className='p-1 hover:bg-white/10 rounded-lg transition-colors'
							>
								<X className='w-6 h-6' />
							</button>
						</div>
					</div>
				</div>

				{/* Main Image */}
				<div className='relative w-full h-full flex items-center justify-center p-16'>
					<Image
						src={images[currentIndex]}
						alt={`Kvitto ${currentIndex + 1}`}
						fill
						className='object-contain'
						sizes='(max-width: 1536px) 100vw'
					/>

					{/* Navigation Arrows */}
					{images.length > 1 && (
						<>
							<button
								onClick={handlePrevious}
								className='absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-lg transition-colors'
							>
								<ChevronLeft className='w-8 h-8' />
							</button>
							<button
								onClick={handleNext}
								className='absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-lg transition-colors'
							>
								<ChevronRight className='w-8 h-8' />
							</button>
						</>
					)}
				</div>

				{/* Thumbnail Strip */}
				{images.length > 1 && (
					<div className='absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent'>
						<div className='flex gap-2 justify-center overflow-x-auto max-w-full'>
							{images.map((url, index) => (
								<button
									key={index}
									onClick={() => setCurrentIndex(index)}
									className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden ${
										index === currentIndex ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
									} transition-all`}
								>
									<Image
										src={url}
										alt={`Thumbnail ${index + 1}`}
										fill
										className='object-cover'
										sizes='80px'
									/>
								</button>
							))}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

