-- Refresh PostgREST schema cache after adding customer_id to projects
-- Run this AFTER 202511131200_customer_registry.sql

NOTIFY pgrst, 'reload schema';

