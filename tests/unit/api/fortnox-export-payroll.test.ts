/**
 * Integration tests for Fortnox payroll export API route
 * Tests API endpoint behavior, authorization, and error handling
 */

import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/supabase/server', () => ({
	createClient: jest.fn(),
}));
jest.mock('@/lib/integrations/fortnox/client');
jest.mock('@/lib/integrations/fortnox/client-batch');
jest.mock('@/lib/integrations/fortnox/export-payroll');

describe('POST /api/integrations/fortnox/export-payroll', () => {
	const mockSession = {
		user: { id: 'user-1', email: 'admin@example.com' },
		membership: {
			org_id: 'org-1',
			role: 'admin',
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should require authentication', async () => {
		const { getSession } = require('@/lib/auth/get-session');
		getSession.mockResolvedValue({ user: null, membership: null });

		const { POST } = require('@/app/api/integrations/fortnox/export-payroll/route');

		const request = new NextRequest('http://localhost/api/integrations/fortnox/export-payroll', {
			method: 'POST',
			body: JSON.stringify({
				payrollBasisIds: ['basis-1'],
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data.error).toBe('Unauthorized');
	});

	it('should require admin or foreman role', async () => {
		const { getSession } = require('@/lib/auth/get-session');
		getSession.mockResolvedValue({
			...mockSession,
			membership: { ...mockSession.membership, role: 'worker' },
		});

		const { POST } = require('@/app/api/integrations/fortnox/export-payroll/route');

		const request = new NextRequest('http://localhost/api/integrations/fortnox/export-payroll', {
			method: 'POST',
			body: JSON.stringify({
				payrollBasisIds: ['basis-1'],
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.error).toBe('Forbidden');
	});

	it('should require payrollBasisIds', async () => {
		const { getSession } = require('@/lib/auth/get-session');
		getSession.mockResolvedValue(mockSession);

		const { POST } = require('@/app/api/integrations/fortnox/export-payroll/route');

		const request = new NextRequest('http://localhost/api/integrations/fortnox/export-payroll', {
			method: 'POST',
			body: JSON.stringify({}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('payrollBasisId');
	});

	it('should check for Fortnox connection', async () => {
		const { getSession } = require('@/lib/auth/get-session');
		const { getFortnoxConnectionForOrg } = require('@/lib/integrations/fortnox/client');
		const { createClient } = require('@/lib/supabase/server');

		getSession.mockResolvedValue(mockSession);
		getFortnoxConnectionForOrg.mockResolvedValue(null); // No connection
		
		// Mock Supabase client with proper chain
		const mockSupabaseChain = {
			from: jest.fn(() => ({
				select: jest.fn(() => ({
					in: jest.fn(() => ({
						eq: jest.fn(() => ({
							eq: jest.fn(() => ({
								select: jest.fn(() => Promise.resolve({ data: [], error: null })),
							})),
						})),
					})),
				})),
			})),
		};
		createClient.mockResolvedValue(mockSupabaseChain);

		const { POST } = require('@/app/api/integrations/fortnox/export-payroll/route');

		const request = new NextRequest('http://localhost/api/integrations/fortnox/export-payroll', {
			method: 'POST',
			body: JSON.stringify({
				payrollBasisIds: ['basis-1'],
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(404);
		expect(data.error).toContain('Fortnox-anslutning');
	});

	it('should validate payroll basis is locked', async () => {
		const { getSession } = require('@/lib/auth/get-session');
		const { getFortnoxConnectionForOrg } = require('@/lib/integrations/fortnox/client');
		const { createClient } = require('@/lib/supabase/server');

		getSession.mockResolvedValue(mockSession);
		getFortnoxConnectionForOrg.mockResolvedValue({
			id: 'conn-1',
			org_id: 'org-1',
			access_token: 'token-123',
			refresh_token: 'refresh-123',
			access_token_expires_at: new Date().toISOString(),
		});

		const createBuilder = (resolveValue: any) => {
			const builder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
			};
			// Last eq resolves with data
			builder.eq.mockResolvedValueOnce(resolveValue);
			return builder;
		};

		const mockSupabase = {
			from: jest.fn((table: string) => {
				// Wage code mappings query (first in code)
				if (table === 'fortnox_wage_code_mappings') {
					return createBuilder({
						data: [
							{ ep_wage_type: 'normal', fortnox_salary_code: '100', is_active: true },
						],
						error: null,
					});
				}
				// Payroll basis query
				if (table === 'payroll_basis') {
					return createBuilder({
						data: [
							{
								id: 'basis-1',
								locked: false, // Not locked
								person: { id: 'person-1', full_name: 'Test', email: 'test@example.com' },
							},
						],
						error: null,
					});
				}
				// Default
				return createBuilder({ data: [], error: null });
			}),
		};

		createClient.mockResolvedValue(mockSupabase);

		const { POST } = require('@/app/api/integrations/fortnox/export-payroll/route');

		const request = new NextRequest('http://localhost/api/integrations/fortnox/export-payroll', {
			method: 'POST',
			body: JSON.stringify({
				payrollBasisIds: ['basis-1'],
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('låsta');
	});

	it('should check if already exported', async () => {
		const { getSession } = require('@/lib/auth/get-session');
		const { getFortnoxConnectionForOrg } = require('@/lib/integrations/fortnox/client');
		const { createClient } = require('@/lib/supabase/server');

		getSession.mockResolvedValue(mockSession);
		getFortnoxConnectionForOrg.mockResolvedValue({
			id: 'conn-1',
			org_id: 'org-1',
			access_token: 'token-123',
			refresh_token: 'refresh-123',
			access_token_expires_at: new Date().toISOString(),
		});

		let callCount = 0;
		const createBuilder = (resolveValue: any) => {
			const builder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
			};
			// Last eq resolves with data
			builder.eq.mockResolvedValueOnce(resolveValue);
			return builder;
		};

		const mockSupabase = {
			from: jest.fn(() => {
				callCount++;
				if (callCount === 1) {
					// First call: fetch payroll_basis
					return createBuilder({
						data: [
							{
								id: 'basis-1',
								locked: true,
								person: { id: 'person-1', full_name: 'Test', email: 'test@example.com' },
							},
						],
						error: null,
					});
				} else {
					// Second call: check existing links
					return createBuilder({
						data: [{ payroll_basis_id: 'basis-1', status: 'exported' }],
						error: null,
					});
				}
			}),
		};

		createClient.mockReturnValue(mockSupabase);

		const { POST } = require('@/app/api/integrations/fortnox/export-payroll/route');

		const request = new NextRequest('http://localhost/api/integrations/fortnox/export-payroll', {
			method: 'POST',
			body: JSON.stringify({
				payrollBasisIds: ['basis-1'],
			}),
		});

		const response = await POST(request);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('redan exporterade');
	});

	it('should fetch mappings from database if not provided', async () => {
		const { getSession } = require('@/lib/auth/get-session');
		const { getFortnoxConnectionForOrg } = require('@/lib/integrations/fortnox/client');
		const { createClient } = require('@/lib/supabase/server');
		const { buildFortnoxPayrollTransactionsBatch } = require('@/lib/integrations/fortnox/export-payroll');

		getSession.mockResolvedValue(mockSession);
		getFortnoxConnectionForOrg.mockResolvedValue({
			id: 'conn-1',
			org_id: 'org-1',
			access_token: 'token-123',
			refresh_token: 'refresh-123',
			access_token_expires_at: new Date().toISOString(),
		});

		const createBuilder = (resolveValue: any, chainMethod = 'eq') => {
			const builder = {
				select: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
			};
			// Last method call resolves with data
			if (chainMethod === 'eq') {
				builder.eq.mockResolvedValueOnce(resolveValue);
			} else if (chainMethod === 'in') {
				builder.in.mockResolvedValueOnce(resolveValue);
			}
			return builder;
		};

		let callCount = 0;
		const mockSupabase = {
			from: jest.fn((table: string) => {
				callCount++;
				// Order matches actual code execution:
				// 1. Wage code mappings (first query in code)
				if (table === 'fortnox_wage_code_mappings') {
					return createBuilder({
						data: [
							{ ep_wage_type: 'normal', fortnox_salary_code: '100', is_active: true },
							{ ep_wage_type: 'overtime', fortnox_salary_code: '200', is_active: true },
						],
						error: null,
					});
				}
				// 2. Employee mappings (second query)
				if (table === 'fortnox_employee_mappings') {
					return createBuilder({
						data: [{ person_id: 'person-1', fortnox_employee_id: '101' }],
						error: null,
					});
				}
				// 3. Payroll basis (third query)
				if (table === 'payroll_basis') {
					const builder = createBuilder({
						data: [
							{
								id: 'basis-1',
								locked: true,
								person: { id: 'person-1', full_name: 'Test', email: 'test@example.com' },
							},
						],
						error: null,
					}, 'in');
					builder.in.mockReturnValue(builder); // Allow chaining
					builder.eq.mockReturnValue(builder);
					builder.eq.mockResolvedValueOnce({
						data: [
							{
								id: 'basis-1',
								locked: true,
								person: { id: 'person-1', full_name: 'Test', email: 'test@example.com' },
							},
						],
						error: null,
					});
					return builder;
				}
				// 4. Check existing links (fourth query if needed)
				if (table === 'fortnox_payroll_links') {
					const builder = createBuilder({ data: [], error: null }, 'in');
					builder.in.mockReturnValue(builder);
					builder.eq.mockReturnValue(builder);
					builder.eq.mockResolvedValueOnce({ data: [], error: null });
					return builder;
				}
				// 5. Profiles (if auto-matching needed)
				if (table === 'profiles') {
					return createBuilder({
						data: [{ id: 'person-1', email: 'test@example.com', full_name: 'Test' }],
						error: null,
					}, 'in');
				}
				// 6. Employees (if auto-matching needed)
				if (table === 'employees') {
					const builder = createBuilder({
						data: [],
						error: null,
					});
					builder.in.mockReturnValue(builder);
					builder.eq.mockReturnValue(builder);
					builder.eq.mockReturnValue(builder);
					builder.eq.mockResolvedValueOnce({ data: [], error: null });
					return builder;
				}
				// Default fallback
				return createBuilder({ data: [], error: null });
			}),
		};

		createClient.mockResolvedValue(mockSupabase);

		buildFortnoxPayrollTransactionsBatch.mockResolvedValue({
			attendanceTransactions: [],
			salaryTransactions: [],
			errors: [],
		});

		const { POST } = require('@/app/api/integrations/fortnox/export-payroll/route');

		const request = new NextRequest('http://localhost/api/integrations/fortnox/export-payroll', {
			method: 'POST',
			body: JSON.stringify({
				payrollBasisIds: ['basis-1'],
				// No mappings provided - should fetch from database
			}),
		});

		const response = await POST(request);

		// Should have called buildFortnoxPayrollTransactionsBatch with fetched mappings
		expect(buildFortnoxPayrollTransactionsBatch).toHaveBeenCalled();
		expect(response.status).not.toBe(400); // Should not fail on missing mappings
	});
});

