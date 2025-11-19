import { NextRequest } from 'next/server';
import { POST } from '@/app/api/integrations/fortnox/employees/import/route';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import {
	getFortnoxConnectionForOrg,
	getFortnoxEmployees,
	FortnoxError,
	FortnoxEmployeesNoAccessError,
} from '@/lib/integrations/fortnox/client';

jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/integrations/fortnox/client');

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedGetFortnoxConnectionForOrg = getFortnoxConnectionForOrg as jest.MockedFunction<
	typeof getFortnoxConnectionForOrg
>;
const mockedGetFortnoxEmployees = getFortnoxEmployees as jest.MockedFunction<
	typeof getFortnoxEmployees
>;

describe('/api/integrations/fortnox/employees/import', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedGetSession.mockResolvedValue({
			user: { id: 'user-1' },
			membership: { org_id: 'org-1', role: 'admin' },
		} as any);

		const connection = {
			id: 'conn-1',
			org_id: 'org-1',
			access_token: 'token',
			refresh_token: 'refresh',
			access_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
			scopes: 'companyinformation invoice salary',
			fortnox_customer_number: '12345',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		mockedGetFortnoxConnectionForOrg.mockResolvedValue(connection as any);

		// Mock Supabase client (needed for employee insertion)
		const builder: any = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
			maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
			insert: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			from: jest.fn().mockReturnThis(),
		};

		mockedCreateClient.mockResolvedValue({
			from: () => builder,
		} as any);
	});

	describe('POST /api/integrations/fortnox/employees/import - error handling', () => {
		it('should return 403 with FORTNOX_PERMISSION_MISSING when Fortnox returns 403 with "Behörighet saknas."', async () => {
			// Mock Fortnox API returning 403 permission error
			const fortnoxError = new FortnoxError({
				message: 'Behörighet saknas.',
				status: 403,
				fortnoxCode: 0,
				fortnoxError: 1,
				fortnoxMessage: 'Behörighet saknas.',
				code: 'FORTNOX_PERMISSION_MISSING',
			});

			mockedGetFortnoxEmployees.mockRejectedValue(fortnoxError);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/employees/import', {
				method: 'POST',
				body: JSON.stringify({}),
			});

			const response = await POST(request);
			const payload = await response.json();

			expect(response.status).toBe(403);
			expect(payload.code).toBe('FORTNOX_PERMISSION_MISSING');
			expect(payload.message).toBe('Behörighet saknas i Fortnox för att läsa anställda.');
			expect(payload.details).toBeDefined();
			expect(payload.details.fortnoxMessage).toBe('Behörighet saknas.');
			expect(payload.details.fortnoxCode).toBe(0);
		});

		it('should return 502 with FORTNOX_INTEGRATION_ERROR when Fortnox returns 500', async () => {
			// Mock Fortnox API returning 500 server error
			const fortnoxError = new FortnoxError({
				message: 'Internal server error',
				status: 500,
				fortnoxCode: '500',
				fortnoxMessage: 'Internal server error',
			});

			mockedGetFortnoxEmployees.mockRejectedValue(fortnoxError);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/employees/import', {
				method: 'POST',
				body: JSON.stringify({}),
			});

			const response = await POST(request);
			const payload = await response.json();

			expect(response.status).toBe(502);
			expect(payload.code).toBe('FORTNOX_INTEGRATION_ERROR');
			expect(payload.message).toBe('Ett fel uppstod vid kommunikation med Fortnox API.');
			expect(payload.details).toBeDefined();
			expect(payload.details.httpStatus).toBe(500);
			expect(payload.details.fortnoxMessage).toBe('Internal server error');
		});

		it('should return 403 with NO_EMPLOYEE_ACCESS for legacy FortnoxEmployeesNoAccessError', async () => {
			// Mock legacy error for backward compatibility
			const legacyError = new FortnoxEmployeesNoAccessError('No access to Fortnox employees');

			mockedGetFortnoxEmployees.mockRejectedValue(legacyError);

			const request = new NextRequest('http://localhost/api/integrations/fortnox/employees/import', {
				method: 'POST',
				body: JSON.stringify({}),
			});

			const response = await POST(request);
			const payload = await response.json();

			expect(response.status).toBe(403);
			expect(payload.error).toBe('NO_EMPLOYEE_ACCESS');
			expect(payload.message).toContain('Fortnox-kontot saknar behörighet');
		});
	});
});

