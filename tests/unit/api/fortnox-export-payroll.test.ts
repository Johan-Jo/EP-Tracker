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

		const mockSupabase = {
			from: jest.fn(() => ({
				select: jest.fn(() => ({
					in: jest.fn(() => ({
						eq: jest.fn(() => ({
							eq: jest.fn(() =>
								Promise.resolve({
									data: [
										{
											id: 'basis-1',
											locked: false, // Not locked
											person: { id: 'person-1', full_name: 'Test', email: 'test@example.com' },
										},
									],
									error: null,
								})
							),
						})),
					})),
				})),
			})),
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
		const mockSupabase = {
			from: jest.fn(() => {
				callCount++;
				if (callCount === 1) {
					// First call: fetch payroll_basis
					return {
						select: jest.fn(() => ({
							in: jest.fn(() => ({
								eq: jest.fn(() => ({
									eq: jest.fn(() =>
										Promise.resolve({
											data: [
												{
													id: 'basis-1',
													locked: true,
													person: { id: 'person-1', full_name: 'Test', email: 'test@example.com' },
												},
											],
											error: null,
										})
									),
								})),
							})),
						})),
					};
				} else {
					// Second call: check existing links
					return {
						select: jest.fn(() => ({
							in: jest.fn(() => ({
								eq: jest.fn(() => ({
									eq: jest.fn(() =>
										Promise.resolve({
											data: [{ payroll_basis_id: 'basis-1', status: 'exported' }],
											error: null,
										})
									),
								})),
							})),
						})),
					};
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

		let callCount = 0;
		const mockSupabase = {
			from: jest.fn(() => {
				callCount++;
				if (callCount === 1) {
					// Fetch payroll_basis
					return {
						select: jest.fn(() => ({
							in: jest.fn(() => ({
								eq: jest.fn(() => ({
									eq: jest.fn(() =>
										Promise.resolve({
											data: [
												{
													id: 'basis-1',
													locked: true,
													person: { id: 'person-1', full_name: 'Test', email: 'test@example.com' },
												},
											],
											error: null,
										})
									),
								})),
							})),
						})),
					};
				} else if (callCount === 2) {
					// Check existing links
					return {
						select: jest.fn(() => ({
							in: jest.fn(() => ({
								eq: jest.fn(() => ({
									eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
								})),
							})),
						})),
					};
				} else if (callCount === 3) {
					// Fetch employee mappings
					return {
						select: jest.fn(() => ({
							eq: jest.fn(() =>
								Promise.resolve({
									data: [{ person_id: 'person-1', fortnox_employee_id: '101' }],
									error: null,
								})
							),
						})),
					};
				} else {
					// Fetch wage code mappings
					return {
						select: jest.fn(() => ({
							eq: jest.fn(() => ({
								eq: jest.fn(() =>
									Promise.resolve({
										data: [
											{ ep_wage_type: 'normal', fortnox_salary_code: '100' },
											{ ep_wage_type: 'overtime', fortnox_salary_code: '200' },
										],
										error: null,
									})
								),
							})),
						})),
					};
				}
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

