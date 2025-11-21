/**
 * Unit tests for send-notification.ts
 * Tests core notification sending logic, preferences, quiet hours, and delivery methods
 */

import { sendNotification, sendNotificationToMultipleUsers } from '@/lib/notifications/send-notification';
import { getMessaging } from '@/lib/notifications/firebase-admin';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';

// Mock dependencies
jest.mock('@/lib/notifications/firebase-admin');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/email/send');

describe('sendNotification', () => {
  const mockSupabase = {
    from: jest.fn(),
    rpc: jest.fn(),
  };

  const mockMessaging = {
    sendEachForMulticast: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (getMessaging as jest.Mock).mockReturnValue(mockMessaging);
  });

  describe('preference checking', () => {
    it('should skip notification if type is disabled in preferences', async () => {
      const mockPrefs = {
        team_checkins: false,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
          }),
        }),
      });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      expect(result.success).toBe(false);
      expect(result.sent).toBe(0);
      expect(mockSupabase.from).toHaveBeenCalledWith('notification_preferences');
    });

    it('should send notification if type is enabled in preferences', async () => {
      const mockPrefs = {
        team_checkins: true,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
          }),
        }),
      });

      // Mock push subscriptions
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ fcm_token: 'token-123', id: 'sub-1' }],
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn() };
      });

      // Mock quiet hours check
      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

      // Mock FCM response
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      expect(result.success).toBe(true);
      expect(result.sent).toBe(1);
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalled();
    });

    it('should default to enabled if no preferences exist', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null }),
              }),
            }),
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ fcm_token: 'token-123', id: 'sub-1' }],
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn() };
      });

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('quiet hours', () => {
    it('should skip push notification during quiet hours', async () => {
      const mockPrefs = {
        team_checkins: true,
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn() };
      });

      // Mock quiet hours check - user is in quiet hours
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      expect(result.success).toBe(false);
      expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
    });

    it('should send push notification when skipQuietHours is true', async () => {
      const mockPrefs = {
        team_checkins: true,
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ fcm_token: 'token-123', id: 'sub-1' }],
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn() };
      });

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null }); // In quiet hours
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
        skipQuietHours: true, // Should bypass quiet hours
      });

      expect(result.success).toBe(true);
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalled();
    });
  });

  describe('delivery methods', () => {
    it('should send push notification when method is "push"', async () => {
      const mockPrefs = {
        team_checkins: true,
        delivery_methods: {
          team_checkins: 'push',
        },
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ fcm_token: 'token-123', id: 'sub-1' }],
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn() };
      });

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      expect(result.method).toBe('push');
      expect(result.success).toBe(true);
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalled();
    });

    it('should send email notification when method is "email"', async () => {
      const mockPrefs = {
        team_checkins: true,
        delivery_methods: {
          team_checkins: 'email',
        },
      };

      (createAdminClient as jest.Mock).mockReturnValue({
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({
              data: {
                user: {
                  email: 'test@example.com',
                  user_metadata: { full_name: 'Test User' },
                },
              },
              error: null,
            }),
          },
        },
      });

      (sendEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { email: 'test@example.com', full_name: 'Test User' },
                }),
              }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn() };
      });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      expect(result.method).toBe('email');
      expect(result.success).toBe(true);
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should send both push and email when method is "both"', async () => {
      const mockPrefs = {
        team_checkins: true,
        delivery_methods: {
          team_checkins: 'both',
        },
      };

      (createAdminClient as jest.Mock).mockReturnValue({
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({
              data: {
                user: {
                  email: 'test@example.com',
                  user_metadata: { full_name: 'Test User' },
                },
              },
              error: null,
            }),
          },
        },
      });

      (sendEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ fcm_token: 'token-123', id: 'sub-1' }],
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { email: 'test@example.com', full_name: 'Test User' },
                }),
              }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn() };
      });

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      expect(result.method).toBe('both');
      expect(result.success).toBe(true);
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe('FCM token handling', () => {
    it('should handle invalid tokens and deactivate them', async () => {
      const mockPrefs = {
        team_checkins: true,
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    { fcm_token: 'invalid-token', id: 'sub-1' },
                    { fcm_token: 'valid-token', id: 'sub-2' },
                  ],
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: jest.fn(),
        };
      });

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: { code: 'messaging/invalid-registration-token' },
          },
          { success: true },
        ],
      });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      expect(result.success).toBe(true); // At least one succeeded
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      // Should deactivate invalid token
      expect(mockSupabase.from).toHaveBeenCalledWith('push_subscriptions');
    });

    it('should handle no active subscriptions gracefully when method is push', async () => {
      const mockPrefs = {
        team_checkins: true,
        delivery_methods: {
          team_checkins: 'push',
        },
      };

      (createAdminClient as jest.Mock).mockReturnValue({
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({
              data: {
                user: {
                  email: 'test@example.com',
                  user_metadata: { full_name: 'Test User' },
                },
              },
              error: null,
            }),
          },
        },
      });

      (sendEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [] }), // No subscriptions
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { email: 'test@example.com', full_name: 'Test User' },
                }),
              }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn() };
      });

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      // Should fallback to email when push has no subscriptions
      expect(result.success).toBe(true);
      expect(result.method).toBe('email');
      expect(result.sent).toBe(1);
      expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should send email when method is "both" but no push subscriptions', async () => {
      const mockPrefs = {
        team_checkins: true,
        delivery_methods: {
          team_checkins: 'both',
        },
      };

      (createAdminClient as jest.Mock).mockReturnValue({
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({
              data: {
                user: {
                  email: 'test@example.com',
                  user_metadata: { full_name: 'Test User' },
                },
              },
              error: null,
            }),
          },
        },
      });

      (sendEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [] }), // No subscriptions
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { email: 'test@example.com', full_name: 'Test User' },
                }),
              }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn() };
      });

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      // Should succeed with email even though push failed
      expect(result.success).toBe(true);
      expect(result.method).toBe('both');
      expect(result.sent).toBe(1); // Email sent
      expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should send email when method is "both" and push fails', async () => {
      const mockPrefs = {
        team_checkins: true,
        delivery_methods: {
          team_checkins: 'both',
        },
      };

      (createAdminClient as jest.Mock).mockReturnValue({
        auth: {
          admin: {
            getUserById: jest.fn().mockResolvedValue({
              data: {
                user: {
                  email: 'test@example.com',
                  user_metadata: { full_name: 'Test User' },
                },
              },
              error: null,
            }),
          },
        },
      });

      (sendEmail as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'email-123',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ fcm_token: 'token-123', id: 'sub-1' }],
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { email: 'test@example.com', full_name: 'Test User' },
                }),
              }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return { select: jest.fn() };
      });

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });
      
      // Push fails
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 0,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: { code: 'messaging/invalid-registration-token' },
          },
        ],
      });

      const result = await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      // Should succeed with email even though push failed
      expect(result.success).toBe(true);
      expect(result.method).toBe('both');
      expect(result.sent).toBe(1); // Email sent
      expect(result.failed).toBe(1); // Push failed
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe('notification logging', () => {
    it('should log successful notifications', async () => {
      const mockPrefs = {
        team_checkins: true,
      };

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPrefs }),
              }),
            }),
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ fcm_token: 'token-123', id: 'sub-1' }],
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'notification_log') {
          return {
            insert: mockInsert,
          };
        }
        return { select: jest.fn() };
      });

      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });
      mockMessaging.sendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      });

      await sendNotification({
        userId: 'user-123',
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          type: 'team_checkin',
          title: 'Test',
          body: 'Test body',
          delivery_status: 'sent',
        })
      );
    });
  });
});

describe('sendNotificationToMultipleUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send notifications to multiple users', async () => {
    // This test verifies that sendNotificationToMultipleUsers calls sendNotification
    // for each user. Since sendNotification is already tested separately, we just
    // verify the function structure works correctly.
    const mockSupabase = {
      from: jest.fn(),
      rpc: jest.fn(),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (getMessaging as jest.Mock).mockReturnValue(null); // No push for this test

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'notification_preferences') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      if (table === 'notification_log') {
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return { select: jest.fn() };
    });

    mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

    const results = await sendNotificationToMultipleUsers(
      ['user-1', 'user-2', 'user-3'],
      {
        type: 'team_checkin',
        title: 'Test',
        body: 'Test body',
        url: '/test',
      }
    );

    expect(results).toHaveLength(3);
    // Each result should be a SendNotificationResult
    results.forEach((result) => {
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('failed');
    });
  });
});

