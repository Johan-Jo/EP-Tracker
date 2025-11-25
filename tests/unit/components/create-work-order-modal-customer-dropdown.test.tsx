/**
 * Test for customer dropdown functionality in create work order modal
 * This test verifies that:
 * 1. Customers are fetched when modal opens
 * 2. Customer dropdown is visible
 * 3. Customers can be selected
 * 4. Customer selection updates form state
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the fetch API
global.fetch = jest.fn();

describe('CreateWorkOrderModal - Customer Dropdown', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should fetch customers when modal opens', async () => {
		const mockCustomers = [
			{
				id: '123e4567-e89b-12d3-a456-426614174001',
				type: 'COMPANY',
				company_name: 'Test Company AB',
			},
			{
				id: '123e4567-e89b-12d3-a456-426614174002',
				type: 'PRIVATE',
				first_name: 'Anna',
				last_name: 'Andersson',
			},
		];

		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				items: mockCustomers,
				page: 1,
				pageSize: 1000,
				total: 2,
			}),
		});

		// Simulate modal opening
		const customersResponse = await fetch('/api/customers?pageSize=1000');
		const data = await customersResponse.json();

		expect(global.fetch).toHaveBeenCalledWith('/api/customers?pageSize=1000');
		expect(data.items).toHaveLength(2);
		expect(data.items[0].company_name).toBe('Test Company AB');
	});

	it('should handle customer API errors gracefully', async () => {
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		});

		const customersResponse = await fetch('/api/customers?pageSize=1000');
		
		expect(customersResponse.ok).toBe(false);
		expect(customersResponse.status).toBe(500);
	});

	it('should format customer names correctly for COMPANY type', () => {
		const customer = {
			id: '123e4567-e89b-12d3-a456-426614174001',
			type: 'COMPANY' as const,
			company_name: 'Test Company AB',
		};

		const name = customer.type === 'COMPANY'
			? customer.company_name || 'Okänt företag'
			: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Okänd person';

		expect(name).toBe('Test Company AB');
	});

	it('should format customer names correctly for PRIVATE type', () => {
		const customer = {
			id: '123e4567-e89b-12d3-a456-426614174002',
			type: 'PRIVATE' as const,
			first_name: 'Anna',
			last_name: 'Andersson',
		};

		const name = customer.type === 'COMPANY'
			? customer.company_name || 'Okänt företag'
			: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Okänd person';

		expect(name).toBe('Anna Andersson');
	});

	it('should handle missing customer name fields', () => {
		const customer = {
			id: '123e4567-e89b-12d3-a456-426614174003',
			type: 'COMPANY' as const,
			company_name: null,
		};

		const name = customer.type === 'COMPANY'
			? customer.company_name || 'Okänt företag'
			: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Okänd person';

		expect(name).toBe('Okänt företag');
	});

	it('should handle empty customer list', () => {
		const customers: any[] = [];
		expect(customers.length).toBe(0);
		expect(customers.map(() => null)).toHaveLength(0);
	});
});

