# 🚀 Vercel Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ 1. Git Repository
Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### ✅ 2. Supabase Setup

Ensure these are completed in Supabase Dashboard:

1. **Run SQL Migrations:**
   - Go to Supabase Studio → SQL Editor
   - Run `fix-signup-complete.sql` (if not already done)
   - Run `fix-user-email.sql` (if needed for existing users)

2. **Configure Email Templates:**
   - Go to: Authentication → Email Templates
   - Update "Confirm signup" template with your branding
   - Set redirect URL: `{{ .SiteURL }}/api/auth/callback`

3. **Configure Auth Settings:**
   - Go to: Authentication → URL Configuration
   - Set **Site URL:** `https://your-domain.vercel.app`
   - Add to **Redirect URLs:**
     - `https://your-domain.vercel.app/api/auth/callback`
     - `https://your-domain.vercel.app/welcome`

4. **Get API Keys:**
   - Go to: Project Settings → API
   - Copy:
     - `Project URL` (NEXT_PUBLIC_SUPABASE_URL)
     - `anon/public` key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
     - `service_role` key (SUPABASE_SERVICE_ROLE_KEY) - **Keep secret!**

### ✅ 3. Environment Variables

You'll need these for Vercel:

```bash
# Required - Public (Safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Required - Secret (Never commit)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Required - Your Vercel domain
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## 🚀 Deployment Steps

### Option 1: Vercel Dashboard (Recommended)

1. **Visit Vercel:**
   - Go to: https://vercel.com/new
   - Sign in with GitHub

2. **Import Repository:**
   - Click "Import Project"
   - Select your `EP-Tracker` repository
   - Click "Import"

3. **Configure Project:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (leave default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

4. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add each variable from above:
     - Key: `NEXT_PUBLIC_SUPABASE_URL`
     - Value: `https://your-project.supabase.co`
     - Environment: Production, Preview, Development (all)
   - Repeat for all 3 required variables

5. **Deploy:**
   - Click "Deploy"
   - Wait 2-5 minutes for build
   - You'll get a URL like: `ep-tracker-xyz.vercel.app`

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - What's your project's name? ep-tracker
# - In which directory is your code located? ./
# - Want to override settings? No

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_APP_URL production

# Deploy to production
vercel --prod
```

---

## 🔧 Post-Deployment Configuration

### 1. Update Supabase with Vercel URL

Go to Supabase → Authentication → URL Configuration:

```bash
Site URL: https://your-domain.vercel.app

Redirect URLs:
- https://your-domain.vercel.app/api/auth/callback
- https://your-domain.vercel.app/welcome
- https://your-domain.vercel.app/dashboard

# If using custom domain:
- https://yourdomain.com/api/auth/callback
- https://yourdomain.com/welcome
```

### 2. Test Email Verification

1. Register a new account on production
2. Check email (and spam folder!)
3. Click verification link
4. Should redirect to `/welcome`
5. Click "Gå till Dashboard"
6. Should be logged in ✅

### 3. Verify PWA Manifest

Open: `https://your-domain.vercel.app/manifest.json`

Update `public/manifest.json` if needed:
```json
{
  "name": "EP Time Tracker",
  "short_name": "EP Tracker",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#ea580c",
  "background_color": "#ffffff"
}
```

---

## 🔒 Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is NOT in Git
- [ ] All RLS policies are enabled in Supabase
- [ ] CORS is configured correctly in Supabase
- [ ] Email verification is required (`email_confirm: false`)
- [ ] Production environment variables are set
- [ ] Custom domain has SSL (automatic with Vercel)

---

## 📊 Monitoring & Analytics (Optional)

### Vercel Analytics

1. Go to your project in Vercel Dashboard
2. Click "Analytics" tab
3. Enable "Web Analytics"
4. View real-time metrics:
   - Page views
   - Real User Monitoring (RUM)
   - Core Web Vitals

### Sentry Error Tracking (Recommended)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# Add to .env
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

---

## 🐛 Troubleshooting

### Build Fails

**Error:** "Module not found"
- Check `package.json` dependencies
- Run `npm install` locally
- Push `package-lock.json` to Git

**Error:** "Type errors"
- Run `npm run build` locally first
- Fix all TypeScript errors
- Commit and redeploy

### Runtime Errors

**Error:** "Failed to fetch"
- Check environment variables in Vercel Dashboard
- Verify Supabase URL and keys
- Check browser console for CORS errors

**Error:** "Email verification not working"
- Check Supabase Email logs
- Verify Redirect URLs include your Vercel domain
- Test with different email provider

### Performance Issues

- Enable Vercel Edge Functions (Settings → Functions)
- Enable Vercel Image Optimization (automatic)
- Check Next.js bundle size: `npm run build`
- Review Vercel Analytics for slow pages

---

## 🔄 Continuous Deployment

Vercel automatically deploys when you push to `main`:

```bash
git add .
git commit -m "Your changes"
git push origin main

# Vercel will:
# 1. Detect push
# 2. Run build
# 3. Deploy to production
# 4. Send deployment notification
```

### Preview Deployments

Every PR gets a preview URL:
- Create a branch: `git checkout -b feature/new-feature`
- Push changes: `git push origin feature/new-feature`
- Create PR on GitHub
- Vercel creates preview: `ep-tracker-git-feature-new-feature-xyz.vercel.app`

---

## 📱 Custom Domain (Optional)

1. **Buy Domain** (Namecheap, GoDaddy, etc.)

2. **Add to Vercel:**
   - Go to: Project Settings → Domains
   - Click "Add"
   - Enter: `yourdomain.com`
   - Follow DNS instructions

3. **Update Supabase:**
   - Add custom domain to Redirect URLs
   - Update `NEXT_PUBLIC_APP_URL` in Vercel

4. **SSL Certificate:**
   - Automatic with Vercel ✅
   - Usually ready in 5-10 minutes

---

## ✅ Launch Checklist

Before announcing to users:

- [ ] Test registration flow end-to-end
- [ ] Test login/logout
- [ ] Test password reset (if implemented)
- [ ] Verify all roles work (admin, foreman, worker, finance)
- [ ] Test on mobile devices
- [ ] Test offline functionality (PWA)
- [ ] Check page load speeds (< 3s target)
- [ ] Verify email delivery
- [ ] Test error pages (404, 500)
- [ ] Set up monitoring/alerting
- [ ] Create backup plan (Supabase auto-backups)
- [ ] Document support process
- [ ] Prepare user onboarding materials

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Support:** support@vercel.com (Pro plan)
- **Supabase Discord:** https://discord.supabase.com

---

## 🎉 You're Ready!

Your app is production-ready. Go to:
👉 **https://vercel.com/new** and import your repository!

Need help? Ping me! 🚀

