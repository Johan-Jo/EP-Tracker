/**
 * Unit tests for team-checkin.ts
 * Tests team check-in/check-out notification logic
 */

import { sendTeamCheckInNotification } from '@/lib/notifications/team-checkin';
import { sendNotificationToMultipleUsers } from '@/lib/notifications/send-notification';
import { createAdminClient } from '@/lib/supabase/server';

// Mock dependencies
jest.mock('@/lib/notifications/send-notification');
jest.mock('@/lib/supabase/server');

describe('sendTeamCheckInNotification', () => {
  const mockAdminClient = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);
    (sendNotificationToMultipleUsers as jest.Mock).mockResolvedValue([
      { success: true, sent: 1, failed: 0 },
    ]);
  });

  describe('project fetching', () => {
    it('should fetch project and find organization', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
      };

      const mockMembers = [
        { user_id: 'admin-1', role: 'admin' },
        { user_id: 'foreman-1', role: 'foreman' },
      ];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProject,
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
                  in: jest.fn().mockResolvedValue({
                    data: mockMembers,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTeamCheckInNotification({
        userId: 'worker-1',
        userName: 'Test Worker',
        projectId: 'project-123',
        projectName: 'Test Project',
        action: 'check_in',
        timestamp: new Date().toISOString(),
      });

      expect(mockAdminClient.from).toHaveBeenCalledWith('projects');
      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1', 'foreman-1'],
        expect.objectContaining({
          type: 'team_checkin',
          title: expect.stringContaining('Test Worker'),
          body: expect.stringContaining('Test Project'),
        })
      );
    });

    it('should handle project not found', async () => {
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
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

      await sendTeamCheckInNotification({
        userId: 'worker-1',
        userName: 'Test Worker',
        projectId: 'project-123',
        projectName: 'Test Project',
        action: 'check_in',
        timestamp: new Date().toISOString(),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching project'),
        expect.anything()
      );
      expect(sendNotificationToMultipleUsers).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle project fetch error', async () => {
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await sendTeamCheckInNotification({
        userId: 'worker-1',
        userName: 'Test Worker',
        projectId: 'project-123',
        projectName: 'Test Project',
        action: 'check_in',
        timestamp: new Date().toISOString(),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching project'),
        expect.anything()
      );
      expect(sendNotificationToMultipleUsers).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle missing org_id', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: null,
      };

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProject,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await sendTeamCheckInNotification({
        userId: 'worker-1',
        userName: 'Test Worker',
        projectId: 'project-123',
        projectName: 'Test Project',
        action: 'check_in',
        timestamp: new Date().toISOString(),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No organization found'),
        'project-123'
      );
      expect(sendNotificationToMultipleUsers).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('member fetching', () => {
    it('should find all admins and foremen in organization', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
      };

      const mockMembers = [
        { user_id: 'admin-1', role: 'admin' },
        { user_id: 'admin-2', role: 'admin' },
        { user_id: 'foreman-1', role: 'foreman' },
        { user_id: 'worker-1', role: 'worker' }, // Should be filtered out
      ];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProject,
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
                  in: jest.fn().mockResolvedValue({
                    data: mockMembers,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTeamCheckInNotification({
        userId: 'worker-1',
        userName: 'Test Worker',
        projectId: 'project-123',
        projectName: 'Test Project',
        action: 'check_in',
        timestamp: new Date().toISOString(),
      });

      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1', 'admin-2', 'foreman-1'], // worker-1 filtered out
        expect.anything()
      );
    });

    it('should filter out the user who checked in', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
      };

      const mockMembers = [
        { user_id: 'admin-1', role: 'admin' },
        { user_id: 'admin-2', role: 'admin' }, // This is the user who checked in
      ];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProject,
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
                  in: jest.fn().mockResolvedValue({
                    data: mockMembers,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTeamCheckInNotification({
        userId: 'admin-2', // This admin checked in
        userName: 'Admin User',
        projectId: 'project-123',
        projectName: 'Test Project',
        action: 'check_in',
        timestamp: new Date().toISOString(),
      });

      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1'], // admin-2 filtered out
        expect.anything()
      );
    });

    it('should handle no admins/foremen found', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
      };

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProject,
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
                  in: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await sendTeamCheckInNotification({
        userId: 'worker-1',
        userName: 'Test Worker',
        projectId: 'project-123',
        projectName: 'Test Project',
        action: 'check_in',
        timestamp: new Date().toISOString(),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No admins/foremen to notify'),
        'org-123'
      );
      expect(sendNotificationToMultipleUsers).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle member fetch error', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
      };

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProject,
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
                  in: jest.fn().mockResolvedValue({
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

      await sendTeamCheckInNotification({
        userId: 'worker-1',
        userName: 'Test Worker',
        projectId: 'project-123',
        projectName: 'Test Project',
        action: 'check_in',
        timestamp: new Date().toISOString(),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching members'),
        expect.anything()
      );
      expect(sendNotificationToMultipleUsers).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('notification content', () => {
    it('should format check-in notification correctly', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
      };

      const mockMembers = [{ user_id: 'admin-1', role: 'admin' }];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProject,
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
                  in: jest.fn().mockResolvedValue({
                    data: mockMembers,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const timestamp = new Date('2024-01-15T10:30:00Z').toISOString();

      await sendTeamCheckInNotification({
        userId: 'worker-1',
        userName: 'Test Worker',
        projectId: 'project-123',
        projectName: 'Test Project',
        action: 'check_in',
        timestamp,
      });

      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1'],
        expect.objectContaining({
          type: 'team_checkin',
          title: expect.stringContaining('✅'),
          title: expect.stringContaining('Test Worker'),
          title: expect.stringContaining('checkade in'),
          body: expect.stringContaining('Test Project'),
          data: expect.objectContaining({
            user_id: 'worker-1',
            user_name: 'Test Worker',
            project_id: 'project-123',
            project_name: 'Test Project',
            action: 'check_in',
            timestamp,
          }),
        })
      );
    });

    it('should format check-out notification correctly', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
      };

      const mockMembers = [{ user_id: 'admin-1', role: 'admin' }];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProject,
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
                  in: jest.fn().mockResolvedValue({
                    data: mockMembers,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const timestamp = new Date('2024-01-15T17:00:00Z').toISOString();

      await sendTeamCheckInNotification({
        userId: 'worker-1',
        userName: 'Test Worker',
        projectId: 'project-123',
        projectName: 'Test Project',
        action: 'check_out',
        timestamp,
      });

      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1'],
        expect.objectContaining({
          type: 'team_checkout',
          title: expect.stringContaining('👋'),
          title: expect.stringContaining('Test Worker'),
          title: expect.stringContaining('checkade ut'),
          body: expect.stringContaining('Test Project'),
          data: expect.objectContaining({
            action: 'check_out',
            timestamp,
          }),
        })
      );
    });

    it('should use project name from database if not provided', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Database Project Name',
        org_id: 'org-123',
      };

      const mockMembers = [{ user_id: 'admin-1', role: 'admin' }];

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProject,
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
                  in: jest.fn().mockResolvedValue({
                    data: mockMembers,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await sendTeamCheckInNotification({
        userId: 'worker-1',
        userName: 'Test Worker',
        projectId: 'project-123',
        projectName: '', // Empty, should use database name
        action: 'check_in',
        timestamp: new Date().toISOString(),
      });

      expect(sendNotificationToMultipleUsers).toHaveBeenCalledWith(
        ['admin-1'],
        expect.objectContaining({
          body: expect.stringContaining('Database Project Name'),
        })
      );
    });
  });
});

