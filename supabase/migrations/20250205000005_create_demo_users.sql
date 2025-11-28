-- Create demo users for demo organization
-- This creates auth.users and profiles for demo mode

-- Function to create demo users
DO $$
DECLARE
    demo_org_id UUID := '00000000-0000-0000-0000-000000000000';
    user_id UUID;
    user_email TEXT;
    user_name TEXT;
    user_role TEXT;
    hourly_rate INTEGER;
BEGIN
    -- Array of demo users
    DECLARE
        demo_users CURSOR FOR
        SELECT * FROM (VALUES
            ('admin@epbygg.se', 'Erik Andersson', 'admin', 450),
            ('forman@epbygg.se', 'Lars Johansson', 'foreman', 380),
            ('arbetare1@epbygg.se', 'Mikael Karlsson', 'worker', 320),
            ('arbetare2@epbygg.se', 'Anders Nilsson', 'worker', 320),
            ('arbetare3@epbygg.se', 'Johan Larsson', 'worker', 310),
            ('arbetare4@epbygg.se', 'Maria Olsson', 'worker', 315),
            ('arbetare5@epbygg.se', 'Sara Persson', 'worker', 310),
            ('ekonomi@epbygg.se', 'Emma Eriksson', 'finance', 350)
        ) AS t(email, name, role, rate);
    BEGIN
        FOR user_rec IN demo_users LOOP
            user_email := user_rec.email;
            user_name := user_rec.name;
            user_role := user_rec.role;
            hourly_rate := user_rec.rate;
            
            -- Generate deterministic UUID from email
            user_id := gen_random_uuid();
            
            -- Check if user already exists
            IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
                -- Create auth user
                INSERT INTO auth.users (
                    id,
                    instance_id,
                    email,
                    encrypted_password,
                    email_confirmed_at,
                    created_at,
                    updated_at,
                    raw_app_meta_data,
                    raw_user_meta_data,
                    is_super_admin,
                    role
                ) VALUES (
                    user_id,
                    '00000000-0000-0000-0000-000000000000',
                    user_email,
                    crypt('demo-password-123', gen_salt('bf')), -- Demo password (not used in demo mode)
                    NOW(),
                    NOW(),
                    NOW(),
                    '{"provider": "email", "providers": ["email"]}',
                    jsonb_build_object('full_name', user_name),
                    false,
                    'authenticated'
                );
                
                -- Create profile
                INSERT INTO profiles (id, email, full_name)
                VALUES (user_id, user_email, user_name)
                ON CONFLICT (id) DO UPDATE
                SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;
                
                -- Create membership
                INSERT INTO memberships (org_id, user_id, role, hourly_rate_sek, is_active)
                VALUES (demo_org_id, user_id, user_role, hourly_rate, true)
                ON CONFLICT (org_id, user_id) DO UPDATE
                SET role = EXCLUDED.role, hourly_rate_sek = EXCLUDED.hourly_rate_sek, is_active = true;
            END IF;
        END LOOP;
    END;
END $$;

COMMENT ON TABLE profiles IS 'Profiles table - includes demo users for demo mode';

