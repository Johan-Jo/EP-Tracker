'use client';

import { useEffect, useRef } from 'react';

interface AddressMapProps {
	lat: number | null;
	lon: number | null;
	className?: string;
}

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

export function AddressMap({ lat, lon, className = '' }: AddressMapProps) {
	const mapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mapRef.current || !lat || !lon || !GEOAPIFY_API_KEY) {
			return;
		}

		// Use Geoapify Static Maps API
		const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright-grey&width=600&height=250&center=lonlat:${lon},${lat}&zoom=15&marker=lonlat:${lon},${lat};type:material;color:%23ff6b35;size:large&apiKey=${GEOAPIFY_API_KEY}`;
		
		if (mapRef.current) {
			mapRef.current.innerHTML = `<img src="${mapUrl}" alt="Karta" class="w-full h-full object-cover rounded-md border border-gray-200" />`;
		}

		return () => {
			if (mapRef.current) {
				mapRef.current.innerHTML = '';
			}
		};
	}, [lat, lon]);

	if (!lat || !lon) {
		return (
			<div className={`bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center ${className}`} style={{ height: '200px' }}>
				<p className='text-sm text-muted-foreground'>Välj en adress för att visa karta</p>
			</div>
		);
	}

	return (
		<div ref={mapRef} className={`w-full rounded-md border border-gray-200 overflow-hidden ${className}`} style={{ height: '200px', minHeight: '200px' }}>
			{/* Map will be loaded here */}
		</div>
	);
}
