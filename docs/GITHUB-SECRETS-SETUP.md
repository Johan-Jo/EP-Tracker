# GitHub Secrets Setup Guide

## Step 1: Generate CRON_SECRET (if not already done)

Run this command to generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Or use OpenSSL:
```bash
openssl rand -base64 32
```

**Save this secret** - you'll need it for both Vercel and GitHub.

---

## Step 2: Add Secrets to GitHub

1. **Go to GitHub Secrets:**
   - Visit: https://github.com/Johan-Jo/EP-Tracker/settings/secrets/actions
   - Or: Repository → Settings → Secrets and variables → Actions

2. **Add `APP_URL` secret:**
   - Click "New repository secret"
   - Name: `APP_URL`
   - Value: `https://ep-tracker-9rhji8zui-johans-projects-4b909657.vercel.app`
   - Click "Add secret"

3. **Add `CRON_SECRET` secret:**
   - Click "New repository secret"
   - Name: `CRON_SECRET`
   - Value: `[Paste the generated secret from Step 1]`
   - Click "Add secret"

---

## Step 3: Add CRON_SECRET to Vercel

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/johans-projects-4b909657/ep-tracker/settings/environment-variables

2. **Add Environment Variable:**
   - Key: `CRON_SECRET`
   - Value: `[Same secret from Step 1]`
   - Environment: Production, Preview, Development (select all)
   - Click "Save"

---

## Step 4: Verify Setup

1. **Check GitHub Actions:**
   - Go to: https://github.com/Johan-Jo/EP-Tracker/actions
   - You should see "Cron Jobs" workflow
   - It will run automatically every 15 minutes
   - You can manually trigger it: Click "Cron Jobs" → "Run workflow"

2. **Test Manually:**
   ```bash
   curl -X GET "https://ep-tracker-9rhji8zui-johans-projects-4b909657.vercel.app/api/cron/checkin-reminders" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
   
   Should return JSON response (not 401 Unauthorized)

3. **Check Logs:**
   - GitHub Actions: Check workflow runs for success
   - Vercel: Check function logs for cron endpoint calls

---

## Troubleshooting

**If GitHub Actions fails:**
- Check that secrets are spelled correctly (case-sensitive)
- Verify APP_URL doesn't have trailing slash
- Check workflow logs for error messages

**If endpoints return 401:**
- Verify CRON_SECRET matches in both GitHub and Vercel
- Check that Authorization header format is: `Bearer YOUR_SECRET`

**If workflow doesn't run:**
- Check that workflow file is in `.github/workflows/` directory
- Verify cron schedule syntax: `*/15 * * * *` (every 15 minutes)
- GitHub Actions may take a few minutes to pick up new workflows

