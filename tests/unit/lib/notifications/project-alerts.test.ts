/**
 * Unit tests for project-alerts.ts
 * Tests notifyOnCheckIn and notifyOnCheckOut notification logic
 */

import { notifyOnCheckIn, notifyOnCheckOut } from '@/lib/notifications/project-alerts';
import { sendNotification } from '@/lib/notifications/send-notification';
import { createAdminClient } from '@/lib/supabase/server';

// Mock dependencies
jest.mock('@/lib/notifications/send-notification');
jest.mock('@/lib/supabase/server');

describe('notifyOnCheckIn', () => {
  const mockAdminClient = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);
    (sendNotification as jest.Mock).mockResolvedValue({
      success: true,
      sent: 1,
      failed: 0,
      method: 'push',
    });
  });

  describe('project fetching', () => {
    it('should fetch project and send notifications to admins/foremen', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          notify_on_checkin: true,
          alert_recipients: ['admin', 'foreman'],
        },
      };

      const mockRecipients = [
        { user_id: 'admin-1' },
        { user_id: 'foreman-1' },
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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await notifyOnCheckIn({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkinTime: new Date('2024-01-01T08:00:00'),
      });

      expect(mockAdminClient.from).toHaveBeenCalledWith('projects');
      expect(mockAdminClient.from).toHaveBeenCalledWith('memberships');
      expect(sendNotification).toHaveBeenCalledTimes(2); // admin-1 and foreman-1
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          type: 'team_checkin',
          title: expect.stringContaining('Test Worker'),
          body: expect.stringContaining('Test Project'),
          skipQuietHours: true,
        })
      );
      expect(result?.success).toBe(true);
      expect(result?.sentCount).toBe(2);
    });

    it('should use admin client to bypass RLS', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          alert_recipients: ['admin'],
        },
      };

      const mockRecipients = [{ user_id: 'admin-1' }];

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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await notifyOnCheckIn({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkinTime: new Date('2024-01-01T08:00:00'),
      });

      expect(createAdminClient).toHaveBeenCalled();
    });

    it('should work even if notify_on_checkin is not enabled in project settings', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          notify_on_checkin: false, // Not enabled, but should still work
          alert_recipients: ['admin'],
        },
      };

      const mockRecipients = [{ user_id: 'admin-1' }];

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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await notifyOnCheckIn({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkinTime: new Date('2024-01-01T08:00:00'),
      });

      // Should still send notifications (sendNotification will check user preferences)
      expect(sendNotification).toHaveBeenCalled();
      expect(result?.success).toBe(true);
    });
  });

  describe('recipient filtering', () => {
    it('should filter out the user who checked in', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          alert_recipients: ['admin'],
        },
      };

      const mockRecipients = [
        { user_id: 'admin-1' },
        { user_id: 'worker-1' }, // This is the user who checked in
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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await notifyOnCheckIn({
        projectId: 'project-123',
        userId: 'worker-1', // This user checked in
        userName: 'Test Worker',
        checkinTime: new Date('2024-01-01T08:00:00'),
      });

      // Should only send to admin-1, not worker-1
      expect(sendNotification).toHaveBeenCalledTimes(1);
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
        })
      );
      expect(sendNotification).not.toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'worker-1',
        })
      );
    });
  });
});

