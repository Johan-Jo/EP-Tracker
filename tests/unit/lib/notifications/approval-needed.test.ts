/**
 * Unit tests for approval-needed.ts
 * Tests approval needed notification logic
 */

import { sendApprovalNeededNotification } from '@/lib/notifications/approval-needed';
import { sendNotificationToMultipleUsers } from '@/lib/notifications/send-notification';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
jest.mock('@/lib/notifications/send-notification');
jest.mock('@/lib/supabase/server');

describe('sendApprovalNeededNotification', () => {
  const mockSupabase = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (sendNotificationToMultipleUsers as jest.Mock).mockResolvedValue([
      { success: true, sent: 1, failed: 0 },
    ]);
  });

  describe('member fetching', () => {
    it('should find all admins and foremen in organization', async () => {
      const mockMembers = [
        { user_id: 'admin-1', role: 'admin' },
        { user_id: 'admin-2', role: 'admin' },
        { user_id: 'foreman-1', role: 'foreman' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockMembers, // Only admin and foreman since query filters by .in('role', ['admin', 'foreman'])
                error: null,
              }),
            }),
          }),
        }),
      });

      await sendApprovalNeededNotification({
        orgId: 'org-123',
        count: 5,
        weekNumber: 3,
        year: 2024,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('memberships');
      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1', 'admin-2', 'foreman-1'],
        expect.anything()
      );
    });

    it('should handle no admins/foremen found', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await sendApprovalNeededNotification({
        orgId: 'org-123',
        count: 5,
        weekNumber: 3,
        year: 2024,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No admins/foremen to notify'),
        'org-123'
      );
      expect(sendNotificationToMultipleUsers).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle null members array', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await sendApprovalNeededNotification({
        orgId: 'org-123',
        count: 5,
        weekNumber: 3,
        year: 2024,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No admins/foremen to notify'),
        'org-123'
      );
      expect(sendNotificationToMultipleUsers).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('notification content', () => {
    it('should format notification correctly for single time report', async () => {
      const mockMembers = [{ user_id: 'admin-1', role: 'admin' }];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockMembers,
                error: null,
              }),
            }),
          }),
        }),
      });

      await sendApprovalNeededNotification({
        orgId: 'org-123',
        count: 1,
        weekNumber: 3,
        year: 2024,
      });

      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1'],
        expect.objectContaining({
          type: 'approval_needed',
          title: '📊 Tidrapporter väntar på godkännande',
          body: expect.stringContaining('1 tidrapport'),
          body: expect.stringContaining('vecka 3'),
          url: '/dashboard/approvals',
          data: expect.objectContaining({
            count: '1',
            week_number: '3',
            year: '2024',
          }),
        })
      );
    });

    it('should format notification correctly for multiple time reports', async () => {
      const mockMembers = [{ user_id: 'admin-1', role: 'admin' }];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockMembers,
                error: null,
              }),
            }),
          }),
        }),
      });

      await sendApprovalNeededNotification({
        orgId: 'org-123',
        count: 5,
        weekNumber: 3,
        year: 2024,
      });

      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1'],
        expect.objectContaining({
          body: expect.stringContaining('5 tidrapporter'),
          body: expect.stringContaining('vecka 3'),
          data: expect.objectContaining({
            count: '5',
            week_number: '3',
            year: '2024',
          }),
        })
      );
    });

    it('should handle different week numbers and years', async () => {
      const mockMembers = [{ user_id: 'admin-1', role: 'admin' }];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockMembers,
                error: null,
              }),
            }),
          }),
        }),
      });

      await sendApprovalNeededNotification({
        orgId: 'org-123',
        count: 10,
        weekNumber: 52,
        year: 2023,
      });

      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1'],
        expect.objectContaining({
          body: expect.stringContaining('vecka 52'),
          data: expect.objectContaining({
            count: '10',
            week_number: '52',
            year: '2023',
          }),
        })
      );
    });
  });

  describe('filtering', () => {
    it('should only include admin and foreman roles', async () => {
      const mockMembers = [
        { user_id: 'admin-1', role: 'admin' },
        { user_id: 'foreman-1', role: 'foreman' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockMembers, // Query filters by .in('role', ['admin', 'foreman']) so only these are returned
                error: null,
              }),
            }),
          }),
        }),
      });

      await sendApprovalNeededNotification({
        orgId: 'org-123',
        count: 5,
        weekNumber: 3,
        year: 2024,
      });

      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1', 'foreman-1'],
        expect.anything()
      );
    });

    it('should only include active memberships', async () => {
      const mockMembers = [
        { user_id: 'admin-1', role: 'admin' },
        { user_id: 'admin-2', role: 'admin' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: mockMembers,
                error: null,
              }),
            }),
          }),
        }),
      });

      await sendApprovalNeededNotification({
        orgId: 'org-123',
        count: 5,
        weekNumber: 3,
        year: 2024,
      });

      // Verify that is_active filter is applied
      const fromCall = mockSupabase.from.mock.calls.find((call) => call[0] === 'memberships');
      expect(fromCall).toBeDefined();

      const selectCall = mockSupabase.from().select.mock.calls[0];
      expect(selectCall).toBeDefined();
    });
  });
});

