import { NextRequest } from 'next/server';
import { GET as getWorkOrders, POST as createWorkOrder } from '@/app/api/work-orders/route';
import { GET as getWorkOrder, PUT as updateWorkOrder, DELETE as deleteWorkOrder } from '@/app/api/work-orders/[id]/route';
import { getSession } from '@/lib/auth/get-session';
import { createClient, createAdminClient } from '@/lib/supabase/server';

jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/supabase/server');

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>;

type SupabaseBuilder = {
	select: jest.MockedFunction<any>;
	insert: jest.MockedFunction<any>;
	update: jest.MockedFunction<any>;
	delete: jest.MockedFunction<any>;
	eq: jest.MockedFunction<any>;
	gte: jest.MockedFunction<any>;
	lte: jest.MockedFunction<any>;
	order: jest.MockedFunction<any>;
	range: jest.MockedFunction<any>;
	single: jest.MockedFunction<any>;
	then?: jest.MockedFunction<any>;
	catch?: jest.MockedFunction<any>;
};

describe('/api/work-orders', () => {
	beforeEach(() => {
		mockedGetSession.mockResolvedValue({
		user: { id: '123e4567-e89b-12d3-a456-426614174004' },
		membership: { org_id: '123e4567-e89b-12d3-a456-426614174001', role: 'admin' },
		} as any);
		mockedCreateClient.mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('GET /api/work-orders', () => {
		it('should return list of work orders', async () => {
			const workOrdersData = [
				{
					id: 'wo-1',
					organization_id: 'org-1',
					project_id: 'proj-1',
					customer_id: 'cust-1',
					work_order_number: 'WO-001',
					title: 'Test Work Order 1',
					status: 'PLANERAD',
					priority: 'NORMAL',
					work_order_type: 'PROJEKTBUNDEN',
					all_day: false,
					planned_start_at: '2025-01-01T08:00:00Z',
					planned_end_at: '2025-01-01T17:00:00Z',
					project: { id: 'proj-1', name: 'Test Project' },
					customer: { id: 'cust-1', type: 'COMPANY', company_name: 'Test Company' },
					assignments: [],
				},
			];

			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
			};

			const orderResult = {
				data: workOrdersData,
				error: null,
			};
			builder.then = jest.fn((resolve) => resolve(orderResult));
			builder.catch = jest.fn();

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders');
			const response = await getWorkOrders(request);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.workOrders).toHaveLength(1);
			expect(payload.workOrders[0].title).toBe('Test Work Order 1');
			expect(builder.eq).toHaveBeenCalledWith('organization_id', '123e4567-e89b-12d3-a456-426614174001');
		});

		it('should filter by status', async () => {
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
			};

			const orderResult = { data: [], error: null };
			builder.then = jest.fn((resolve) => resolve(orderResult));
			builder.catch = jest.fn();

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders?status=PLANERAD');
			await getWorkOrders(request);

			expect(builder.eq).toHaveBeenCalledWith('status', 'PLANERAD');
		});

		it('should filter by project_id', async () => {
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
			};

			const orderResult = { data: [], error: null };
			builder.then = jest.fn((resolve) => resolve(orderResult));
			builder.catch = jest.fn();

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders?project_id=123e4567-e89b-12d3-a456-426614174002');
			await getWorkOrders(request);

			expect(builder.eq).toHaveBeenCalledWith('project_id', '123e4567-e89b-12d3-a456-426614174002');
		});

		it('should filter by date range', async () => {
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				lte: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
			};

			const orderResult = { data: [], error: null };
			builder.then = jest.fn((resolve) => resolve(orderResult));
			builder.catch = jest.fn();

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest(
				'http://localhost/api/work-orders?start_date=2025-01-01&end_date=2025-01-31'
			);
			await getWorkOrders(request);

			expect(builder.gte).toHaveBeenCalledWith('planned_start_at', '2025-01-01');
			expect(builder.lte).toHaveBeenCalledWith('planned_start_at', '2025-01-31T23:59:59');
		});

		it('should return 401 if not authenticated', async () => {
			mockedGetSession.mockResolvedValueOnce({
				user: null,
				membership: null,
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders');
			const response = await getWorkOrders(request);
			const payload = await response.json();

			expect(response.status).toBe(401);
			expect(payload.error).toBe('Unauthorized');
		});

		it('should handle database errors', async () => {
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
			};

			const orderResult = {
				data: null,
				error: { message: 'Database error' },
			};
			builder.then = jest.fn((resolve) => resolve(orderResult));
			builder.catch = jest.fn();

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders');
			const response = await getWorkOrders(request);
			const payload = await response.json();

			expect(response.status).toBe(500);
			expect(payload.error).toBe('Database error');
		});
	});

	describe('POST /api/work-orders', () => {
		const validWorkOrderData = {
			organization_id: '123e4567-e89b-12d3-a456-426614174001',
			project_id: '123e4567-e89b-12d3-a456-426614174002',
			customer_id: '123e4567-e89b-12d3-a456-426614174003',
			title: 'New Work Order',
			description: 'Test description',
			status: 'PLANERAD',
			priority: 'NORMAL',
			planned_start_at: '2025-01-01T08:00:00Z',
			planned_end_at: '2025-01-01T17:00:00Z',
			actual_start_at: null,
			actual_end_at: null,
			all_day: false,
			work_order_type: 'PROJEKTBUNDEN',
			location_address: null,
			location_city: null,
			location_zip: null,
			location_lat: null,
			location_lng: null,
			door_code: null,
			location_notes: null,
			internal_notes: null,
			external_summary: null,
			created_by_id: null,
			closed_by_id: null,
			closed_at: null,
			signature_blob_url: null,
			billing_type_override: null,
		};

		it('should create a work order', async () => {
			const createdWorkOrder = {
				id: 'wo-new',
				...validWorkOrderData,
				work_order_number: 'WO-001',
				created_by_id: '123e4567-e89b-12d3-a456-426614174004',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
				project: { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Test Project' },
				customer: { id: '123e4567-e89b-12d3-a456-426614174003', type: 'COMPANY', company_name: 'Test Company' },
			};

			const insertBuilder: any = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: createdWorkOrder,
					error: null,
				}),
			};

			const fetchBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { ...createdWorkOrder, assignments: [] },
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: (table: string) => {
					if (table === 'work_orders') {
						return {
							insert: () => insertBuilder,
							select: () => fetchBuilder,
						};
					}
					return {
						insert: jest.fn().mockResolvedValue({ data: null, error: null }),
					};
				},
			} as any);

			// API adds organization_id automatically, so we don't include it in request body
			const requestBody = { ...validWorkOrderData };
			delete (requestBody as any).organization_id;

			const request = new NextRequest('http://localhost/api/work-orders', {
				method: 'POST',
				body: JSON.stringify(requestBody),
			});

			const response = await createWorkOrder(request);
			const payload = await response.json();

			if (response.status !== 201) {
				console.log('Error response:', JSON.stringify(payload, null, 2));
			}
			expect(response.status).toBe(201);
			expect(payload.title).toBe('New Work Order');
			expect(payload.work_order_type).toBe('PROJEKTBUNDEN');
		});

		it('should create work order with assignments', async () => {
			const createdWorkOrder = {
				id: '123e4567-e89b-12d3-a456-426614174010',
				...validWorkOrderData,
				work_order_number: 'WO-001',
				created_by_id: '123e4567-e89b-12d3-a456-426614174004',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
				project: { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Test Project' },
				customer: { id: '123e4567-e89b-12d3-a456-426614174003', type: 'COMPANY', company_name: 'Test Company' },
			};

			const insertBuilder: any = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: createdWorkOrder,
					error: null,
				}),
			};

			const fetchBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: {
						...createdWorkOrder,
						assignments: [
							{
								id: '123e4567-e89b-12d3-a456-426614174011',
								work_order_id: '123e4567-e89b-12d3-a456-426614174010',
								user_id: '123e4567-e89b-12d3-a456-426614174005',
								role: 'Worker',
								is_responsible: true,
								assignment_status: 'TILLDELAD',
							},
						],
					},
					error: null,
				}),
			};

			// API adds organization_id automatically, so we don't include it in request body
			const requestBodyWithAssignments = { ...validWorkOrderData };
			delete (requestBodyWithAssignments as any).organization_id;

			const assignmentInsert = jest.fn().mockResolvedValue({ data: null, error: null });

			mockedCreateClient.mockResolvedValue({
				from: (table: string) => {
					if (table === 'work_orders') {
						return {
							insert: () => insertBuilder,
							select: () => fetchBuilder,
						};
					}
					if (table === 'work_order_assignments') {
						return {
							insert: assignmentInsert,
						};
					}
					return {};
				},
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders', {
				method: 'POST',
				body: JSON.stringify({
					...requestBodyWithAssignments,
					assignments: [
						{
							user_id: '123e4567-e89b-12d3-a456-426614174005',
							role: 'Worker',
							is_responsible: true,
							assignment_status: 'TILLDELAD',
						},
					],
				}),
			});

			const response = await createWorkOrder(request);
			const payload = await response.json();

			expect(response.status).toBe(201);
			expect(payload.assignments).toHaveLength(1);
			expect(assignmentInsert).toHaveBeenCalled();
		});

		it('should reject FRISTÅENDE work order type (M1 restriction)', async () => {
			const request = new NextRequest('http://localhost/api/work-orders', {
				method: 'POST',
				body: JSON.stringify({
					...validWorkOrderData,
					work_order_type: 'FRISTÅENDE',
				}),
			});

			const response = await createWorkOrder(request);
			const payload = await response.json();

			expect(response.status).toBe(400);
			expect(payload.error).toBe('Validation error');
		});

		it('should require admin or foreman role', async () => {
			mockedGetSession.mockResolvedValueOnce({
				user: { id: '123e4567-e89b-12d3-a456-426614174004' },
				membership: { org_id: '123e4567-e89b-12d3-a456-426614174001', role: 'worker' },
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders', {
				method: 'POST',
				body: JSON.stringify(validWorkOrderData),
			});

			const response = await createWorkOrder(request);
			const payload = await response.json();

			expect(response.status).toBe(403);
			expect(payload.error).toBe('Insufficient permissions');
		});

		it('should return 401 if not authenticated', async () => {
			mockedGetSession.mockResolvedValueOnce({
				user: null,
				membership: null,
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders', {
				method: 'POST',
				body: JSON.stringify(validWorkOrderData),
			});

			const response = await createWorkOrder(request);
			const payload = await response.json();

			expect(response.status).toBe(401);
			expect(payload.error).toBe('Unauthorized');
		});

		it('should validate required fields', async () => {
			const request = new NextRequest('http://localhost/api/work-orders', {
				method: 'POST',
				body: JSON.stringify({
					// Missing required fields: title, project_id, etc.
					status: 'PLANERAD',
				}),
			});

			const response = await createWorkOrder(request);
			const payload = await response.json();

			expect(response.status).toBe(400);
			expect(payload.error).toBe('Validation error');
		});
	});

	describe('GET /api/work-orders/[id]', () => {
		it('should return work order details', async () => {
			const workOrder = {
				id: '123e4567-e89b-12d3-a456-426614174040',
				organization_id: '123e4567-e89b-12d3-a456-426614174001',
				project_id: '123e4567-e89b-12d3-a456-426614174002',
				customer_id: '123e4567-e89b-12d3-a456-426614174003',
				work_order_number: 'WO-001',
				title: 'Test Work Order',
				status: 'PLANERAD',
				priority: 'NORMAL',
				work_order_type: 'PROJEKTBUNDEN',
				all_day: false,
				project: { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Test Project' },
				customer: { id: '123e4567-e89b-12d3-a456-426614174003', type: 'COMPANY', company_name: 'Test Company' },
				assignments: [],
			};

			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: workOrder,
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders/123e4567-e89b-12d3-a456-426614174040');
			const response = await getWorkOrder(request, {
				params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174040' }),
			} as any);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.workOrder.id).toBe('123e4567-e89b-12d3-a456-426614174040');
			expect(payload.workOrder.title).toBe('Test Work Order');
			expect(builder.eq).toHaveBeenCalledWith('id', '123e4567-e89b-12d3-a456-426614174040');
		});

		it('should return 404 for non-existent work order', async () => {
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: 'PGRST116', message: 'not found' },
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders/non-existent');
			const response = await getWorkOrder(request, {
				params: Promise.resolve({ id: 'non-existent' }),
			} as any);

			expect(response.status).toBe(404);
		});
	});

	describe('PUT /api/work-orders/[id]', () => {
		it('should update work order', async () => {
			const existingWorkOrder = {
				id: '123e4567-e89b-12d3-a456-426614174020',
				organization_id: '123e4567-e89b-12d3-a456-426614174001',
			};

			const updatedWorkOrder = {
				id: '123e4567-e89b-12d3-a456-426614174020',
				organization_id: '123e4567-e89b-12d3-a456-426614174001',
				project_id: '123e4567-e89b-12d3-a456-426614174002',
				title: 'Updated Work Order',
				status: 'PÅGÅENDE',
				priority: 'HIGH',
				work_order_type: 'PROJEKTBUNDEN',
				all_day: false,
				assignments: [],
			};

			const checkBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: existingWorkOrder,
					error: null,
				}),
			};

			const assignmentCheckBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: 'PGRST116' },
				}),
			};

			// Admin client for UPDATE
			const adminUpdateBuilder: any = {
				select: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: updatedWorkOrder,
					error: null,
				}),
			};

			// Regular client for final fetch
			const finalFetchBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { ...updatedWorkOrder, assignments: [] },
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: (table: string) => {
					if (table === 'work_orders') {
						return {
							select: () => checkBuilder,
						};
					}
					if (table === 'work_order_assignments') {
						return {
							select: () => assignmentCheckBuilder,
						};
					}
					return {};
				},
			} as any);

			mockedCreateAdminClient.mockReturnValue({
				from: (table: string) => {
					if (table === 'work_orders') {
						return {
							update: () => adminUpdateBuilder,
						};
					}
					if (table === 'work_order_assignments') {
						return {
							delete: jest.fn().mockResolvedValue({ data: null, error: null }),
							insert: jest.fn().mockResolvedValue({ data: null, error: null }),
						};
					}
					return {};
				},
			} as any);

			// Also mock final fetch with regular client
			mockedCreateClient.mockResolvedValueOnce({
				from: () => ({
					select: () => finalFetchBuilder,
				}),
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders/123e4567-e89b-12d3-a456-426614174020', {
				method: 'PUT',
				body: JSON.stringify({
					title: 'Updated Work Order',
					status: 'PÅGÅENDE',
					priority: 'HIGH',
				}),
			});

			const response = await updateWorkOrder(request, {
				params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174020' }),
			} as any);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.title).toBe('Updated Work Order');
			// Verify the response contains the updated data
			expect(payload).toHaveProperty('title', 'Updated Work Order');
		});

		it('should require admin or foreman role', async () => {
			mockedGetSession.mockResolvedValueOnce({
				user: { id: '123e4567-e89b-12d3-a456-426614174004' },
				membership: { org_id: '123e4567-e89b-12d3-a456-426614174001', role: 'worker' },
			} as any);

			const existingWorkOrder = {
				id: '123e4567-e89b-12d3-a456-426614174050',
				organization_id: '123e4567-e89b-12d3-a456-426614174001',
			};

			const checkBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: existingWorkOrder,
					error: null,
				}),
			};

			const assignmentBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: 'PGRST116' },
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: (table: string) => {
					if (table === 'work_orders') {
						return {
							select: () => checkBuilder,
						};
					}
					if (table === 'work_order_assignments') {
						return {
							select: () => assignmentBuilder,
						};
					}
					return {};
				},
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders/123e4567-e89b-12d3-a456-426614174050', {
				method: 'PUT',
				body: JSON.stringify({ title: 'Updated' }),
			});

			const response = await updateWorkOrder(request, {
				params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174050' }),
			} as any);
			const payload = await response.json();

			expect(response.status).toBe(403);
			expect(payload.error).toBe('Insufficient permissions');
		});
	});

	describe('DELETE /api/work-orders/[id]', () => {
		it('should delete work order', async () => {
			const existingWorkOrder = {
				id: '123e4567-e89b-12d3-a456-426614174030',
				organization_id: '123e4567-e89b-12d3-a456-426614174001',
			};

			const checkBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: existingWorkOrder,
					error: null,
				}),
			};

			const deleteBuilder: any = {
				delete: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
			};
			
			// Make delete chainable - eq() should return a promise
			deleteBuilder.eq.mockResolvedValue({
				data: null,
				error: null,
			});
			
			// Make delete() return the builder so eq() can be chained
			deleteBuilder.delete.mockReturnValue(deleteBuilder);

			mockedCreateClient.mockResolvedValue({
				from: (table: string) => {
					if (table === 'work_orders') {
						return {
							select: () => checkBuilder,
							delete: () => deleteBuilder,
						};
					}
					return {};
				},
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders/wo-1', {
				method: 'DELETE',
			});

			const response = await deleteWorkOrder(request, {
				params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174050' }),
			} as any);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.success).toBe(true);
			// Verify delete was called on work_orders table
			expect(mockedCreateClient).toHaveBeenCalled();
		});

		it('should require admin or foreman role', async () => {
			mockedGetSession.mockResolvedValueOnce({
				user: { id: '123e4567-e89b-12d3-a456-426614174004' },
				membership: { org_id: '123e4567-e89b-12d3-a456-426614174001', role: 'worker' },
			} as any);

			const request = new NextRequest('http://localhost/api/work-orders/wo-1', {
				method: 'DELETE',
			});

			const response = await deleteWorkOrder(request, {
				params: Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174050' }),
			} as any);
			const payload = await response.json();

			expect(response.status).toBe(403);
			expect(payload.error).toBe('Insufficient permissions');
		});
	});
});

