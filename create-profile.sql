-- Create profile for Johan
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES (
    '53660a15-bd3d-46b1-8766-e1ad474e8d74'::uuid,
    'oi@johan.com.br',
    'Johan',
    '2025-10-18 21:47:21.305288+00'::timestamptz,
    NOW()
);

-- Verify it worked
SELECT * FROM profiles WHERE email = 'oi@johan.com.br';

