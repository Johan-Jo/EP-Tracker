interface WorkOrderLocation {
	location_address?: string | null;
	location_city?: string | null;
	location_zip?: string | null;
	location_lat?: number | null;
	location_lng?: number | null;
}

/**
 * Build a static map URL for a work order location using Geoapify.
 * Requires NEXT_PUBLIC_GEOAPIFY_API_KEY in environment (for client-side use).
 */
export function getWorkOrderMapUrl(location: WorkOrderLocation): string | null {
	// Use NEXT_PUBLIC_ prefix for client-side access
	// In client components, only NEXT_PUBLIC_ vars are available
	const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
	
	if (!apiKey || apiKey === '') {
		console.warn('[getWorkOrderMapUrl] NEXT_PUBLIC_GEOAPIFY_API_KEY is not set');
		return null;
	}

	const { location_lat, location_lng, location_address, location_city, location_zip } = location;

	// Prefer coordinates if available (most accurate)
	if (location_lat != null && location_lng != null) {
		const center = `${location_lng},${location_lat}`;
		return `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=600&height=250&center=lonlat:${center}&zoom=16&marker=lonlat:${center};color:%23ea580c;size:medium&apiKey=${apiKey}`;
	}

	// Fall back to address query
	// location_address may already contain postnummer and ort (e.g., "Observatoriegatan, 113 25 Stockholm")
	// But we also check location_zip and location_city if they exist separately
	let addressString = location_address || '';
	
	// If location_address doesn't include zip/city, add them
	if (location_zip && !addressString.includes(location_zip)) {
		addressString = addressString ? `${addressString}, ${location_zip}` : location_zip;
	}
	if (location_city && !addressString.includes(location_city)) {
		addressString = addressString ? `${addressString} ${location_city}` : location_city;
	}
	
	if (!addressString || addressString.trim() === '') {
		return null;
	}
	
	// Clean up address string - remove extra spaces and normalize
	const cleanedAddress = addressString
		.replace(/\s+/g, ' ') // Multiple spaces to single space
		.replace(/,\s*,/g, ',') // Multiple commas to single comma
		.trim();
	
	// Encode the address for URL
	const encoded = encodeURIComponent(cleanedAddress);
	
	// Build Geoapify static map URL
	// Note: Geoapify expects addresses with 'text:' prefix for geocoding
	// Format: text:address_string
	const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=600&height=250&center=text:${encoded}&zoom=16&marker=text:${encoded};color:%23ea580c;size:medium&apiKey=${apiKey}`;
	
	return mapUrl;
}