describe('notifyOnCheckOut', () => {
  const mockAdminClient = {
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);
    (sendNotification as jest.Mock).mockResolvedValue({
      success: true,
      sent: 1,
      failed: 0,
      method: 'push',
    });
  });

  describe('project fetching', () => {
    it('should fetch project and send notifications to admins/foremen', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          notify_on_checkout: true,
          alert_recipients: ['admin', 'foreman'],
        },
      };

      const mockRecipients = [
        { user_id: 'admin-1' },
        { user_id: 'foreman-1' },
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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5,
      });

      expect(mockAdminClient.from).toHaveBeenCalledWith('projects');
      expect(mockAdminClient.from).toHaveBeenCalledWith('memberships');
      expect(sendNotification).toHaveBeenCalledTimes(2); // admin-1 and foreman-1
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          type: 'team_checkout',
          title: expect.stringContaining('Test Worker'),
          body: expect.stringContaining('Test Project'),
          skipQuietHours: true,
        })
      );
      expect(result?.success).toBe(true);
      expect(result?.sentCount).toBe(2);
    });

    it('should use admin client to bypass RLS', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          alert_recipients: ['admin'],
        },
      };

      const mockRecipients = [{ user_id: 'admin-1' }];

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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5,
      });

      expect(createAdminClient).toHaveBeenCalled();
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

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5,
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Check-out Notification] Error fetching project:',
        expect.any(Object)
      );
      expect(sendNotification).not.toHaveBeenCalled();
      expect(result).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });

    it('should work even if notify_on_checkout is not enabled in project settings', async () => {
      // This tests that we removed the requirement for notify_on_checkout
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          notify_on_checkout: false, // Not enabled, but should still work
          alert_recipients: ['admin'],
        },
      };

      const mockRecipients = [{ user_id: 'admin-1' }];

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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5,
      });

      // Should still send notifications (sendNotification will check user preferences)
      expect(sendNotification).toHaveBeenCalled();
      expect(result?.success).toBe(true);
    });
  });

  describe('recipient filtering', () => {
    it('should filter out the user who checked out', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          alert_recipients: ['admin'],
        },
      };

      const mockRecipients = [
        { user_id: 'admin-1' },
        { user_id: 'worker-1' }, // This is the user who checked out
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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1', // This user checked out
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5,
      });

      // Should only send to admin-1, not worker-1
      expect(sendNotification).toHaveBeenCalledTimes(1);
      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
        })
      );
      expect(sendNotification).not.toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'worker-1',
        })
      );
    });

    it('should handle no recipients after filtering', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          alert_recipients: ['admin'],
        },
      };

      const mockRecipients = [{ user_id: 'worker-1' }]; // Only the user who checked out

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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Check-out Notification] No recipients after filtering out user'
      );
      expect(sendNotification).not.toHaveBeenCalled();
      expect(result).toBeUndefined();

      consoleLogSpy.mockRestore();
    });

    it('should handle no recipients in organization', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          alert_recipients: ['admin'],
        },
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

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Check-out Notification] No admins/foremen to notify in organization',
        'org-123'
      );
      expect(sendNotification).not.toHaveBeenCalled();
      expect(result).toBeUndefined();

      consoleLogSpy.mockRestore();
    });
  });

  describe('notification content', () => {
    it('should format hours worked correctly', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          alert_recipients: ['admin'],
        },
      };

      const mockRecipients = [{ user_id: 'admin-1' }];

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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5, // 8 hours 30 minutes
      });

      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('8h 30min'),
        })
      );
    });

    it('should include correct notification data', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          alert_recipients: ['admin'],
        },
      };

      const mockRecipients = [{ user_id: 'admin-1' }];

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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5,
      });

      expect(sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'team_checkout',
          title: '🏠 Test Worker checkade ut',
          url: '/dashboard/projects/project-123',
          data: {
            projectId: 'project-123',
            userId: 'worker-1',
            type: 'check_out',
          },
          tag: 'checkout-project-123-worker-1',
          orgId: 'org-123',
          skipQuietHours: true,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle errors when fetching recipients', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          alert_recipients: ['admin'],
        },
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

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5,
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Check-out Notification] Error fetching recipients:',
        expect.any(Object)
      );
      expect(sendNotification).not.toHaveBeenCalled();
      expect(result).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });

    it('should handle errors when sending notifications', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        org_id: 'org-123',
        alert_settings: {
          alert_recipients: ['admin'],
        },
      };

      const mockRecipients = [{ user_id: 'admin-1' }];

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
                    data: mockRecipients,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      (sendNotification as jest.Mock).mockRejectedValue(new Error('Send failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await notifyOnCheckOut({
        projectId: 'project-123',
        userId: 'worker-1',
        userName: 'Test Worker',
        checkoutTime: new Date('2024-01-01T17:00:00'),
        hoursWorked: 8.5,
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending check-out notification:',
        expect.any(Error)
      );
      expect(result?.success).toBe(false);
      expect(result?.failedCount).toBe(1);

      consoleErrorSpy.mockRestore();
    });
  });
});

