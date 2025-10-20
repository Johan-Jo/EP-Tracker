-- Fix existing user email confirmation
-- Run this in Supabase SQL Editor to confirm the email for johan270511@gmail.com

UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'johan270511@gmail.com'
AND email_confirmed_at IS NULL;

