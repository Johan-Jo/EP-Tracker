'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PhotoGalleryViewerProps {
	photos: string[];
	isOpen: boolean;
	onClose: () => void;
	initialIndex?: number;
}

export function PhotoGalleryViewer({ photos, isOpen, onClose, initialIndex = 0 }: PhotoGalleryViewerProps) {
	const [currentIndex, setCurrentIndex] = useState(initialIndex);

	const goToPrevious = () => {
		setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
	};

	const goToNext = () => {
		setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'ArrowLeft') goToPrevious();
		if (e.key === 'ArrowRight') goToNext();
		if (e.key === 'Escape') onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl p-0" onKeyDown={handleKeyDown}>
				<DialogHeader className="p-6 pb-0">
					<DialogTitle>
						Foto {currentIndex + 1} av {photos.length}
					</DialogTitle>
				</DialogHeader>

				<div className="relative">
					{/* Main Image */}
					<div className="flex items-center justify-center bg-muted min-h-[400px] max-h-[600px]">
						<img
							src={photos[currentIndex]}
							alt={`Foto ${currentIndex + 1}`}
							className="max-w-full max-h-[600px] object-contain"
						/>
					</div>

					{/* Navigation Buttons */}
					{photos.length > 1 && (
						<>
							<Button
								variant="outline"
								size="icon"
								className="absolute left-2 top-1/2 -translate-y-1/2"
								onClick={goToPrevious}
							>
								<ChevronLeft className="w-4 h-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								className="absolute right-2 top-1/2 -translate-y-1/2"
								onClick={goToNext}
							>
								<ChevronRight className="w-4 h-4" />
							</Button>
						</>
					)}
				</div>

				{/* Thumbnail Strip */}
				{photos.length > 1 && (
					<div className="flex gap-2 overflow-x-auto p-4 bg-muted/30">
						{photos.map((photo, index) => (
							<button
								key={index}
								onClick={() => setCurrentIndex(index)}
								className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
									index === currentIndex
										? 'border-primary ring-2 ring-primary/20'
										: 'border-transparent hover:border-muted-foreground/30'
								}`}
							>
								<img
									src={photo}
									alt={`Thumbnail ${index + 1}`}
									className="w-full h-full object-cover"
								/>
							</button>
						))}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

