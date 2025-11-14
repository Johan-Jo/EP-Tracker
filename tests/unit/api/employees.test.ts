import { NextRequest } from 'next/server';
import { GET as getEmployees, POST as createEmployee } from '@/app/api/employees/route';
import { GET as getEmployee, PUT as updateEmployee } from '@/app/api/employees/[id]/route';
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
	then?: jest.MockedFunction<any>;
	catch?: jest.MockedFunction<any>;
};

describe('/api/employees', () => {
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

	describe('GET /api/employees', () => {
		it('should return paginated employees list', async () => {
			const employeesData = [
				{
					id: 'emp-1',
					employee_no: 'E-001',
					first_name: 'Anna',
					last_name: 'Andersson',
					email: 'anna@example.com',
					is_archived: false,
				},
				{
					id: 'emp-2',
					employee_no: 'E-002',
					first_name: 'Erik',
					last_name: 'Eriksson',
					email: 'erik@example.com',
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
				data: employeesData,
				error: null,
				count: 2,
			};
			builder.order = jest.fn().mockReturnValue(builder);
			builder.then = jest.fn((resolve) => resolve(orderResult));
			builder.catch = jest.fn();

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/employees?page=1&pageSize=25');
			const response = await getEmployees(request);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.items).toHaveLength(2);
			expect(payload.page).toBe(1);
			expect(payload.pageSize).toBe(25);
			expect(payload.total).toBe(2);
			expect(builder.eq).toHaveBeenCalledWith('org_id', 'org-1');
			expect(builder.eq).toHaveBeenCalledWith('is_archived', false);
		});

		it('should search employees by query', async () => {
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
			};
			
			const orderResult = { data: [], error: null, count: 0 };
			builder.order = jest.fn().mockReturnValue(builder);
			builder.then = jest.fn((resolve) => resolve(orderResult));
			builder.catch = jest.fn();

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/employees?query=Anna');
			await getEmployees(request);

			expect(builder.or).toHaveBeenCalled();
		});

		it('should include archived employees when requested', async () => {
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
			};
			
			const orderResult = { data: [], error: null, count: 0 };
			builder.order = jest.fn().mockReturnValue(builder);
			builder.then = jest.fn((resolve) => resolve(orderResult));
			builder.catch = jest.fn();

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/employees?includeArchived=true');
			await getEmployees(request);

			expect(builder.eq).not.toHaveBeenCalledWith('is_archived', false);
		});
	});

	describe('POST /api/employees', () => {
		it('should create an employee', async () => {
			const newEmployee = {
				id: 'emp-new',
				employee_no: 'E-NEW',
				first_name: 'New',
				last_name: 'Employee',
				email: 'new@example.com',
				org_id: 'org-1',
				created_by: 'user-1',
				updated_by: 'user-1',
			};

			const builder: SupabaseBuilder = {
				select: jest.fn().mockReturnThis(),
				insert: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: newEmployee,
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/employees', {
				method: 'POST',
				body: JSON.stringify({
					first_name: 'New',
					last_name: 'Employee',
					email: 'new@example.com',
				}),
			});

			const response = await createEmployee(request);
			const payload = await response.json();

			expect(response.status).toBe(201);
			expect(payload.first_name).toBe('New');
			expect(payload.last_name).toBe('Employee');
		});

		it('should reject invalid employee data', async () => {
			const request = new NextRequest('http://localhost/api/employees', {
				method: 'POST',
				body: JSON.stringify({
					// Missing required fields: first_name, last_name
				}),
			});

			const response = await createEmployee(request);
			const payload = await response.json();

			expect(response.status).toBe(422);
			expect(payload.error).toBeDefined();
		});

		it('should handle duplicate employee number', async () => {
			// Mock for duplicate check
			const duplicateCheckBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { id: 'existing-emp' },
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => duplicateCheckBuilder,
			} as any);

			const request = new NextRequest('http://localhost/api/employees', {
				method: 'POST',
				body: JSON.stringify({
					first_name: 'Test',
					last_name: 'Employee',
					employee_no: 'E-EXISTING',
				}),
			});

			const response = await createEmployee(request);
			const payload = await response.json();

			expect(response.status).toBe(409);
			expect(payload.error).toContain('Personalnummer');
		});

		it('should reject if user is not admin or foreman', async () => {
			mockedGetSession.mockResolvedValueOnce({
				user: { id: 'user-1' },
				membership: { org_id: 'org-1', role: 'worker' },
			} as any);

			const request = new NextRequest('http://localhost/api/employees', {
				method: 'POST',
				body: JSON.stringify({
					first_name: 'Test',
					last_name: 'Employee',
				}),
			});

			const response = await createEmployee(request);
			const payload = await response.json();

			expect(response.status).toBe(403);
			expect(payload.error).toContain('administratörer och arbetsledare');
		});
	});

	describe('GET /api/employees/[id]', () => {
		it('should return employee details', async () => {
			const employee = {
				id: 'emp-1',
				employee_no: 'E-001',
				first_name: 'Anna',
				last_name: 'Andersson',
				email: 'anna@example.com',
			};

			const builder: SupabaseBuilder = {
				select: jest.fn().mockReturnThis(),
				insert: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: employee,
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/employees/emp-1');
			const response = await getEmployee(request, { params: Promise.resolve({ id: 'emp-1' }) } as any);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.id).toBe('emp-1');
			expect(payload.first_name).toBe('Anna');
		});

		it('should return 404 for non-existent employee', async () => {
			const builder: SupabaseBuilder = {
				select: jest.fn().mockReturnThis(),
				insert: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: 'PGRST116', message: 'not found' },
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/employees/non-existent');
			const response = await getEmployee(request, { params: Promise.resolve({ id: 'non-existent' }) } as any);

			expect(response.status).toBe(404);
		});
	});

	describe('PUT /api/employees/[id]', () => {
		it('should update employee', async () => {
			const updatedEmployee = {
				id: 'emp-1',
				employee_no: 'E-001',
				first_name: 'Updated',
				last_name: 'Employee',
				updated_by: 'user-1',
			};

			const builder: any = {
				select: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn()
					.mockResolvedValueOnce({ data: updatedEmployee, error: null }) // Existing employee
					.mockResolvedValueOnce({ data: updatedEmployee, error: null }), // Updated employee
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/employees/emp-1', {
				method: 'PUT',
				body: JSON.stringify({
					first_name: 'Updated',
					last_name: 'Employee',
				}),
			});

			const response = await updateEmployee(request, { params: Promise.resolve({ id: 'emp-1' }) } as any);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.first_name).toBe('Updated');
		});

		it('should reject if user is not admin or foreman', async () => {
			mockedGetSession.mockResolvedValueOnce({
				user: { id: 'user-1' },
				membership: { org_id: 'org-1', role: 'worker' },
			} as any);

			const request = new NextRequest('http://localhost/api/employees/emp-1', {
				method: 'PUT',
				body: JSON.stringify({
					first_name: 'Updated',
					last_name: 'Employee',
				}),
			});

			const response = await updateEmployee(request, { params: Promise.resolve({ id: 'emp-1' }) } as any);
			const payload = await response.json();

			expect(response.status).toBe(403);
			expect(payload.error).toContain('administratörer och arbetsledare');
		});
	});
});

