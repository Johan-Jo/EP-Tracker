import { NextRequest } from 'next/server';
import { POST as postTimeEntry } from '@/app/api/time/entries/route';
import { POST as postMaterial } from '@/app/api/materials/route';
import { getSession } from '@/lib/auth/get-session';
import { checkDemoMode } from '@/lib/demo/check-demo-mode';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/demo/check-demo-mode');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/notifications', () => ({
	sendTeamCheckInNotification: jest.fn(),
}));
jest.mock('@/lib/work-orders/send-time-approval-email', () => ({
	sendWorkOrderTimeApprovalEmail: jest.fn(),
}));

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedCheckDemoMode = checkDemoMode as jest.MockedFunction<typeof checkDemoMode>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Demo Mode API Blocking', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('POST /api/time/entries', () => {
		test('blocks POST request when in demo mode', async () => {
			mockedGetSession.mockResolvedValue({
				user: { id: 'user-1' } as any,
				membership: { org_id: 'demo-org-123', role: 'admin' } as any,
				profile: null,
			});

			mockedCheckDemoMode.mockResolvedValue({
				isDemoMode: true,
				demoOrgId: 'demo-org-123',
				effectiveOrgId: 'demo-org-123',
			});

			const request = new NextRequest('http://localhost/api/time/entries', {
				method: 'POST',
				body: JSON.stringify({
					project_id: 'project-1',
					start_at: '2025-01-01T08:00:00Z',
					stop_at: '2025-01-01T16:00:00Z',
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			});

			const response = await postTimeEntry(request);
			const data = await response.json();

			expect(response.status).toBe(403);
			expect(data.error).toContain('avstängd i demo');
			expect(mockedCheckDemoMode).toHaveBeenCalledWith('demo-org-123');
		});

		test('allows POST request when not in demo mode', async () => {
			mockedGetSession.mockResolvedValue({
				user: { id: 'user-1' } as any,
				membership: { org_id: 'user-org-123', role: 'admin' } as any,
				profile: null,
			});

			mockedCheckDemoMode.mockResolvedValue({
				isDemoMode: false,
				demoOrgId: 'demo-org-123',
				effectiveOrgId: 'user-org-123',
			});

			mockedCreateClient.mockResolvedValue({
				from: jest.fn().mockReturnValue({
					insert: jest.fn().mockResolvedValue({
						data: { id: 'entry-1' },
						error: null,
					}),
				}),
			} as any);

			const request = new NextRequest('http://localhost/api/time/entries', {
				method: 'POST',
				body: JSON.stringify({
					project_id: 'project-1',
					start_at: '2025-01-01T08:00:00Z',
					stop_at: '2025-01-01T16:00:00Z',
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			});

			// This will fail validation but should pass demo mode check
			const response = await postTimeEntry(request);

			// Should not be 403 (demo blocked), should be validation error or success
			expect(response.status).not.toBe(403);
		});
	});

	describe('POST /api/materials', () => {
		test('blocks POST request when in demo mode', async () => {
			mockedGetSession.mockResolvedValue({
				user: { id: 'user-1' } as any,
				membership: { org_id: 'demo-org-123', role: 'admin' } as any,
				profile: null,
			});

			mockedCheckDemoMode.mockResolvedValue({
				isDemoMode: true,
				demoOrgId: 'demo-org-123',
				effectiveOrgId: 'demo-org-123',
			});

			const request = new NextRequest('http://localhost/api/materials', {
				method: 'POST',
				body: JSON.stringify({
					project_id: 'project-1',
					description: 'Test material',
					qty: 10,
					unit: 'st',
					unit_price_sek: 100,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			});

			const response = await postMaterial(request);
			const data = await response.json();

			expect(response.status).toBe(403);
			expect(data.error).toContain('avstängd i demo');
		});

		test('allows POST request when not in demo mode', async () => {
			mockedGetSession.mockResolvedValue({
				user: { id: 'user-1' } as any,
				membership: { org_id: 'user-org-123', role: 'admin' } as any,
				profile: null,
			});

			mockedCheckDemoMode.mockResolvedValue({
				isDemoMode: false,
				demoOrgId: 'demo-org-123',
				effectiveOrgId: 'user-org-123',
			});

			mockedCreateClient.mockResolvedValue({
				from: jest.fn().mockReturnValue({
					insert: jest.fn().mockResolvedValue({
						data: { id: 'material-1' },
						error: null,
					}),
				}),
			} as any);

			const request = new NextRequest('http://localhost/api/materials', {
				method: 'POST',
				body: JSON.stringify({
					project_id: 'project-1',
					description: 'Test material',
					qty: 10,
					unit: 'st',
					unit_price_sek: 100,
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			});

			// This will fail validation but should pass demo mode check
			const response = await postMaterial(request);

			// Should not be 403 (demo blocked)
			expect(response.status).not.toBe(403);
		});
	});
});

