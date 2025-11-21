/**
 * Unit tests for /api/notifications/preferences route
 * Tests GET and PUT endpoints for notification preferences
 */

import { GET, PUT } from '@/app/api/notifications/preferences/route';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
jest.mock('@/lib/supabase/server');

describe('/api/notifications/preferences', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET', () => {
    it('should return user preferences when they exist', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockPrefs = {
        user_id: 'user-123',
        checkout_reminders: true,
        team_checkins: false,
        approvals_needed: true,
        delivery_methods: {
          checkout_reminders: 'push',
          team_checkins: 'email',
        },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockPrefs,
              error: null,
            }),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPrefs);
    });

    it('should return default preferences when user has none', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user_id).toBe('user-123');
      expect(data.checkout_reminders).toBe(true);
      expect(data.team_checkins).toBe(true);
      expect(data.delivery_methods).toBeDefined();
    });

    it('should add default delivery_methods if missing', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockPrefs = {
        user_id: 'user-123',
        checkout_reminders: true,
        // delivery_methods missing
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockPrefs,
              error: null,
            }),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.delivery_methods).toBeDefined();
      expect(data.delivery_methods.checkout_reminders).toBe('push');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST500', message: 'Database error' },
            }),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch preferences');
    });

    it('should ignore PGRST116 error (not found)', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' }, // Should be ignored
            }),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user_id).toBe('user-123'); // Returns defaults
    });
  });

  describe('PUT', () => {
    it('should update user preferences', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const updates = {
        checkout_reminders: false,
        team_checkins: true,
        delivery_methods: {
          checkout_reminders: 'email',
        },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { ...updates, user_id: 'user-123' },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockUpsert = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const request = new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          ...updates,
        }),
        expect.objectContaining({
          onConflict: 'user_id',
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ checkout_reminders: false }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const request = new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ checkout_reminders: false }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update preferences');
    });

    it('should handle invalid JSON', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Create a request with invalid JSON - request.json() will throw
      const request = new Request('http://localhost', {
        method: 'PUT',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      // The route catches JSON parse errors and returns 500
      const response = await PUT(request);
      expect(response.status).toBe(500);
    });
  });
});

