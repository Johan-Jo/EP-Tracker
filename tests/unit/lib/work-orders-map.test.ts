import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import { getWorkOrderMapUrl } from '@/lib/work-orders/map';

describe('getWorkOrderMapUrl', () => {
	const originalEnv = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

	beforeEach(() => {
		process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY = 'test-api-key-123';
	});

	afterEach(() => {
		if (originalEnv) {
			process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY = originalEnv;
		} else {
			delete process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
		}
	});

	it('should return null if API key is not set', () => {
		delete process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
		const result = getWorkOrderMapUrl({
			location_address: 'Test Address',
		});
		expect(result).toBeNull();
	});

	it('should use coordinates if available', () => {
		const result = getWorkOrderMapUrl({
			location_lat: 59.3293,
			location_lng: 18.0686,
			location_address: 'Test Address',
		});

		expect(result).not.toBeNull();
		expect(result).toContain('lonlat:18.0686,59.3293');
		expect(result).toContain('test-api-key-123');
	});

	it('should use address string if coordinates not available', () => {
		const result = getWorkOrderMapUrl({
			location_address: 'Observatoriegatan',
			location_city: 'Stockholm',
			location_zip: '113 25',
		});

		expect(result).not.toBeNull();
		expect(result).toContain('center=text:');
		expect(result).toContain('Observatoriegatan');
		expect(result).toContain('test-api-key-123');
	});

	it('should return null if no location data provided', () => {
		const result = getWorkOrderMapUrl({});
		expect(result).toBeNull();
	});
});
