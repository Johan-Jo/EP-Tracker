'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet to avoid SSR issues
const MapContainer = dynamic(
	() => import('react-leaflet').then((mod) => mod.MapContainer),
	{ ssr: false }
);
const TileLayer = dynamic(
	() => import('react-leaflet').then((mod) => mod.TileLayer),
	{ ssr: false }
);
const Marker = dynamic(
	() => import('react-leaflet').then((mod) => mod.Marker),
	{ ssr: false }
);

interface AddressMapProps {
	lat: number | null;
	lon: number | null;
	className?: string;
}

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

export function AddressMap({ lat, lon, className = '' }: AddressMapProps) {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		let isActive = true;
		setIsMounted(true);

	(async () => {
			const leaflet = await import('leaflet');
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore - CSS import has no types
			await import('leaflet/dist/leaflet.css');

			if (!isActive) return;

			delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
			leaflet.Icon.Default.mergeOptions({
				iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
				iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
				shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
			});
		})();

		return () => {
			isActive = false;
		};
	}, []);

	// Convert to numbers and validate
	const latNum = lat != null ? Number(lat) : null;
	const lonNum = lon != null ? Number(lon) : null;
	const hasValidCoords = latNum != null && lonNum != null && !isNaN(latNum) && !isNaN(lonNum);

	if (!isMounted || !hasValidCoords) {
		return (
			<div className={`bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center ${className}`} style={{ height: '200px' }}>
				<p className='text-sm text-muted-foreground'>Välj en adress för att visa karta</p>
			</div>
		);
	}

	return (
		<div className={`w-full rounded-md border border-gray-200 overflow-hidden ${className}`} style={{ height: '200px', minHeight: '200px' }}>
			<MapContainer
				key={`${latNum}-${lonNum}`}
				center={[latNum, lonNum]}
				zoom={15}
				style={{ height: '100%', width: '100%' }}
				scrollWheelZoom={true}
				className="z-0"
			>
				{/* Use Geoapify tiles with API key */}
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://geoapify.com/">Geoapify</a>'
					url={`https://maps.geoapify.com/v1/tile/klokantech-basic/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`}
				/>
				<Marker key={`marker-${latNum}-${lonNum}`} position={[latNum, lonNum]} />
			</MapContainer>
		</div>
	);
}
