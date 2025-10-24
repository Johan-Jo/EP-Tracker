# Supabase Invite Setup via CLI

This document explains how the invite flow has been configured using Supabase CLI configuration files.

## What Was Configured

### 1. Email Template (`supabase/templates/invite.html`)

The invite email template uses the correct Supabase variable:
- ✅ `{{ .ConfirmationURL }}` - Takes user to Supabase's password setup page
- ❌ NOT `{{ .SiteURL }}` - Would just link to homepage

**Template Location:** `supabase/templates/invite.html`

**Configuration in `config.toml`:**
```toml
[auth.email.template.invite]
subject = "Välkommen till EP-Tracker!"
content_path = "./supabase/templates/invite.html"
```

### 2. Redirect URLs (`supabase/config.toml`)

Added the following redirect URLs to allow post-authentication redirects:

```toml
[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = [
  "https://127.0.0.1:3000",
  "http://localhost:3000/api/auth/callback",
  "http://localhost:3000/welcome",
  "http://127.0.0.1:3000/api/auth/callback",
  "http://127.0.0.1:3000/welcome"
]
```

## How to Apply Configuration

### Option 1: Use the PowerShell Script (Recommended)

```powershell
.\scripts\apply-invite-setup.ps1
```

This script will:
1. Stop Supabase if running
2. Start Supabase with the new configuration
3. Display a summary of changes

### Option 2: Manual Commands

```bash
# Stop Supabase
supabase stop

# Start Supabase with new config
supabase start
```

The changes in `config.toml` and email templates are automatically applied when Supabase starts.

## Testing the Invite Flow

### 1. Start Your Development Environment

```bash
# Terminal 1: Start Supabase
supabase start

# Terminal 2: Start Next.js
npm run dev
```

### 2. Send a Test Invite

1. Go to: http://localhost:3000/dashboard/settings/users
2. Click "Invite User"
3. Fill in:
   - Email: `test@example.com`
   - Role: `worker`
   - Full Name: `Test User`
4. Click "Send Invitation"

### 3. Check the Email

1. Open InBucket: http://localhost:54324
2. Find the invite email
3. Verify it has a link that says "Acceptera inbjudan och sätt lösenord"

### 4. Test the Flow

1. Click the link in the email
2. You should see Supabase's "Set Password" page (hosted by Supabase)
3. Enter a password and click "Set Password"
4. You should be redirected to `/welcome`
5. Click "Gå till Dashboard"
6. You should land on the dashboard with full access

## Expected Flow Diagram

```
Admin invites user
  ↓
POST /api/users/invite
  ↓
Supabase sends invite email
  ↓
User clicks link in email
  ↓
Supabase "Set Password" page
  ↓
User sets password
  ↓
Redirect to /api/auth/callback?code=XXX&next=/welcome
  ↓
Callback exchanges code for session
  ↓
Redirect to /welcome
  ↓
Welcome page loads with role-based content
  ↓
User clicks "Go to Dashboard"
  ↓
Dashboard loads
```

## Troubleshooting

### Problem: "Invalid redirect URL" error

**Solution:** Make sure you've restarted Supabase after updating `config.toml`:
```bash
supabase stop
supabase start
```

### Problem: Email links to homepage instead of password page

**Solution:** Check that `supabase/templates/invite.html` uses `{{ .ConfirmationURL }}`:
```html
<a href="{{ .ConfirmationURL }}">Acceptera inbjudan och sätt lösenord</a>
```

### Problem: Email not sent

**Solution:** Check InBucket at http://localhost:54324 to see all emails sent during local development.

### Problem: "Link expired" error

**Cause:** Invite links expire after 24 hours by default.

**Solution:** Either:
1. Send a new invite
2. Or adjust the expiration in `config.toml` (not recommended for security):
   ```toml
   [auth.email]
   otp_expiry = 86400  # 24 hours in seconds
   ```

## Differences Between Local and Production

### Local Development
- Uses InBucket for email testing (http://localhost:54324)
- Redirect URLs use `localhost` and `127.0.0.1`
- Email templates are loaded from `supabase/templates/`

### Production (Supabase Cloud)
- Uses real email delivery
- Must configure redirect URLs in Supabase Dashboard:
  - Go to **Authentication** → **URL Configuration**
  - Add your production URLs:
    - `https://yourdomain.com/api/auth/callback`
    - `https://yourdomain.com/welcome`
- Email templates must be configured in Supabase Dashboard:
  - Go to **Authentication** → **Email Templates**
  - Update "Invite user" template

## Production Deployment Checklist

Before deploying to production:

- [ ] Update redirect URLs in Supabase Dashboard with production URLs
- [ ] Update email template in Supabase Dashboard (or use Supabase CLI to link)
- [ ] Test invite flow end-to-end in production
- [ ] Verify email deliverability (check spam folders)
- [ ] Configure custom SMTP server (optional, for better deliverability)

## Applying to Production via CLI

To link your local configuration to production:

```bash
# Link to your production project
supabase link --project-ref your-project-ref

# Push the email templates
# Note: This requires manual verification in dashboard
# The email templates need to be copied manually or via Supabase API
```

**Note:** Email template deployment via CLI is limited. You'll need to:
1. Copy content from `supabase/templates/invite.html`
2. Paste into Supabase Dashboard → Authentication → Email Templates → Invite user

## Files Modified

- ✅ `supabase/config.toml` - Added redirect URLs
- ✅ `supabase/templates/invite.html` - Email template (already correct)
- ✅ `scripts/apply-invite-setup.ps1` - Helper script to apply changes

## Summary

The invite flow is now configured via Supabase CLI configuration files:

1. **Email template** uses `{{ .ConfirmationURL }}` to direct users to password setup
2. **Redirect URLs** are whitelisted for post-auth redirects
3. **Configuration** is version-controlled and applied automatically on `supabase start`

Simply run `supabase start` and the configuration is applied! 🎉

