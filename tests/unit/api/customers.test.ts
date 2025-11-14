import { NextRequest } from 'next/server';
import { GET as getCustomers, POST as createCustomer } from '@/app/api/customers/route';
import { GET as getCustomer, PUT as updateCustomer } from '@/app/api/customers/[id]/route';
import { POST as mergeCustomer } from '@/app/api/customers/[id]/merge/route';
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
	eq: jest.MockedFunction<any>;
	or: jest.MockedFunction<any>;
	range: jest.MockedFunction<any>;
	order: jest.MockedFunction<any>;
	single: jest.MockedFunction<any>;
	then?: jest.MockedFunction<any>;
	catch?: jest.MockedFunction<any>;
};

describe('/api/customers', () => {
	beforeEach(() => {
		mockedGetSession.mockResolvedValue({
			user: { id: 'user-1' },
			membership: { org_id: 'org-1', role: 'admin' },
		} as any);
		mockedCreateClient.mockReset();
		mockedCreateAdminClient.mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('GET /api/customers', () => {
		it('should return paginated customers list', async () => {
			const customersData = [
				{
					id: 'cust-1',
					customer_no: 'C-001',
					type: 'COMPANY',
					company_name: 'Test AB',
					org_no: '5560160680',
					is_archived: false,
				},
				{
					id: 'cust-2',
					customer_no: 'C-002',
					type: 'PRIVATE',
					first_name: 'Anna',
					last_name: 'Andersson',
					personal_identity_no: '199001011234',
					is_archived: false,
				},
			];

			// Create a chainable builder - order() returns builder that can be chained further
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				range: jest.fn().mockReturnThis(),
				or: jest.fn().mockReturnThis(),
			};
			
			// order() returns builder that can be chained, but when awaited returns Promise
			const orderResult = {
				data: customersData,
				error: null,
				count: 2,
			};
			builder.order = jest.fn().mockReturnValue(builder);
			// Make builder awaitable (thenable)
			builder.then = jest.fn((resolve) => resolve(orderResult));
			builder.catch = jest.fn();

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/customers?page=1&pageSize=25');
			const response = await getCustomers(request);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.items).toHaveLength(2);
			expect(payload.page).toBe(1);
			expect(payload.pageSize).toBe(25);
			expect(payload.total).toBe(2);
			expect(builder.eq).toHaveBeenCalledWith('org_id', 'org-1');
			expect(builder.eq).toHaveBeenCalledWith('is_archived', false);
		});

		it('should filter by customer type', async () => {
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

			const request = new NextRequest('http://localhost/api/customers?type=COMPANY');
			await getCustomers(request);

			expect(builder.eq).toHaveBeenCalledWith('type', 'COMPANY');
		});

		it('should search customers by query', async () => {
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

			const request = new NextRequest('http://localhost/api/customers?query=Test');
			await getCustomers(request);

			expect(builder.or).toHaveBeenCalled();
		});

		it('should include archived customers when requested', async () => {
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

			const request = new NextRequest('http://localhost/api/customers?includeArchived=true');
			await getCustomers(request);

			expect(builder.eq).not.toHaveBeenCalledWith('is_archived', false);
		});
	});

	describe('POST /api/customers', () => {
		it('should create a company customer', async () => {
			const newCustomer = {
				id: 'cust-new',
				customer_no: 'C-NEW',
				type: 'COMPANY',
				company_name: 'New Company AB',
				org_no: '5560160680',
				invoice_email: 'invoice@newcompany.com',
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
					data: newCustomer,
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/customers', {
				method: 'POST',
				body: JSON.stringify({
					type: 'COMPANY',
					company_name: 'New Company AB',
					org_no: '556016-0680',
					invoice_email: 'invoice@newcompany.com',
				}),
			});

			const response = await createCustomer(request);
			const payload = await response.json();

			expect(response.status).toBe(201);
			expect(payload.id).toBe('cust-new');
			expect(payload.company_name).toBe('New Company AB');
			expect(builder.insert).toHaveBeenCalled();
		});

		it('should create a private customer', async () => {
			const newCustomer = {
				id: 'cust-private',
				customer_no: 'C-PRIVATE',
				type: 'PRIVATE',
				first_name: 'Anna',
				last_name: 'Andersson',
				personal_identity_no: '199001011234',
				invoice_email: 'anna@example.com',
				invoice_address_street: 'Testgatan 1',
				invoice_address_zip: '12345',
				invoice_address_city: 'Stockholm',
				invoice_address_country: 'SE',
				invoice_method: 'EMAIL',
				default_vat_rate: 25,
				rot_enabled: false,
				f_tax: false,
				org_id: 'org-1',
				created_by: 'user-1',
				updated_by: 'user-1',
			};

			const builder: any = {
				select: jest.fn().mockReturnThis(),
				insert: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: newCustomer,
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/customers', {
				method: 'POST',
				body: JSON.stringify({
					type: 'PRIVATE',
					first_name: 'Anna',
					last_name: 'Andersson',
					personal_identity_no: '900101-0017', // Valid Swedish personal number (1990-01-01) - passes Luhn check
					invoice_email: 'anna@example.com',
					invoice_address_street: 'Testgatan 1',
					invoice_address_zip: '12345',
					invoice_address_city: 'Stockholm',
					invoice_address_country: 'Sverige',
				}),
			});

			const response = await createCustomer(request);
			const payload = await response.json();

			expect(response.status).toBe(201);
			expect(payload.type).toBe('PRIVATE');
			expect(payload.first_name).toBe('Anna');
		});

		it('should reject invalid customer data', async () => {
			// The actual parseCustomerPayload will throw ZodError for invalid data
			// We don't need to mock it - it will naturally fail validation
			const request = new NextRequest('http://localhost/api/customers', {
				method: 'POST',
				body: JSON.stringify({
					type: 'COMPANY',
					// Missing required fields: company_name, org_no, invoice_email
				}),
			});

			const response = await createCustomer(request);
			const payload = await response.json();

			expect(response.status).toBe(422);
			expect(payload.error).toBeDefined();
		});

		it('should handle duplicate customer number', async () => {
			const builder: any = {
				select: jest.fn().mockReturnThis(),
				insert: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: '23505', message: 'duplicate key' },
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/customers', {
				method: 'POST',
				body: JSON.stringify({
					type: 'COMPANY',
					company_name: 'Test AB',
					org_no: '5560160680',
					customer_no: 'C-EXISTING',
					invoice_email: 'test@example.com',
				}),
			});

			const response = await createCustomer(request);
			const payload = await response.json();

			expect(response.status).toBe(409);
			expect(payload.error).toContain('Kundnummer');
		});
	});

	describe('GET /api/customers/[id]', () => {
		it('should return customer details', async () => {
			const customer = {
				id: 'cust-1',
				customer_no: 'C-001',
				type: 'COMPANY',
				company_name: 'Test AB',
				org_no: '5560160680',
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
					data: customer,
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/customers/cust-1');
			const response = await getCustomer(request, { params: Promise.resolve({ id: 'cust-1' }) } as any);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.id).toBe('cust-1');
			expect(payload.company_name).toBe('Test AB');
		});

		it('should return 404 for non-existent customer', async () => {
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

			const request = new NextRequest('http://localhost/api/customers/non-existent');
			const response = await getCustomer(request, { params: Promise.resolve({ id: 'non-existent' }) } as any);

			expect(response.status).toBe(404);
		});
	});

	describe('PUT /api/customers/[id]', () => {
		it('should update customer', async () => {
			const updatedCustomer = {
				id: 'cust-1',
				customer_no: 'C-001',
				type: 'COMPANY',
				company_name: 'Updated Company AB',
				org_no: '5560160680',
				updated_by: 'user-1',
			};

			const builder: any = {
				select: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: updatedCustomer,
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/customers/cust-1', {
				method: 'PUT',
				body: JSON.stringify({
					type: 'COMPANY',
					company_name: 'Updated Company AB',
					org_no: '5560160680',
					invoice_email: 'updated@example.com',
				}),
			});

			const response = await updateCustomer(request, { params: Promise.resolve({ id: 'cust-1' }) } as any);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.company_name).toBe('Updated Company AB');
			expect(builder.update).toHaveBeenCalled();
		});
	});

	describe('POST /api/customers/[id]/merge', () => {
		it('should merge two customers', async () => {
			// Use complete customer objects that match the Customer type
			// Required fields for COMPANY must be present (not null)
			const targetCustomer: any = {
				id: 'cust-target',
				customer_no: 'C-TARGET',
				type: 'COMPANY',
				company_name: 'Target Company', // Required for COMPANY
				org_id: 'org-1',
				org_no: '5560160680', // Required for COMPANY
				invoice_email: 'target@example.com', // Required for COMPANY
				invoice_method: 'EMAIL',
				default_vat_rate: 25,
				rot_enabled: false,
				f_tax: false,
				vat_no: null,
				contact_person_name: null,
				contact_person_phone: null,
				first_name: null,
				last_name: null,
				personal_identity_no: null,
				property_designation: null,
				housing_assoc_org_no: null,
				apartment_no: null,
				ownership_share: null,
				rot_consent_at: null,
				peppol_id: null,
				gln: null,
				terms: null,
				bankgiro: null,
				plusgiro: null,
				reference: null,
				invoice_address_street: null,
				invoice_address_zip: null,
				invoice_address_city: null,
				invoice_address_country: null,
				delivery_address_street: null,
				delivery_address_zip: null,
				delivery_address_city: null,
				delivery_address_country: null,
				phone_mobile: null,
				notes: null,
				is_archived: false,
				created_by: 'user-1',
				updated_by: 'user-1',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			const duplicateCustomer: any = {
				id: 'cust-duplicate',
				customer_no: 'C-DUPLICATE',
				type: 'COMPANY',
				company_name: 'Duplicate Company', // Required for COMPANY
				org_id: 'org-1',
				org_no: '5560160680', // Required for COMPANY
				invoice_email: 'duplicate@example.com', // Required for COMPANY
				invoice_method: 'EMAIL',
				default_vat_rate: 25,
				rot_enabled: false,
				f_tax: false,
				vat_no: null,
				contact_person_name: null,
				contact_person_phone: null,
				first_name: null,
				last_name: null,
				personal_identity_no: null,
				property_designation: null,
				housing_assoc_org_no: null,
				apartment_no: null,
				ownership_share: null,
				rot_consent_at: null,
				peppol_id: null,
				gln: null,
				terms: null,
				bankgiro: null,
				plusgiro: null,
				reference: null,
				invoice_address_street: null,
				invoice_address_zip: null,
				invoice_address_city: null,
				invoice_address_country: null,
				delivery_address_street: null,
				delivery_address_zip: null,
				delivery_address_city: null,
				delivery_address_country: null,
				phone_mobile: null,
				notes: null,
				is_archived: false,
				created_by: 'user-1',
				updated_by: 'user-1',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			const mergedCustomer = {
				...targetCustomer,
				company_name: 'Merged Company',
			};

			const projectsBuilder: any = {
				update: jest.fn().mockResolvedValue({ data: null, error: null }),
				eq: jest.fn().mockReturnThis(),
			};

			const customersBuilder: any = {
				select: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn()
					.mockResolvedValueOnce({ data: targetCustomer, error: null })
					.mockResolvedValueOnce({ data: duplicateCustomer, error: null })
					.mockResolvedValueOnce({ data: mergedCustomer, error: null }),
			};

			const relationsBuilder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { project_count: 2, contact_count: 1, invoice_basis_count: 0 },
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: (table: string) => {
					if (table === 'customers') return customersBuilder;
					if (table === 'customer_merge_relations') return relationsBuilder;
					return projectsBuilder;
				},
			} as any);

			mockedCreateAdminClient.mockResolvedValue({
				from: () => projectsBuilder,
			} as any);

			const request = new NextRequest('http://localhost/api/customers/cust-target/merge', {
				method: 'POST',
				body: JSON.stringify({
					duplicateId: 'cust-duplicate',
					overrides: {
						company_name: 'Merged Company',
					},
				}),
			});

			const response = await mergeCustomer(request, { params: Promise.resolve({ id: 'cust-target' }) } as any);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.customer.id).toBe('cust-target');
			expect(payload.customer.company_name).toBe('Merged Company');
		});

		it('should reject merge if user is not admin', async () => {
			mockedGetSession.mockResolvedValueOnce({
				user: { id: 'user-1' },
				membership: { org_id: 'org-1', role: 'foreman' },
			} as any);

			const request = new NextRequest('http://localhost/api/customers/cust-1/merge', {
				method: 'POST',
				body: JSON.stringify({
					duplicateId: 'cust-2',
				}),
			});

			const response = await mergeCustomer(request, { params: Promise.resolve({ id: 'cust-1' }) } as any);
			const payload = await response.json();

			expect(response.status).toBe(403);
			expect(payload.error).toContain('administratörer');
		});
	});
});

