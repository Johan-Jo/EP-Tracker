import { NextRequest } from 'next/server';
import { GET as getConnection } from '@/app/api/integrations/fortnox/connection/route';
import { GET as getCustomers } from '@/app/api/integrations/fortnox/customers/route';
import { POST as importCustomers } from '@/app/api/integrations/fortnox/customers/import/route';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import {
	getFortnoxConnectionForOrg,
	getFortnoxCustomers,
} from '@/lib/integrations/fortnox/client';

jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/integrations/fortnox/client');

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedGetFortnoxConnectionForOrg = getFortnoxConnectionForOrg as jest.MockedFunction<
	typeof getFortnoxConnectionForOrg
>;
const mockedGetFortnoxCustomers = getFortnoxCustomers as jest.MockedFunction<
	typeof getFortnoxCustomers
>;

describe('/api/integrations/fortnox', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedGetSession.mockResolvedValue({
			user: { id: 'user-1' },
			membership: { org_id: 'org-1', role: 'admin' },
		} as any);
	});

	describe('GET /api/integrations/fortnox/connection', () => {
		it('should return connection status when connection exists', async () => {
			const connection = {
				id: 'conn-1',
				org_id: 'org-1',
				access_token: 'token',
				refresh_token: 'refresh',
				access_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
				scopes: 'companyinformation invoice',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: connection,
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/connection?orgId=org-1');
			const response = await getConnection(request);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.connection).toBeDefined();
			expect(payload.connection.id).toBe('conn-1');
			// Sensitive tokens should not be returned
			expect(payload.connection.access_token).toBeUndefined();
			expect(payload.connection.refresh_token).toBeUndefined();
		});

		it('should return null connection when no connection exists', async () => {
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

			const request = new NextRequest('http://localhost/api/integrations/fortnox/connection?orgId=org-1');
			const response = await getConnection(request);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.connection).toBeNull();
		});

		it('should reject unauthorized users', async () => {
			mockedGetSession.mockResolvedValue({
				user: null,
				membership: null,
			} as any);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/connection?orgId=org-1');
			const response = await getConnection(request);

			expect(response.status).toBe(401);
		});

		it('should reject users without proper role', async () => {
			mockedGetSession.mockResolvedValue({
				user: { id: 'user-1' },
				membership: { org_id: 'org-1', role: 'worker' },
			} as any);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/connection?orgId=org-1');
			const response = await getConnection(request);

			expect(response.status).toBe(403);
		});
	});

	describe('GET /api/integrations/fortnox/customers', () => {
		it('should fetch customers from Fortnox', async () => {
			const mockConnection = {
				id: 'conn-1',
				org_id: 'org-1',
				access_token: 'token',
				refresh_token: 'refresh',
				access_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
			};

			const mockCustomers = [
				{
					CustomerNumber: '1001',
					Name: 'Test AB',
					Email: 'test@example.com',
					Type: 'COMPANY',
					Active: true,
				},
			];

			mockedGetFortnoxConnectionForOrg.mockResolvedValue(mockConnection as any);
			mockedGetFortnoxCustomers.mockResolvedValue(mockCustomers as any);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/customers?limit=100');
			const response = await getCustomers(request);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.customers).toHaveLength(1);
			expect(payload.customers[0].CustomerNumber).toBe('1001');
			expect(mockedGetFortnoxCustomers).toHaveBeenCalledWith(mockConnection, 100);
		});

		it('should return 404 when no connection exists', async () => {
			mockedGetFortnoxConnectionForOrg.mockResolvedValue(null);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/customers');
			const response = await getCustomers(request);
			const payload = await response.json();

			expect(response.status).toBe(404);
			expect(payload.error).toContain('connection not found');
		});

		it('should reject non-admin/finance users', async () => {
			mockedGetSession.mockResolvedValue({
				user: { id: 'user-1' },
				membership: { org_id: 'org-1', role: 'worker' },
			} as any);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/customers');
			const response = await getCustomers(request);

			expect(response.status).toBe(403);
		});
	});

	describe('POST /api/integrations/fortnox/customers/import', () => {
		it('should import selected customers', async () => {
			const mockConnection = {
				id: 'conn-1',
				org_id: 'org-1',
				access_token: 'token',
				refresh_token: 'refresh',
				access_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
			};

			const mockCustomers = [
				{
					CustomerNumber: '1001',
					Name: 'Test AB',
					Email: 'test@example.com',
					EmailInvoice: 'invoice@test.se',
					OrganisationNumber: '5560160680',
					Type: 'COMPANY',
					Active: true,
				},
			];

			mockedGetFortnoxConnectionForOrg.mockResolvedValue(mockConnection as any);
			mockedGetFortnoxCustomers.mockResolvedValue(mockCustomers as any);

			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn()
					.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // No existing by fortnox_customer_number
					.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }), // No existing by customer_no
				single: jest.fn()
					.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
					.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }),
				insert: jest.fn().mockResolvedValue({ data: [{ id: 'customer-1' }], error: null }),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/customers/import', {
				method: 'POST',
				body: JSON.stringify({
					customerNumbers: ['1001'],
				}),
			});

			const response = await importCustomers(request);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.success).toBe(true);
			expect(payload.results.imported).toBe(1);
			expect(payload.results.skipped).toBe(0);
		});

		it('should skip existing customers', async () => {
			const mockConnection = {
				id: 'conn-1',
				org_id: 'org-1',
				access_token: 'token',
				refresh_token: 'refresh',
				access_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
			};

			const mockCustomers = [
				{
					CustomerNumber: '1001',
					Name: 'Test AB',
					Email: 'test@example.com',
					EmailInvoice: 'invoice@test.se',
					OrganisationNumber: '5560160680',
					Type: 'COMPANY',
					Active: true,
				},
			];

			mockedGetFortnoxConnectionForOrg.mockResolvedValue(mockConnection as any);
			mockedGetFortnoxCustomers.mockResolvedValue(mockCustomers as any);

			const builder: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({
					data: { id: 'existing-customer' },
					error: null,
				}),
				single: jest.fn().mockResolvedValue({
					data: { id: 'existing-customer' },
					error: null,
				}),
			};

			mockedCreateClient.mockResolvedValue({
				from: () => builder,
			} as any);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/customers/import', {
				method: 'POST',
				body: JSON.stringify({
					customerNumbers: ['1001'],
				}),
			});

			const response = await importCustomers(request);
			const payload = await response.json();

			expect(response.status).toBe(200);
			expect(payload.results.imported).toBe(0);
			expect(payload.results.skipped).toBe(1);
		});

		it('should return error when no connection exists', async () => {
			mockedGetFortnoxConnectionForOrg.mockResolvedValue(null);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/customers/import', {
				method: 'POST',
				body: JSON.stringify({
					customerNumbers: ['1001'],
				}),
			});

			const response = await importCustomers(request);
			const payload = await response.json();

			expect(response.status).toBe(404);
			expect(payload.error).toContain('connection not found');
		});

		it('should reject non-admin/finance users', async () => {
			mockedGetSession.mockResolvedValue({
				user: { id: 'user-1' },
				membership: { org_id: 'org-1', role: 'worker' },
			} as any);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/customers/import', {
				method: 'POST',
				body: JSON.stringify({
					customerNumbers: ['1001'],
				}),
			});

			const response = await importCustomers(request);

			expect(response.status).toBe(403);
		});
	});
});

