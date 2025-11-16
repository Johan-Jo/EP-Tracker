-- Add theme_preference to profiles so we can persist user theme (light/dark) per user

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme_preference TEXT CHECK (theme_preference IN ('light', 'dark')) DEFAULT NULL;

COMMENT ON COLUMN profiles.theme_preference IS 'Optional UI theme preference for the user (light or dark).';


