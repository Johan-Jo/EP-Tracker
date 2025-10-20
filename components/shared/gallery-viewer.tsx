'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GalleryViewerProps {
	images: string[];
	initialIndex: number;
	onClose: () => void;
}

export function GalleryViewer({ images, initialIndex, onClose }: GalleryViewerProps) {
	const [currentIndex, setCurrentIndex] = useState(initialIndex);

	// Lock scroll when gallery is open
	useEffect(() => {
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, []);

	// Handle keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			} else if (e.key === 'ArrowLeft') {
				goToPrevious();
			} else if (e.key === 'ArrowRight') {
				goToNext();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [currentIndex]);

	const goToPrevious = () => {
		setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
	};

	const goToNext = () => {
		setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
	};

	const node = (
		<>
			{/* Backdrop */}
			<div
				style={{
					position: 'fixed',
					inset: 0,
					backgroundColor: 'rgba(0, 0, 0, 0.9)',
					zIndex: 99998,
				}}
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Gallery Container */}
			<div
				style={{
					position: 'fixed',
					inset: 0,
					zIndex: 99999,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					padding: '2rem',
				}}
			>
				{/* Close Button */}
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					className="absolute top-4 right-4 text-white hover:bg-white/20"
				>
					<X className="h-6 w-6" />
				</Button>

				{/* Image Counter */}
				<div className="absolute top-4 left-4 text-white text-lg font-medium">
					{currentIndex + 1} / {images.length}
				</div>

				{/* Navigation Buttons */}
				{images.length > 1 && (
					<>
						<Button
							variant="ghost"
							size="icon"
							onClick={goToPrevious}
							className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
						>
							<ChevronLeft className="h-8 w-8" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={goToNext}
							className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
						>
							<ChevronRight className="h-8 w-8" />
						</Button>
					</>
				)}

				{/* Image */}
				<div
					style={{
						maxWidth: '90vw',
						maxHeight: '90vh',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
					onClick={(e) => e.stopPropagation()}
				>
					<img
						src={images[currentIndex]}
						alt={`Image ${currentIndex + 1}`}
						style={{
							maxWidth: '100%',
							maxHeight: '90vh',
							objectFit: 'contain',
							borderRadius: '0.5rem',
						}}
					/>
				</div>

				{/* Thumbnail Navigation (if multiple images) */}
				{images.length > 1 && (
					<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
						{images.map((img, index) => (
							<button
								key={index}
								onClick={() => setCurrentIndex(index)}
								className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
									index === currentIndex
										? 'border-white scale-110'
										: 'border-transparent opacity-60 hover:opacity-100'
								}`}
							>
								<img
									src={img}
									alt={`Thumbnail ${index + 1}`}
									className="w-full h-full object-cover"
								/>
							</button>
						))}
					</div>
				)}
			</div>
		</>
	);

	return createPortal(node, document.body);
}

