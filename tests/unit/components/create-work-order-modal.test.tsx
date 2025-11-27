/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateWorkOrderModal } from '@/components/work-orders/create-work-order-modal';
import type { WorkOrderWithRelations } from '@/lib/schemas/work-order';

// Mock next/navigation
jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: jest.fn(),
		refresh: jest.fn(),
	}),
}));

// Mock toast
jest.mock('sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn(),
		info: jest.fn(),
	},
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.SpeechRecognition
Object.defineProperty(window, 'SpeechRecognition', {
	writable: true,
	value: jest.fn().mockImplementation(() => ({
		continuous: false,
		interimResults: false,
		lang: 'sv-SE',
		start: jest.fn(),
		stop: jest.fn(),
		abort: jest.fn(),
		onresult: null,
		onerror: null,
		onend: null,
	})),
});

Object.defineProperty(window, 'webkitSpeechRecognition', {
	writable: true,
	value: window.SpeechRecognition,
});

describe('CreateWorkOrderModal', () => {
	let queryClient: QueryClient;
	const mockUsers = [
		{ id: 'user-1', full_name: 'Test User 1', email: 'test1@example.com' },
		{ id: 'user-2', full_name: 'Test User 2', email: 'test2@example.com' },
	];
	const mockOrgId = 'org-123';
	const mockOnSuccess = jest.fn();
	const mockOnOpenChange = jest.fn();

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		});
		jest.clearAllMocks();
		(global.fetch as jest.Mock).mockClear();
	});

	const renderModal = (props = {}) => {
		return render(
			<QueryClientProvider client={queryClient}>
				<CreateWorkOrderModal
					source={{ source: 'calendar' }}
					open={true}
					onOpenChange={mockOnOpenChange}
					onSuccess={mockOnSuccess}
					users={mockUsers}
					orgId={mockOrgId}
					{...props}
				/>
			</QueryClientProvider>
		);
	};

	it('should render the modal when open', async () => {
		// Mock API responses
		(global.fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: [], page: 1, pageSize: 1000, total: 0 }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ projects: [] }),
			});

		renderModal();

		await waitFor(() => {
			expect(screen.getByText('Skapa ny arbetsorder')).toBeInTheDocument();
		});
	});

	it('should show validation errors when submitting empty form', async () => {
		// Mock API responses
		(global.fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: [], page: 1, pageSize: 1000, total: 0 }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ projects: [] }),
			});

		renderModal();

		await waitFor(() => {
			expect(screen.getByText('Skapa ny arbetsorder')).toBeInTheDocument();
		});

		// Find and click submit button
		const submitButton = screen.getByRole('button', { name: /skapa arbetsorder/i });
		expect(submitButton).toBeInTheDocument();
		
		console.log('Clicking submit button...');
		fireEvent.click(submitButton);

		// Wait for validation errors
		await waitFor(() => {
			// Should show validation errors
			const errorElements = screen.queryAllByText(/krävs|obligatorisk/i);
			console.log('Validation errors found:', errorElements.length);
			// At least one validation error should appear
			expect(errorElements.length).toBeGreaterThan(0);
		}, { timeout: 3000 });
	});

	it('should submit form with valid data', async () => {
		const mockCustomer = { id: 'customer-1', type: 'COMPANY' as const, company_name: 'Test Company' };
		const mockProject = { id: 'project-1', name: 'Test Project', project_number: 'P-001', customer_id: 'customer-1', site_address: 'Test Address' };
		const mockWorkOrder: WorkOrderWithRelations = {
			id: 'wo-1',
			organization_id: mockOrgId,
			project_id: 'project-1',
			customer_id: 'customer-1',
			work_order_number: 'WO-2025-001',
			title: 'Test Work Order',
			description: null,
			status: 'PLANERAD',
			priority: 'NORMAL',
			planned_start_at: '2025-01-27T08:00:00',
			planned_end_at: '2025-01-27T17:00:00',
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
			send_time_approval_email: true,
			actual_time_approved_by_id: null,
			actual_time_approved_at: null,
			actual_time_approval_token: null,
			actual_time_approval_sent_at: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		// Mock API responses
		(global.fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: [mockCustomer], page: 1, pageSize: 1000, total: 1 }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ projects: [mockProject] }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockWorkOrder,
			});

		renderModal();

		// Wait for modal to load
		await waitFor(() => {
			expect(screen.getByText('Skapa ny arbetsorder')).toBeInTheDocument();
		});

		// Wait for data to load
		await waitFor(() => {
			expect(screen.getByPlaceholderText(/välj kund/i)).toBeInTheDocument();
		}, { timeout: 3000 });

		// Select customer
		const customerSelect = screen.getByPlaceholderText(/välj kund/i);
		fireEvent.click(customerSelect);

		await waitFor(() => {
			const customerOption = screen.getByText('Test Company');
			fireEvent.click(customerOption);
		});

		// Wait for project to appear
		await waitFor(() => {
			expect(screen.getByPlaceholderText(/välj projekt/i)).toBeInTheDocument();
		});

		// Select project
		const projectSelect = screen.getByPlaceholderText(/välj projekt/i);
		fireEvent.click(projectSelect);

		await waitFor(() => {
			const projectOption = screen.getByText(/Test Project/i);
			fireEvent.click(projectOption);
		});

		// Fill in title
		const titleInput = screen.getByPlaceholderText(/ex: servicebesök/i);
		fireEvent.change(titleInput, { target: { value: 'Test Work Order' } });

		// Select a user
		await waitFor(() => {
			const userCheckbox = screen.getByLabelText(/Test User 1/i);
			fireEvent.click(userCheckbox);
		});

		// Find and click submit button
		const submitButton = screen.getByRole('button', { name: /skapa arbetsorder/i });
		
		console.log('Submitting form...');
		fireEvent.click(submitButton);

		// Wait for API call
		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				'/api/work-orders',
				expect.objectContaining({
					method: 'POST',
				})
			);
		}, { timeout: 5000 });

		// Verify onSuccess was called
		await waitFor(() => {
			expect(mockOnSuccess).toHaveBeenCalled();
		}, { timeout: 3000 });
	});

	it('should handle form submission errors', async () => {
		// Mock API responses
		(global.fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: [], page: 1, pageSize: 1000, total: 0 }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ projects: [] }),
			})
			.mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({ error: 'Validation failed', details: { project_id: 'Required' } }),
			});

		renderModal();

		await waitFor(() => {
			expect(screen.getByText('Skapa ny arbetsorder')).toBeInTheDocument();
		});

		// Try to submit with minimal data
		const submitButton = screen.getByRole('button', { name: /skapa arbetsorder/i });
		fireEvent.click(submitButton);

		// Should show error
		await waitFor(() => {
			expect(screen.getByText(/kunde inte skapa/i)).toBeInTheDocument();
		}, { timeout: 3000 });
	});
});

