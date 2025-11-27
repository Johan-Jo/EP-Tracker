-- Verify user email confirmation
-- Run this in Supabase SQL Editor to confirm the email for matskarlsson293@gmail.com

UPDATE auth.users
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'matskarlsson293@gmail.com';

-- Verify the update was successful
SELECT 
    id,
    email,
    email_confirmed_at,
    confirmed_at,
    created_at
FROM auth.users
WHERE email = 'matskarlsson293@gmail.com';

