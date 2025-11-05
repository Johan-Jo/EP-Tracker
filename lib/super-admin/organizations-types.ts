/**
 * Organization Types
 * 
 * Type definitions for organizations that can be used in both server and client components.
 * These types have no dependencies on server-only code.
 */

export interface OrganizationWithDetails {
  id: string;
  name: string;
  status: string;
  plan_id: string | null;
  storage_used_bytes: number;
  trial_ends_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  plan?: {
    id: string;
    name: string;
    price_sek: number;
    billing_cycle: string;
    max_users: number;
    max_storage_gb: number;
  };
  subscription?: {
    id: string;
    status: string;
    current_period_end: string;
  };
  user_count?: number;
  project_count?: number;
  last_activity?: string;
}

