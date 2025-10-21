# PWA Assets Generation Guide

This guide explains how to generate all required PWA assets for EP Tracker.

---

## 📱 Required Assets

### Icons
- **512x512** - Main app icon (PNG, maskable)
- **192x192** - Standard icon (PNG, maskable)
- **180x180** - Apple Touch Icon (PNG)
- **32x32** - Favicon (PNG)
- **16x16** - Favicon (PNG)

### Screenshots
- **Mobile** (9:16 aspect ratio) - At least 1, recommended 3-5
- **Desktop** (16:9 aspect ratio) - At least 1, recommended 3-5

---

## 🎨 Icon Design Guidelines

### Design Specs
- **Base Size:** 512x512px
- **Safe Zone:** 432x432px (80% of canvas for maskable icons)
- **Background:** Solid color or subtle gradient
- **Logo/Text:** Centered within safe zone
- **Format:** PNG with transparency (for logo layer)

### Color Palette (EP Tracker)
- **Primary:** #F97316 (Orange) - For logo/accent
- **Background:** #1E40AF (Blue) - Construction/professional
- **Text:** #FFFFFF (White) - High contrast

### Icon Concept
**Recommended Design:**
```
Background: Blue gradient (#1E40AF → #1E3A8A)
Icon: White hard hat or clock symbol
Text: "EP" in bold white letters
Style: Modern, flat design
```

---

## 🛠️ Generation Tools

### Option 1: PWA Asset Generator (Recommended)
```bash
npx @vite-pwa/assets-generator --preset minimal public/icon-source.png
```

**Steps:**
1. Create `public/icon-source.png` (512x512px)
2. Run the generator
3. Icons will be created in `public/`

### Option 2: Online Tools
- **Favicon Generator:** https://realfavicongenerator.net/
- **App Icon Generator:** https://www.pwabuilder.com/imageGenerator
- **Maskable Icon:** https://maskable.app/editor

### Option 3: Manual (Figma/Sketch/Photoshop)
1. Create artboard: 512x512px
2. Add safe zone guide: 432x432px (centered)
3. Design icon within safe zone
4. Export as PNG:
   - 512x512 → `icon-512.png` (maskable)
   - 192x192 → `icon-192.png` (maskable)
   - 180x180 → `apple-touch-icon.png`
   - 32x32 → `favicon-32x32.png`
   - 16x16 → `favicon-16x16.png`

---

## 📸 Screenshot Guidelines

### Mobile Screenshots (Required: 1, Recommended: 3-5)

**Dimensions:** 1290x2796px (iPhone 14 Pro Max) or similar 9:16

**Recommended Screens:**
1. **Dashboard** - Show overview with stats cards
2. **Time Entry** - Timer widget + time entries list
3. **Approvals** - Approval table with actions
4. **Offline Mode** - Offline banner visible
5. **Material Entry** - Form with photo upload

**Best Practices:**
- Real data (not lorem ipsum)
- Swedish language throughout
- Show key features
- Include device frame (optional but nice)
- Light mode or dark mode (consistent)

### Desktop Screenshots (Recommended: 1-3)

**Dimensions:** 2560x1440px or 1920x1080px (16:9)

**Recommended Screens:**
1. **Dashboard + Sidebar** - Full layout view
2. **Approvals Table** - Show batch actions
3. **Export Preview** - Modal with data

---

## 🚀 Quick Start (Minimal Setup)

If you need to deploy quickly without custom icons:

**1. Use Placeholder Icons:**
```bash
# Create a simple solid color icon
# In your image editor, create 512x512px PNG:
# - Blue background (#1E40AF)
# - White text "EP" centered
# - Save as public/icon-512.png

# Then generate other sizes:
npx sharp-cli resize 512 512 -i public/icon-512.png -o public/icon-192.png 192 192
npx sharp-cli resize 512 512 -i public/icon-512.png -o public/apple-touch-icon.png 180 180
```

**2. Screenshot Tool:**
```bash
# Use browser DevTools
# 1. Open app in Chrome
# 2. Open DevTools (F12)
# 3. Toggle device toolbar (Ctrl+Shift+M)
# 4. Set to iPhone 14 Pro Max (1290x2796)
# 5. Take screenshot (Ctrl+Shift+P → "Capture screenshot")
# 6. Repeat for 3-5 screens
# 7. Save to public/screenshots/
```

---

## 📝 Manifest Update

After generating icons, update `public/manifest.json`:

```json
{
  "name": "EP Time Tracker",
  "short_name": "EP Tracker",
  "description": "Time tracking and site reporting for Swedish contractors",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1E40AF",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    },
    {
      "src": "/favicon-32x32.png",
      "sizes": "32x32",
      "type": "image/png"
    },
    {
      "src": "/favicon-16x16.png",
      "sizes": "16x16",
      "type": "image/png"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard-mobile.png",
      "sizes": "1290x2796",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Dashboard Overview"
    },
    {
      "src": "/screenshots/time-entry-mobile.png",
      "sizes": "1290x2796",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Time Entry"
    },
    {
      "src": "/screenshots/approvals-desktop.png",
      "sizes": "2560x1440",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Approvals Dashboard"
    }
  ],
  "categories": ["business", "productivity"],
  "lang": "sv",
  "dir": "ltr"
}
```

---

## ✅ Checklist

### Icons
- [ ] Create 512x512 source icon
- [ ] Generate maskable versions (safe zone)
- [ ] Create Apple Touch Icon (180x180)
- [ ] Create favicons (32x32, 16x16)
- [ ] Test on iOS (Add to Home Screen)
- [ ] Test on Android (Install prompt)

### Screenshots
- [ ] Capture 3-5 mobile screenshots
- [ ] Capture 1-3 desktop screenshots
- [ ] Add device frames (optional)
- [ ] Ensure Swedish language
- [ ] Add to manifest.json

### Testing
- [ ] manifest.json validates (use Chrome DevTools)
- [ ] Icons display correctly in install prompts
- [ ] Maskable icons don't get cropped
- [ ] Screenshots show in install dialog
- [ ] PWA score >90 (Lighthouse)

---

## 🔧 Troubleshooting

### Icons Not Showing
- Clear browser cache
- Check file paths in manifest
- Verify MIME types
- Check console for errors

### Maskable Icons Cropped
- Reduce logo size
- Ensure 80% safe zone
- Test at https://maskable.app/

### Install Prompt Not Showing
- Check manifest.json validity
- Ensure HTTPS (or localhost)
- Verify service worker registered
- Check browser support (Chrome/Edge)

---

## 📚 Resources

- **PWA Asset Generator:** https://github.com/vite-pwa/assets-generator
- **Maskable Icon Editor:** https://maskable.app/editor
- **Web App Manifest:** https://developer.mozilla.org/en-US/docs/Web/Manifest
- **Lighthouse PWA Guide:** https://web.dev/pwa-checklist/
- **Apple PWA Guidelines:** https://developer.apple.com/design/human-interface-guidelines/web-apps

---

**Status:** Assets generation is manual process - follow this guide before production deploy.

