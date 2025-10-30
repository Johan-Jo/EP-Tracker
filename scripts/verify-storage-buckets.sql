-- ============================================
-- VERIFY STORAGE BUCKETS
-- ============================================
-- Run this to check if all buckets and policies are set up correctly

-- ============================================
-- 1. CHECK BUCKETS EXIST
-- ============================================

SELECT 
    '=== STORAGE BUCKETS ===' as check_type,
    id as bucket_name,
    CASE 
        WHEN public THEN '✅ Public' 
        ELSE '🔒 Private' 
    END as access,
    created_at,
    CASE 
        WHEN id = 'receipts' THEN '✅ FOUND'
        WHEN id = 'diary-photos' THEN '✅ FOUND'
        WHEN id = 'ata-photos' THEN '✅ FOUND'
        WHEN id = 'voice-recordings' THEN '✅ FOUND'
        ELSE '⚠️ Unknown bucket'
    END as status
FROM storage.buckets
WHERE id IN ('receipts', 'diary-photos', 'ata-photos', 'voice-recordings')
ORDER BY id;

-- Check if any required buckets are missing
SELECT 
    '=== MISSING BUCKETS ===' as check_type,
    missing_bucket,
    '❌ NOT FOUND - Please create manually' as action
FROM (
    SELECT 'receipts' as missing_bucket
    WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'receipts')
    UNION ALL
    SELECT 'diary-photos'
    WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'diary-photos')
    UNION ALL
    SELECT 'ata-photos'
    WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'ata-photos')
    UNION ALL
    SELECT 'voice-recordings'
    WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'voice-recordings')
) missing
WHERE missing_bucket IS NOT NULL;

-- ============================================
-- 2. CHECK RLS POLICIES
-- ============================================

-- Count policies per bucket
SELECT 
    '=== RLS POLICIES COUNT ===' as check_type,
    CASE 
        WHEN policyname LIKE '%receipts%' THEN 'receipts'
        WHEN policyname LIKE '%diary%' THEN 'diary-photos'
        WHEN policyname LIKE '%ata%' OR policyname LIKE '%ATA%' THEN 'ata-photos'
        WHEN policyname LIKE '%voice%' THEN 'voice-recordings'
    END as bucket,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ Complete (4 policies)'
        WHEN COUNT(*) > 0 THEN '⚠️ Incomplete (need 4 policies)'
        ELSE '❌ No policies'
    END as status
FROM pg_policies
WHERE tablename = 'objects'
AND (
    policyname LIKE '%receipts%' OR 
    policyname LIKE '%diary%' OR 
    policyname LIKE '%ata%' OR 
    policyname LIKE '%ATA%' OR 
    policyname LIKE '%voice%'
)
GROUP BY bucket
ORDER BY bucket;

-- List all policies in detail
SELECT 
    '=== DETAILED POLICIES ===' as check_type,
    policyname as policy_name,
    cmd as operation,
    roles::text[] as allowed_roles,
    CASE 
        WHEN cmd = 'INSERT' THEN '✅ Upload'
        WHEN cmd = 'UPDATE' THEN '✅ Update'
        WHEN cmd = 'DELETE' THEN '✅ Delete'
        WHEN cmd = 'SELECT' THEN '✅ Read/View'
        ELSE cmd
    END as action
FROM pg_policies
WHERE tablename = 'objects'
AND (
    policyname LIKE '%receipts%' OR 
    policyname LIKE '%diary%' OR 
    policyname LIKE '%ata%' OR 
    policyname LIKE '%ATA%' OR 
    policyname LIKE '%voice%'
)
ORDER BY 
    CASE 
        WHEN policyname LIKE '%receipts%' THEN 1
        WHEN policyname LIKE '%diary%' THEN 2
        WHEN policyname LIKE '%ata%' OR policyname LIKE '%ATA%' THEN 3
        WHEN policyname LIKE '%voice%' THEN 4
    END,
    cmd;

-- ============================================
-- 3. SUMMARY
-- ============================================

SELECT 
    '=== SUMMARY ===' as check_type,
    (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('receipts', 'diary-photos', 'ata-photos', 'voice-recordings')) as buckets_created,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND (policyname LIKE '%receipts%' OR policyname LIKE '%diary%' OR policyname LIKE '%ata%' OR policyname LIKE '%ATA%' OR policyname LIKE '%voice%')) as policies_created,
    CASE 
        WHEN (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('receipts', 'diary-photos', 'ata-photos', 'voice-recordings')) = 4 
        THEN '✅ All 4 buckets exist'
        ELSE '❌ Some buckets missing'
    END as bucket_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND (policyname LIKE '%receipts%' OR policyname LIKE '%diary%' OR policyname LIKE '%ata%' OR policyname LIKE '%ATA%' OR policyname LIKE '%voice%')) >= 16 
        THEN '✅ All policies exist (16 total)'
        ELSE '⚠️ Some policies may be missing'
    END as policy_status;

