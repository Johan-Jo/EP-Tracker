import { NextRequest } from 'next/server';
import { POST } from '@/app/api/demo/toggle-example-mode/route';
import { cookies } from 'next/headers';

jest.mock('next/headers');

const mockedCookies = cookies as jest.MockedFunction<typeof cookies>;

describe('POST /api/demo/toggle-example-mode', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('sets cookie when enabled=true', async () => {
		const mockCookieStore = {
			set: jest.fn(),
		};

		mockedCookies.mockResolvedValue(mockCookieStore as any);

		const request = new NextRequest('http://localhost/api/demo/toggle-example-mode', {
			method: 'POST',
			body: JSON.stringify({ enabled: true }),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.enabled).toBe(true);
		expect(mockCookieStore.set).toHaveBeenCalledWith(
			'exampleModeEnabled',
			'true',
			expect.objectContaining({
				path: '/',
				maxAge: 60 * 60 * 24 * 365,
				httpOnly: false,
				sameSite: 'lax',
			})
		);
	});

	test('deletes cookie when enabled=false', async () => {
		const mockCookieStore = {
			delete: jest.fn(),
		};

		mockedCookies.mockResolvedValue(mockCookieStore as any);

		const request = new NextRequest('http://localhost/api/demo/toggle-example-mode', {
			method: 'POST',
			body: JSON.stringify({ enabled: false }),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.enabled).toBe(false);
		expect(mockCookieStore.delete).toHaveBeenCalledWith('exampleModeEnabled');
	});

	test('handles errors gracefully', async () => {
		mockedCookies.mockRejectedValue(new Error('Cookie error'));

		const request = new NextRequest('http://localhost/api/demo/toggle-example-mode', {
			method: 'POST',
			body: JSON.stringify({ enabled: true }),
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe('Failed to toggle example mode');
		consoleSpy.mockRestore();
	});
});

