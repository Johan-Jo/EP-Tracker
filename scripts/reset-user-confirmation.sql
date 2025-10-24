-- Reset user confirmation status to test pending invitations
-- This script will make a user appear as "pending" (not confirmed)

-- Find Kuk-Rune's user ID
DO $$
DECLARE
    target_email TEXT := 'j@johan.com.br'; -- Kuk-Rune's email
    target_user_id UUID;
BEGIN
    -- Get the user_id from profiles
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found', target_email;
    ELSE
        RAISE NOTICE 'Found user: % with ID: %', target_email, target_user_id;
        
        -- Reset confirmation timestamps in auth.users
        -- This makes the user appear as "not confirmed" / "pending"
        UPDATE auth.users
        SET 
            email_confirmed_at = NULL,
            confirmed_at = NULL,
            updated_at = now()
        WHERE id = target_user_id;
        
        RAISE NOTICE '✅ User % reset to pending status', target_email;
        RAISE NOTICE 'They will now show with yellow "Väntar på registrering" badge';
        RAISE NOTICE 'You can now test the "Skicka ny inbjudan" button';
    END IF;
END $$;

