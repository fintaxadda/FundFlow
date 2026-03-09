# FundFlow PWA — Deployment Guide

## What's in this folder

```
fundflow-pwa/
├── index.html          ← Main app (all-in-one)
├── manifest.json       ← PWA manifest (name, icons, theme)
├── sw.js               ← Service Worker (offline caching)
├── favicon.ico         ← Browser tab icon
└── icons/
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    ├── icon-512x512.png
    └── apple-touch-icon.png
```

## How to Deploy (choose one)

### Option 1 — GitHub Pages (Free, Recommended)
1. Create a GitHub account at github.com
2. Create a new repository (e.g. `fundflow`)
3. Upload all files in this folder to the repo root
4. Go to Settings → Pages → Branch: main → Save
5. Your app lives at: `https://yourusername.github.io/fundflow/`

### Option 2 — Netlify (Free, Drag & Drop)
1. Go to https://app.netlify.com/drop
2. Drag the entire `fundflow-pwa` folder onto the page
3. Done! You get a live URL instantly (e.g. `https://abc123.netlify.app`)
4. Optional: add a custom domain in Netlify settings

### Option 3 — Vercel (Free)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` inside the `fundflow-pwa` folder
3. Follow prompts — live in ~30 seconds

### Option 4 — Local (Testing)
Run a local server (required for SW to work — can't use file://)
```bash
# Python
python3 -m http.server 8080 --directory fundflow-pwa

# Node
npx serve fundflow-pwa
```
Then open: http://localhost:8080

## PWA Install Instructions (for users)

### Android (Chrome)
- Open the app URL in Chrome
- Tap the ⋮ menu → "Add to Home screen"
- Or tap the install banner that appears automatically

### iPhone / iPad (Safari)
- Open the app URL in Safari
- Tap Share → "Add to Home Screen"
- Tap "Add"

### Desktop (Chrome / Edge)
- Open the app URL
- Click the install icon in the address bar (⊕)
- Or click ⋮ → "Install FundFlow"

## PWA Features
- ✅ Works fully offline after first visit
- ✅ Installs to home screen like a native app
- ✅ No app store required
- ✅ Auto-updates when you deploy a new version
- ✅ All calculations run locally (no data sent anywhere)
- ✅ Excel & PDF export work offline too

## Updating the App
1. Edit `index.html`
2. Bump the cache version in `sw.js`: change `fundflow-v1.0.0` → `fundflow-v1.0.1`
3. Re-deploy — users get the update on next visit

---
Built with HTML + Chart.js + SheetJS + jsPDF  |  No framework, no build step needed.
