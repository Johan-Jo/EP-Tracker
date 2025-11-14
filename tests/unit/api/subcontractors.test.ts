import { NextRequest } from 'next/server';
import { GET as getSubcontractors, POST as createSubcontractor } from '@/app/api/subcontractors/route';
import { GET as getSubcontractor, PUT as updateSubcontractor } from '@/app/api/subcontractors/[id]/route';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/supabase/server');

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

type SupabaseBuilder = {
	select: jest.MockedFunction<any>;
	insert: jest.MockedFunction<any>;
	update: jest.MockedFunction<any>;
	eq: jest.MockedFunction<any>;
	or: jest.MockedFunction<any>;
	range: jest.MockedFunction<any>;
	order: jest.MockedFunction<any>;
	single: jest.MockedFunction<any>;
	neq: jest.MockedFunction<any>;
	then?: jest.MockedFunction<any>;
	catch?: jest.MockedFunction<any>;
};

describe('/api/subcontractors', () => {
	beforeEach(() => {
		mockedGetSession.mockResolvedValue({
			user: { id: 'user-1' },
			membership: { org_id: 'org-1', role: 'admin' },
		} as any);
		mockedCreateClient.mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('GET /api/subcontractors', () => {
		it('should return paginated subcontractors list', async () => {
			const subcontractorsData = [
				{
					id: 'sub-1',
					subcontractor_no: 'UE-2025-0001',
					company_name: 'Test AB',
					org_no: '5561234567',
					email: 'test@example.com',
					is_archived: false,
				},
				{
					id: 'sub-2',
					subcontractor_no: 'UE-2025-0002',
					company_name: 'Another AB',
					org_no: '5567654321',
					email: 'another@example.com',
					is_archived: false,
				},
			];

			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
			};

			const orderResult = {
				data: subcontractorsData,
				error: null,
				count: 2,
			};
			builder.order = jest.fn().mockReturnValue(builder);
			builder.then = jest.fn((resolve) => resolve(orderResult));
			builder.catch = jest.fn();

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/subcontractors?page=1&pageSize=25');
			const response = await getSubcontractors(request);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.items).toHaveLength(2);
			expect(payload.page).toBe(1);
			expect(payload.pageSize).toBe(25);
			expect(payload.total).toBe(2);
			expect(builder.eq).toHaveBeenCalledWith('org_id', 'org-1');
			expect(builder.eq).toHaveBeenCalledWith('is_archived', false);
		});

		it('should search subcontractors by query', async () => {
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
			};

			const orderResult = {
				data: [
					{
						id: 'sub-1',
						subcontractor_no: 'UE-2025-0001',
						company_name: 'Test AB',
						org_no: '5561234567',
					},
				],
				error: null,
				count: 1,
			};
			builder.order = jest.fn().mockReturnValue(builder);
			builder.then = jest.fn((resolve) => resolve(orderResult));

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/subcontractors?query=Test');
			const response = await getSubcontractors(request);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.items).toHaveLength(1);
			expect(builder.or).toHaveBeenCalled();
		});
	});

	describe('POST /api/subcontractors', () => {
		it('should create a new subcontractor', async () => {
			const newSubcontractor = {
				id: 'sub-1',
				subcontractor_no: 'UE-2025-0001',
				company_name: 'Test AB',
				org_no: '5561234567',
				email: 'test@example.com',
				invoice_method: 'EMAIL',
				default_vat_rate: 25,
				f_tax: false,
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				is_archived: false,
			};

			const checkBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
			};

			const insertBuilder: any = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: newSubcontractor,
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: (table: string) => {
					if (table === 'subcontractors') {
						return {
							select: () => checkBuilder,
							insert: () => insertBuilder,
						} as any;
					}
					return {} as any;
				},
			} as any);

			const request = new NextRequest('http://localhost/api/subcontractors', {
				method: 'POST',
				body: JSON.stringify({
					company_name: 'Test AB',
					org_no: '5561234567',
					invoice_email: 'faktura@test.se',
					invoice_method: 'EMAIL',
					user_id: '550e8400-e29b-41d4-a716-446655440000',
				}),
			});

			const response = await createSubcontractor(request);
			const payload = await response.json();

			expect(response.status).toBe(201);
			expect(payload.company_name).toBe('Test AB');
		});

		it('should reject creation without admin/foreman role', async () => {
			mockedGetSession.mockResolvedValue({
				user: { id: 'user-1' },
				membership: { org_id: 'org-1', role: 'worker' },
			} as any);

			const request = new NextRequest('http://localhost/api/subcontractors', {
				method: 'POST',
				body: JSON.stringify({
					company_name: 'Test AB',
					org_no: '5561234567',
					user_id: '550e8400-e29b-41d4-a716-446655440000',
				}),
			});

			const response = await createSubcontractor(request);
			const payload = await response.json();

			expect(response.status).toBe(403);
			expect(payload.error).toContain('administratörer');
		});

		it('should reject duplicate org_no', async () => {
			const checkBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { id: 'existing-sub' },
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => ({
					select: () => checkBuilder,
				}),
			} as any);

			const request = new NextRequest('http://localhost/api/subcontractors', {
				method: 'POST',
				body: JSON.stringify({
					company_name: 'Test AB',
					org_no: '5561234567',
					invoice_email: 'faktura@test.se',
					user_id: '550e8400-e29b-41d4-a716-446655440000',
				}),
			});

			const response = await createSubcontractor(request);
			const payload = await response.json();

			expect(response.status).toBe(409);
			expect(payload.error).toContain('Organisationsnummer');
		});
	});

	describe('GET /api/subcontractors/[id]', () => {
		it('should return a single subcontractor', async () => {
			const subcontractor = {
				id: 'sub-1',
				subcontractor_no: 'UE-2025-0001',
				company_name: 'Test AB',
				org_no: '5561234567',
			};

			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: subcontractor,
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/subcontractors/sub-1');
			const response = await getSubcontractor(request, { params: Promise.resolve({ id: 'sub-1' }) });
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.company_name).toBe('Test AB');
		});

		it('should return 404 for non-existent subcontractor', async () => {
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: 'PGRST116' },
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/subcontractors/non-existent');
			const response = await getSubcontractor(request, {
				params: Promise.resolve({ id: 'non-existent' }),
			});
			const payload = await response.json();

			expect(response.status).toBe(404);
			expect(payload.error).toContain('hittades inte');
		});
	});

	describe('PUT /api/subcontractors/[id]', () => {
		it('should update a subcontractor', async () => {
			const existingSubcontractor = {
				id: 'sub-1',
				subcontractor_no: 'UE-2025-0001',
				company_name: 'Test AB',
				org_no: '5561234567',
				user_id: '550e8400-e29b-41d4-a716-446655440000',
				profiles: {
					id: '550e8400-e29b-41d4-a716-446655440000',
					full_name: 'Test User',
					email: 'test@example.com',
				},
			};

			const updatedSubcontractor = {
				...existingSubcontractor,
				company_name: 'Updated AB',
				profiles: {
					id: '550e8400-e29b-41d4-a716-446655440000',
					full_name: 'Test User',
					email: 'test@example.com',
				},
			};

			// Create builders for different calls
			const fetchBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: existingSubcontractor, error: null }),
			};

			const checkBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				neq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
			};

			const updateBuilder: any = {
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({ data: updatedSubcontractor, error: null }),
			};

			// Use an object to track call count (closure issue fix)
			const callTracker = { count: 0 };
			mockedCreateClient.mockResolvedValue({
				from: jest.fn((table: string) => {
					callTracker.count++;
					if (callTracker.count === 1) {
						// First call: fetch existing subcontractor
						return fetchBuilder;
					} else if (callTracker.count === 2) {
						// Second call: check for duplicate org_no
						return checkBuilder;
					} else if (callTracker.count === 3) {
						// Third call: check for duplicate user_id
						return checkBuilder;
					} else {
						// Fourth call: update subcontractor
						return updateBuilder;
					}
				}),
			} as any);

			const request = new NextRequest('http://localhost/api/subcontractors/sub-1', {
				method: 'PUT',
				body: JSON.stringify({
					company_name: 'Updated AB',
					org_no: '5561234567',
					invoice_email: 'faktura@test.se',
					user_id: '550e8400-e29b-41d4-a716-446655440000',
				}),
			});

			const response = await updateSubcontractor(request, {
				params: Promise.resolve({ id: 'sub-1' }),
			});
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.company_name).toBe('Updated AB');
		});
	});
});

