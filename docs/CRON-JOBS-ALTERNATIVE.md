# Alternative Cron Job Solutions

Since Vercel Hobby plan only allows cron jobs to run once per day, we need an external solution for running cron jobs every 15 minutes.

## ✅ Solution 1: GitHub Actions (Recommended - Free)

### Setup Steps:

1. **Add GitHub Secrets:**
   - Go to: `Settings → Secrets and variables → Actions`
   - Add:
     - `APP_URL`: Your Vercel production URL (e.g., `https://ep-tracker.vercel.app`)
     - `CRON_SECRET`: Same secret as `CRON_SECRET` in Vercel env vars

2. **The workflow file is already created:**
   - `.github/workflows/cron-jobs.yml`
   - Runs every 15 minutes automatically
   - Can be manually triggered from GitHub Actions tab

3. **Verify it works:**
   - Go to: `Actions` tab in GitHub
   - You should see "Cron Jobs" workflow running every 15 minutes
   - Check logs to ensure API calls succeed

### Pros:
- ✅ Free for public repos
- ✅ Reliable (GitHub infrastructure)
- ✅ Easy to monitor and debug
- ✅ Can trigger manually

### Cons:
- ⚠️ Limited to 2000 minutes/month for private repos (free tier)
- ⚠️ Requires public repo OR GitHub Pro for unlimited

---

## ✅ Solution 2: External Cron Service (Easiest)

### Option A: cron-job.org (Free)

1. **Sign up:** https://cron-job.org (free tier: 3 jobs)

2. **Create 4 cron jobs:**
   - URL: `https://your-app.vercel.app/api/cron/checkin-reminders`
   - Method: GET
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`
   - Schedule: Every 15 minutes (`*/15 * * * *`)

   Repeat for:
   - `/api/cron/checkout-reminders`
   - `/api/cron/late-checkin-alerts`
   - `/api/cron/forgotten-checkout-alerts`

### Option B: EasyCron (Free tier: 1 job)

1. **Sign up:** https://www.easycron.com
2. Create one cron job that calls all 4 endpoints sequentially

### Pros:
- ✅ Very easy to set up
- ✅ Free tiers available
- ✅ No code changes needed

### Cons:
- ⚠️ Free tiers have limitations
- ⚠️ Less control than GitHub Actions

---

## ✅ Solution 3: Supabase Edge Functions + pg_cron

If you have Supabase Pro, you can use `pg_cron`:

```sql
-- Schedule cron job in Supabase
SELECT cron.schedule(
  'checkin-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://your-app.vercel.app/api/cron/checkin-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET'
    )
  ) AS request_id;
  $$
);
```

### Pros:
- ✅ Runs in your database infrastructure
- ✅ Very reliable

### Cons:
- ⚠️ Requires Supabase Pro plan
- ⚠️ More complex setup

---

## ✅ Solution 4: Cloudflare Workers (Free tier)

Create a Cloudflare Worker that calls your endpoints:

```javascript
addEventListener('scheduled', event => {
  event.waitUntil(triggerCronJobs());
});

async function triggerCronJobs() {
  const endpoints = [
    '/api/cron/checkin-reminders',
    '/api/cron/checkout-reminders',
    '/api/cron/late-checkin-alerts',
    '/api/cron/forgotten-checkout-alerts'
  ];
  
  for (const endpoint of endpoints) {
    await fetch(`https://your-app.vercel.app${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });
  }
}
```

### Pros:
- ✅ Free tier available
- ✅ Very fast (edge network)

### Cons:
- ⚠️ Requires Cloudflare account
- ⚠️ More setup complexity

---

## 🎯 Recommended Approach

**Use GitHub Actions** (Solution 1) because:
1. Already configured in `.github/workflows/cron-jobs.yml`
2. Free for public repos
3. Easy to monitor and debug
4. No external dependencies

**If GitHub Actions doesn't work**, use **cron-job.org** (Solution 2) as it's the easiest fallback.

---

## Testing

After setting up any solution:

1. **Test manually:**
   ```bash
   curl -X GET "https://your-app.vercel.app/api/cron/checkin-reminders" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

2. **Check logs:**
   - Vercel logs should show successful requests
   - Check notification_log table in Supabase

3. **Monitor:**
   - GitHub Actions: Check "Actions" tab
   - External service: Check their dashboard
   - Vercel: Check function logs

