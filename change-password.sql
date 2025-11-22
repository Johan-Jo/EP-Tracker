-- Change password for user j@johan.com.br to KalleBalle
-- Run this in Supabase SQL Editor
-- Note: Requires service_role permissions to update auth.users

DO $$
DECLARE
    target_email TEXT := 'j@johan.com.br';
    new_password TEXT := 'KalleBalle';
    target_user_id UUID;
    password_hash TEXT;
BEGIN
    -- Find the user by email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', target_email;
    END IF;

    RAISE NOTICE 'Found user: % with ID: %', target_email, target_user_id;

    -- Generate bcrypt hash for the new password
    -- 'bf' = blowfish (bcrypt), 10 = cost factor
    password_hash := crypt(new_password, gen_salt('bf', 10));

    -- Update the password in auth.users
    UPDATE auth.users
    SET 
        encrypted_password = password_hash,
        updated_at = now()
    WHERE id = target_user_id;

    RAISE NOTICE '✅ Password updated successfully for %', target_email;
    RAISE NOTICE 'New password: %', new_password;
END $$;

