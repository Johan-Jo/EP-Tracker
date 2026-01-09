-- Allow public read access to demo organization attendance_session
-- This enables anonymous users to view demo attendance sessions in demo mode

-- Attendance sessions: Allow public read access to demo org attendance sessions
DROP POLICY IF EXISTS "Public can read demo attendance sessions" ON attendance_session;
CREATE POLICY "Public can read demo attendance sessions"
ON attendance_session
FOR SELECT
TO public
USING (org_id = (SELECT id FROM organizations WHERE slug = 'demo' LIMIT 1));

COMMENT ON POLICY "Public can read demo attendance sessions" ON attendance_session IS 
'Allows anonymous and authenticated users to read attendance sessions for the demo organization in demo mode';
