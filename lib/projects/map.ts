interface ProjectLocation {
	site_address?: string | null;
	site_lat?: number | null;
	site_lon?: number | null;
}

/**
 * Build a static map URL for a project location using Geoapify.
 * Requires NEXT_PUBLIC_GEOAPIFY_API_KEY in environment (for client-side use).
 */
export function getProjectMapUrl(location: ProjectLocation): string | null {
	// Use NEXT_PUBLIC_ prefix for client-side access
	// In client components, only NEXT_PUBLIC_ vars are available
	const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
	
	if (!apiKey || apiKey === '') {
		console.warn('[getProjectMapUrl] NEXT_PUBLIC_GEOAPIFY_API_KEY is not set');
		return null;
	}

	const { site_lat, site_lon, site_address } = location;

	// Prefer coordinates if available (most accurate)
	if (site_lat != null && site_lon != null) {
		const center = `${site_lon},${site_lat}`;
		return `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=600&height=250&center=lonlat:${center}&zoom=16&marker=lonlat:${center};color:%23ea580c;size:medium&apiKey=${apiKey}`;
	}

	// Fall back to address query
	if (!site_address || site_address.trim() === '') {
		return null;
	}
	
	// Clean up address string - remove extra spaces and normalize
	const cleanedAddress = site_address
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

