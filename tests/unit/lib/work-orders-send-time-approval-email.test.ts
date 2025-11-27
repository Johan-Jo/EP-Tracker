import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { sendWorkOrderTimeApprovalEmail } from '@/lib/work-orders/send-time-approval-email';
import { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';
import { generateApprovalToken } from '@/lib/work-orders/generate-approval-token';
import { getWorkOrderMapUrl } from '@/lib/work-orders/map';

jest.mock('@/lib/email/send');
jest.mock('@/lib/work-orders/generate-approval-token');
jest.mock('@/lib/work-orders/map');

const mockedSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockedGenerateApprovalToken = generateApprovalToken as jest.MockedFunction<typeof generateApprovalToken>;
const mockedGetWorkOrderMapUrl = getWorkOrderMapUrl as jest.MockedFunction<typeof getWorkOrderMapUrl>;

describe('sendWorkOrderTimeApprovalEmail', () => {
	let mockSupabase: jest.Mocked<SupabaseClient>;
	const workOrderId = '123e4567-e89b-12d3-a456-426614174010';
	const orgId = '123e4567-e89b-12d3-a456-426614174001';

	beforeEach(() => {
		mockSupabase = {
			from: jest.fn(),
			rpc: jest.fn(),
		} as any;
		jest.clearAllMocks();
		mockedGenerateApprovalToken.mockResolvedValue('test-token-123');
		mockedGetWorkOrderMapUrl.mockReturnValue('https://maps.geoapify.com/test-map.png');
		mockedSendEmail.mockResolvedValue(undefined);
	});

	it('should not send email if send_time_approval_email is false', async () => {
		const workOrder = {
			id: workOrderId,
			title: 'Test Work Order',
			work_order_number: 'WO-001',
			planned_start_at: '2025-01-01T08:00:00Z',
			planned_end_at: '2025-01-01T17:00:00Z',
			send_time_approval_email: false,
			actual_time_approval_sent_at: null,
			location_address: null,
			location_city: null,
			location_zip: null,
			location_lat: null,
			location_lng: null,
			project: { id: 'proj-1', name: 'Test Project' },
			assignments: [],
		};

		const workOrderBuilder: any = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: workOrder,
				error: null,
			}),
		};

		mockSupabase.from = jest.fn(() => workOrderBuilder) as any;

		await sendWorkOrderTimeApprovalEmail({
			supabase: mockSupabase,
			workOrderId,
			orgId,
		});

		expect(mockedSendEmail).not.toHaveBeenCalled();
	});

	it('should not send email if already sent', async () => {
		const workOrder = {
			id: workOrderId,
			title: 'Test Work Order',
			work_order_number: 'WO-001',
			planned_start_at: '2025-01-01T08:00:00Z',
			planned_end_at: '2025-01-01T17:00:00Z',
			send_time_approval_email: true,
			actual_time_approval_sent_at: '2025-01-01T10:00:00Z',
			location_address: null,
			location_city: null,
			location_zip: null,
			location_lat: null,
			location_lng: null,
			project: { id: 'proj-1', name: 'Test Project' },
			assignments: [],
		};

		const workOrderBuilder: any = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn().mockResolvedValue({
				data: workOrder,
				error: null,
			}),
		};

		mockSupabase.from = jest.fn(() => workOrderBuilder) as any;

		await sendWorkOrderTimeApprovalEmail({
			supabase: mockSupabase,
			workOrderId,
			orgId,
		});

		expect(mockedSendEmail).not.toHaveBeenCalled();
	});
});
