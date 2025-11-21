/**
 * Unit tests for time-approval-invite.ts
 * Tests time entry approval invite email logic
 */

import { sendTimeApprovalInviteForEntry } from '@/lib/notifications/time-approval-invite';
import { createAdminClient } from '@/lib/supabase/server';
import { sendTimeApprovalInvite } from '@/lib/email/send';
import { createTimeEntriesMock, createPendingCountQuery, resetTimeEntriesQueryCount } from './time-approval-invite-helper';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/email/send');

describe('sendTimeApprovalInviteForEntry', () => {
  const mockAdminClient = {
    from: jest.fn(),
  };


  beforeEach(() => {
    jest.clearAllMocks();
    resetTimeEntriesQueryCount(); // Reset counter before each test
    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);
    (sendTimeApprovalInvite as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('entry fetching', () => {
    it('should fetch time entry with related data', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'worker-1',
        project_id: 'project-123',
        start_at: '2024-01-15T08:00:00Z',
        stop_at: '2024-01-15T17:00:00Z',
        duration_min: 480,
        notes: 'Test notes',
        status: 'draft',
        user: { full_name: 'Test Worker', email: 'worker@test.com' },
        project: { name: 'Test Project' },
      };

      const mockAdmins = [
        {
          user_id: 'admin-1',
          profile: { full_name: 'Admin User', email: 'admin@test.com' },
        },
      ];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return createTimeEntriesMock(mockEntry, 1);
        }
        if (table === 'memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: mockAdmins,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(mockAdminClient.from).toHaveBeenCalledWith('time_entries');
      expect(sendTimeApprovalInvite).toHaveBeenCalled();
    });

    it('should handle entry not found', async () => {
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch time entry for approval invite:',
        expect.anything()
      );
      expect(sendTimeApprovalInvite).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should skip if entry has no stop_at (not completed)', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'worker-1',
        start_at: '2024-01-15T08:00:00Z',
        stop_at: null, // Not completed
        duration_min: null,
      };

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockEntry,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(sendTimeApprovalInvite).not.toHaveBeenCalled();
    });

    it('should skip if duration is zero or negative', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'worker-1',
        start_at: '2024-01-15T08:00:00Z',
        stop_at: '2024-01-15T08:00:00Z', // Same time = 0 minutes
        duration_min: 0,
      };

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockEntry,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(sendTimeApprovalInvite).not.toHaveBeenCalled();
    });
  });

  describe('admin fetching', () => {
    it('should find all active admins in organization', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'worker-1',
        start_at: '2024-01-15T08:00:00Z',
        stop_at: '2024-01-15T17:00:00Z',
        duration_min: 480,
        notes: 'Test notes',
        status: 'draft',
        user: { full_name: 'Test Worker', email: 'worker@test.com' },
        project: { name: 'Test Project' },
      };

      const mockAdmins = [
        {
          user_id: 'admin-1',
          profile: { full_name: 'Admin 1', email: 'admin1@test.com' },
        },
        {
          user_id: 'admin-2',
          profile: { full_name: 'Admin 2', email: 'admin2@test.com' },
        },
      ];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return createTimeEntriesMock(mockEntry, 1);
        }
        if (table === 'memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: mockAdmins,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(sendTimeApprovalInvite).toHaveBeenCalledTimes(2);
      expect(sendTimeApprovalInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin1@test.com',
          toName: 'Admin 1',
        })
      );
      expect(sendTimeApprovalInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin2@test.com',
          toName: 'Admin 2',
        })
      );
    });

    it('should filter out entry owner from recipients', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'admin-1', // Admin is also the entry owner
        start_at: '2024-01-15T08:00:00Z',
        stop_at: '2024-01-15T17:00:00Z',
        duration_min: 480,
        notes: 'Test notes',
        status: 'draft',
        user: { full_name: 'Admin User', email: 'admin@test.com' },
        project: { name: 'Test Project' },
      };

      const mockAdmins = [
        {
          user_id: 'admin-1', // Same as entry owner
          profile: { full_name: 'Admin User', email: 'admin@test.com' },
        },
        {
          user_id: 'admin-2',
          profile: { full_name: 'Admin 2', email: 'admin2@test.com' },
        },
      ];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return createTimeEntriesMock(mockEntry, 1);
        }
        if (table === 'memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: mockAdmins,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(sendTimeApprovalInvite).toHaveBeenCalledTimes(1);
      expect(sendTimeApprovalInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin2@test.com', // Only admin-2, admin-1 filtered out
        })
      );
    });

    it('should filter out admins without email', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'worker-1',
        start_at: '2024-01-15T08:00:00Z',
        stop_at: '2024-01-15T17:00:00Z',
        duration_min: 480,
        notes: 'Test notes',
        status: 'draft',
        user: { full_name: 'Test Worker', email: 'worker@test.com' },
        project: { name: 'Test Project' },
      };

      const mockAdmins = [
        {
          user_id: 'admin-1',
          profile: { full_name: 'Admin 1', email: 'admin1@test.com' },
        },
        {
          user_id: 'admin-2',
          profile: { full_name: 'Admin 2', email: null }, // No email
        },
      ];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return createTimeEntriesMock(mockEntry, 1);
        }
        if (table === 'memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: mockAdmins,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(sendTimeApprovalInvite).toHaveBeenCalledTimes(1);
      expect(sendTimeApprovalInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin1@test.com', // Only admin with email
        })
      );
    });

    it('should handle no admins found', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'worker-1',
        start_at: '2024-01-15T08:00:00Z',
        stop_at: '2024-01-15T17:00:00Z',
        duration_min: 480,
        notes: 'Test notes',
        status: 'draft',
        user: { full_name: 'Test Worker', email: 'worker@test.com' },
        project: { name: 'Test Project' },
      };

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockEntry,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        // Default: time_entries query for pendingCount
        // Chain: .select().eq().eq().in().not()
        const eqChain = {
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              count: 1,
              error: null,
            }),
          }),
        };
        eqChain.eq.mockReturnValue(eqChain); // Allow chaining .eq().eq()
        return {
          select: jest.fn().mockReturnValue(eqChain),
        };
      });

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(sendTimeApprovalInvite).not.toHaveBeenCalled();
    });

    it('should handle admin fetch error', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'worker-1',
        start_at: '2024-01-15T08:00:00Z',
        stop_at: '2024-01-15T17:00:00Z',
        duration_min: 480,
        notes: 'Test notes',
        status: 'draft',
        user: { full_name: 'Test Worker', email: 'worker@test.com' },
        project: { name: 'Test Project' },
      };

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return createTimeEntriesMock(mockEntry, 1);
        }
        if (table === 'memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch admin recipients for approval invite:',
        expect.anything()
      );
      expect(sendTimeApprovalInvite).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('email content', () => {
    it('should format email correctly with all data', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'worker-1',
        start_at: '2024-01-15T08:00:00Z',
        stop_at: '2024-01-15T17:00:00Z',
        duration_min: 480,
        notes: 'Test notes',
        status: 'draft',
        user: { full_name: 'Test Worker', email: 'worker@test.com' },
        project: { name: 'Test Project' },
      };

      const mockAdmins = [
        {
          user_id: 'admin-1',
          profile: { full_name: 'Admin User', email: 'admin@test.com' },
        },
      ];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return createTimeEntriesMock(mockEntry, 1);
        }
        if (table === 'memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: mockAdmins,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(sendTimeApprovalInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@test.com',
          toName: 'Admin User',
          organizationId: 'org-123',
          workerName: 'Test Worker',
          projectName: 'Test Project',
          entryHours: expect.stringMatching(/\d+,\d+ h/), // Hours calculated from start/stop times
          notes: 'Test notes',
          subject: "Test Workers tidrapport behöver ditt godkännande",
          pendingCount: 1,
        })
      );
    });

    it('should include bulk approve link when multiple entries pending', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'worker-1',
        start_at: '2024-01-15T08:00:00Z',
        stop_at: '2024-01-15T17:00:00Z',
        duration_min: 480,
        notes: 'Test notes',
        status: 'draft',
        user: { full_name: 'Test Worker', email: 'worker@test.com' },
        project: { name: 'Test Project' },
      };

      const mockAdmins = [
        {
          user_id: 'admin-1',
          profile: { full_name: 'Admin User', email: 'admin@test.com' },
        },
      ];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return createTimeEntriesMock(mockEntry, 5); // 5 pending entries
        }
        if (table === 'memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: mockAdmins,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(sendTimeApprovalInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          approveAllUrl: expect.stringContaining('mode=all'),
          approveAllUrl: expect.stringContaining('userId=worker-1'),
          pendingCount: 5,
        })
      );
    });

    it('should handle name ending with "s" correctly', async () => {
      const mockEntry = {
        id: 'entry-123',
        org_id: 'org-123',
        user_id: 'worker-1',
        start_at: '2024-01-15T08:00:00Z',
        stop_at: '2024-01-15T17:00:00Z',
        duration_min: 480,
        notes: 'Test notes',
        status: 'draft',
        user: { full_name: 'James', email: 'james@test.com' }, // Ends with 's'
        project: { name: 'Test Project' },
      };

      const mockAdmins = [
        {
          user_id: 'admin-1',
          profile: { full_name: 'Admin User', email: 'admin@test.com' },
        },
      ];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'time_entries') {
          return createTimeEntriesMock(mockEntry, 1);
        }
        if (table === 'memberships') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: mockAdmins,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTimeApprovalInviteForEntry('entry-123');

      expect(sendTimeApprovalInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "James' tidrapport behöver ditt godkännande", // With apostrophe
        })
      );
    });
  });
});

