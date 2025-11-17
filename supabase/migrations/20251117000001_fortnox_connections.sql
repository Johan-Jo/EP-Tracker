-- Migration: Create fortnox_connections table
-- Description: Stores OAuth connection credentials for Fortnox integration per organization
-- Date: 2025-11-17

CREATE TABLE IF NOT EXISTS public.fortnox_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    scopes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id)
);

CREATE INDEX IF NOT EXISTS idx_fortnox_connections_org_id ON public.fortnox_connections(org_id);

COMMENT ON TABLE public.fortnox_connections IS 'OAuth connection credentials for Fortnox integration per organization';
COMMENT ON COLUMN public.fortnox_connections.access_token IS 'OAuth access token for Fortnox API';
COMMENT ON COLUMN public.fortnox_connections.refresh_token IS 'OAuth refresh token for renewing access token';
COMMENT ON COLUMN public.fortnox_connections.access_token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN public.fortnox_connections.scopes IS 'OAuth scopes granted for this connection';

-- Keep updated_at in sync
DROP TRIGGER IF EXISTS update_fortnox_connections_updated_at ON public.fortnox_connections;
CREATE TRIGGER update_fortnox_connections_updated_at
    BEFORE UPDATE ON public.fortnox_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and define org-based policies
ALTER TABLE public.fortnox_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view fortnox connections in their org" ON public.fortnox_connections;
DROP POLICY IF EXISTS "Admins can manage fortnox connections" ON public.fortnox_connections;
DROP POLICY IF EXISTS "Admins and finance can manage fortnox connections" ON public.fortnox_connections;

CREATE POLICY "Users can view fortnox connections in their org"
    ON public.fortnox_connections
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = fortnox_connections.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
        )
    );

CREATE POLICY "Admins and finance can manage fortnox connections"
    ON public.fortnox_connections
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = fortnox_connections.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
              AND memberships.role IN ('admin', 'finance')
        )
    );

