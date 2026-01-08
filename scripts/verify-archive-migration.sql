-- Quick verification script for archive migration
-- Run this in Supabase SQL Editor to check if migration is needed

-- Check if archive columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'projects'
    AND column_name IN ('is_archived', 'archived_at', 'archived_by')
ORDER BY column_name;

-- Check if helper functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('is_project_archived', 'is_project_active');

-- Check if index exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'projects'
    AND indexname = 'idx_projects_is_archived';

-- Sample: Check current archive status of projects
SELECT 
    id,
    name,
    is_archived,
    archived_at,
    archived_by,
    status
FROM projects
ORDER BY created_at DESC
LIMIT 10;










