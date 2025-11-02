'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';

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
		setIsMounted(true);
		// Import Leaflet CSS
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore - CSS import has no types
		import('leaflet/dist/leaflet.css');
		
		// Fix default marker icon issue in Next.js
		delete (L.Icon.Default.prototype as any)._getIconUrl;
		L.Icon.Default.mergeOptions({
			iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
			iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
			shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
		});
	}, []);

	if (!isMounted || !lat || !lon) {
		return (
			<div className={`bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center ${className}`} style={{ height: '200px' }}>
				<p className='text-sm text-muted-foreground'>Välj en adress för att visa karta</p>
			</div>
		);
	}

	return (
		<div className={`w-full rounded-md border border-gray-200 overflow-hidden ${className}`} style={{ height: '200px', minHeight: '200px' }}>
			<MapContainer
				center={[lat, lon]}
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
				<Marker position={[lat, lon]} />
			</MapContainer>
		</div>
	);
}
