import { NextRequest } from 'next/server';
import { POST as createCustomer } from '@/app/api/customers/route';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/supabase/server');

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('POST /api/customers', () => {
	const mockUser = {
		id: '123e4567-e89b-12d3-a456-426614174004',
		email: 'test@example.com',
	};

	const mockMembership = {
		org_id: '123e4567-e89b-12d3-a456-426614174001',
		role: 'admin' as const,
	};

	beforeEach(() => {
		mockedGetSession.mockResolvedValue({
			user: mockUser,
			membership: mockMembership,
		} as any);
		mockedCreateClient.mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should create a COMPANY customer successfully', async () => {
		const companyPayload = {
			type: 'COMPANY',
			company_name: 'Test Company AB',
			org_no: '5561234567',
			invoice_email: 'invoice@testcompany.se',
			phone_mobile: '0701234567',
		};

		const createdCustomer = {
			id: 'cust-123',
			customer_no: 'C001',
			type: 'COMPANY',
			company_name: 'Test Company AB',
			org_no: '5561234567',
			invoice_email: 'invoice@testcompany.se',
			phone_mobile: '0701234567',
			org_id: mockMembership.org_id,
			created_by: mockUser.id,
			is_archived: false,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
		};

		const builder: any = {
			insert: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: createdCustomer,
				error: null,
			}),
		};

		mockedCreateClient.mockResolvedValue({
			from: () => builder,
		} as any);

		const request = new NextRequest('http://localhost/api/customers', {
			method: 'POST',
			body: JSON.stringify(companyPayload),
		});

		const response = await createCustomer(request);
		const payload = await response.json();

		expect(response.status).toBe(201);
		expect(payload.id).toBe('cust-123');
		expect(payload.type).toBe('COMPANY');
		expect(payload.company_name).toBe('Test Company AB');
	});

	it('should create a PRIVATE customer successfully', async () => {
		const privatePayload = {
			type: 'PRIVATE',
			first_name: 'John',
			last_name: 'Doe',
			personal_identity_no: '198001011234',
			invoice_email: 'john@example.com',
			invoice_address_street: 'Testgatan 1',
			invoice_address_zip: '12345',
			invoice_address_city: 'Stockholm',
			phone_mobile: '0701234567',
		};

		const createdCustomer = {
			id: 'cust-456',
			customer_no: 'C002',
			type: 'PRIVATE',
			first_name: 'John',
			last_name: 'Doe',
			personal_identity_no: '198001011234',
			invoice_email: 'john@example.com',
			invoice_address_street: 'Testgatan 1',
			invoice_address_zip: '12345',
			invoice_address_city: 'Stockholm',
			phone_mobile: '0701234567',
			org_id: mockMembership.org_id,
			created_by: mockUser.id,
			is_archived: false,
			created_at: '2025-01-01T00:00:00Z',
			updated_at: '2025-01-01T00:00:00Z',
		};

		const builder: any = {
			insert: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: createdCustomer,
				error: null,
			}),
		};

		mockedCreateClient.mockResolvedValue({
			from: () => builder,
		} as any);

		const request = new NextRequest('http://localhost/api/customers', {
			method: 'POST',
			body: JSON.stringify(privatePayload),
		});

		const response = await createCustomer(request);
		const payload = await response.json();

		expect(response.status).toBe(201);
		expect(payload.type).toBe('PRIVATE');
		expect(payload.first_name).toBe('John');
		expect(payload.last_name).toBe('Doe');
	});

	it('should return 401 when user is not authenticated', async () => {
		mockedGetSession.mockResolvedValue({
			user: null,
			membership: null,
		} as any);

		const request = new NextRequest('http://localhost/api/customers', {
			method: 'POST',
			body: JSON.stringify({
				type: 'COMPANY',
				company_name: 'Test Company',
			}),
		});

		const response = await createCustomer(request);
		const payload = await response.json();

		expect(response.status).toBe(401);
		expect(payload.error).toBe('Unauthorized');
	});

	it('should return 422 for invalid payload (missing required fields)', async () => {
		const invalidPayload = {
			type: 'COMPANY',
			// Missing company_name and org_no
		};

		const request = new NextRequest('http://localhost/api/customers', {
			method: 'POST',
			body: JSON.stringify(invalidPayload),
		});

		const response = await createCustomer(request);
		const payload = await response.json();

		expect(response.status).toBe(422);
		expect(payload.error).toContain('Invalid input');
		expect(payload.details).toBeDefined();
	});

	it('should return 409 for duplicate customer_no', async () => {
		const payload = {
			type: 'COMPANY',
			company_name: 'Test Company',
			org_no: '5561234567',
			customer_no: 'C001',
			invoice_email: 'test@example.com',
			invoice_method: 'EMAIL' as const,
		};

		const builder: any = {
			insert: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: null,
				error: { code: '23505', message: 'duplicate key value violates unique constraint' },
			}),
		};

		mockedCreateClient.mockResolvedValue({
			from: () => builder,
		} as any);

		const request = new NextRequest('http://localhost/api/customers', {
			method: 'POST',
			body: JSON.stringify(payload),
		});

		const response = await createCustomer(request);
		const responsePayload = await response.json();

		expect(response.status).toBe(409);
		expect(responsePayload.error).toContain('Kundnummer används redan');
	});

	it('should handle database errors', async () => {
		const payload = {
			type: 'COMPANY',
			company_name: 'Test Company',
			org_no: '5561234567',
			invoice_email: 'test@example.com',
			invoice_method: 'EMAIL' as const,
		};

		const builder: any = {
			insert: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: null,
				error: { message: 'Database connection failed' },
			}),
		};

		mockedCreateClient.mockResolvedValue({
			from: () => builder,
		} as any);

		const request = new NextRequest('http://localhost/api/customers', {
			method: 'POST',
			body: JSON.stringify(payload),
		});

		const response = await createCustomer(request);
		const responsePayload = await response.json();

		expect(response.status).toBe(500);
		expect(responsePayload.error).toBe('Database connection failed');
	});
});

