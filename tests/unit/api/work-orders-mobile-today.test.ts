import { NextRequest } from 'next/server';
import { GET as getTodayWorkOrders } from '@/app/api/mobile/work-orders/today/route';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/supabase/server');

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('GET /api/mobile/work-orders/today', () => {
	const validUserId = '123e4567-e89b-12d3-a456-426614174004';
	const validOrgId = '123e4567-e89b-12d3-a456-426614174001';

	beforeEach(() => {
		mockedGetSession.mockResolvedValue({
			user: { id: validUserId },
			membership: { org_id: validOrgId, role: 'worker' },
		} as any);
		mockedCreateClient.mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return today\'s work orders for user', async () => {
		const workOrders = [
			{
				id: '123e4567-e89b-12d3-a456-426614174010',
				work_order_number: 'WO-2025-001',
				title: 'Test Work Order 1',
				project_id: '123e4567-e89b-12d3-a456-426614174002',
				organization_id: validOrgId,
				planned_start_at: new Date().toISOString(),
				planned_end_at: new Date().toISOString(),
				all_day: false,
				status: 'assigned',
				priority: 'NORMAL',
				location_address: 'Test Address',
				location_city: 'Stockholm',
				location_zip: '12345',
				location_lat: 59.3293,
				location_lng: 18.0686,
				actual_start_at: null,
				actual_end_at: null,
				project: {
					id: '123e4567-e89b-12d3-a456-426614174002',
					name: 'Test Project',
					project_number: 'P-001',
					site_address: 'Project Address',
				},
				customer: {
					id: '123e4567-e89b-12d3-a456-426614174003',
					type: 'COMPANY',
					company_name: 'Test Company',
					first_name: null,
					last_name: null,
				},
			},
		];

		const assignments = [
			{ work_order_id: '123e4567-e89b-12d3-a456-426614174010' },
		];

		const workOrdersBuilder: any = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockReturnThis(),
			in: jest.fn().mockReturnThis(),
			order: jest.fn().mockResolvedValue({
				data: workOrders,
				error: null,
			}),
		};

		const assignmentsBuilder: any = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			in: jest.fn().mockResolvedValue({
				data: assignments,
				error: null,
			}),
		};

		mockedCreateClient.mockResolvedValue({
			from: (table: string) => {
				if (table === 'work_orders') return workOrdersBuilder;
				if (table === 'work_order_assignments') return assignmentsBuilder;
				return {};
			},
		} as any);

		const request = new NextRequest('http://localhost/api/mobile/work-orders/today');
		const response = await getTodayWorkOrders(request);
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(payload.work_orders).toHaveLength(1);
		expect(payload.work_orders[0].id).toBe('123e4567-e89b-12d3-a456-426614174010');
	});

	it('should return 401 if not authenticated', async () => {
		mockedGetSession.mockResolvedValueOnce({
			user: null,
			membership: null,
		} as any);

		const request = new NextRequest('http://localhost/api/mobile/work-orders/today');
		const response = await getTodayWorkOrders(request);
		const payload = await response.json();

		expect(response.status).toBe(401);
		expect(payload.error).toBe('Unauthorized');
	});
});
