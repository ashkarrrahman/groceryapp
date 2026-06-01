# My Grocery List

A personalised monthly grocery shopping **Progressive Web App (PWA)**. It reads your item list from a Google Sheet, walks you through each item one by one, remembers your previous brand/quantity choices, and produces a shareable WhatsApp or printable summary at the end.

No backend, no login, no build step — just static HTML/CSS/JavaScript. Installable on iPhone and Android, and works fully offline in-store.

## Features

- **Item-by-item flow** — step through each item, set brand + quantity, skip, mark out of stock, or skip a whole category.
- **Remembers your choices** — pre-fills brand/quantity from your last session.
- **Google Sheets as the source** — paste a sheet URL; the app fetches and caches it.
- **Offline-first** — cached list + service worker so it works with no signal in the store.
- **Share & print** — share a formatted list to WhatsApp (or any app via the native share sheet) and print a clean black-and-white copy.
- **Session history** — review past shops and reuse one as a template.
- **Themes** — Purple (default), Green, Blue, Amber.
- **Built-in sample list** — 128 items across 7 categories so you can try it immediately before connecting a sheet.

## Quick start

Because this is a PWA with a service worker, it must be served over HTTP (not opened as a `file://`).

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

Or use any static dev server (`npx serve`, etc.).

## Connecting a Google Sheet

1. Create a sheet with these columns (header row required):

   | A: Category | B: Item | C: Default Brand | D: Default Quantity | E: Unit |
   |-------------|---------|------------------|---------------------|---------|
   | Pantry      | Rice    | Samba            | 5                   | kg      |

   Only **Category** and **Item** are required; brand/quantity/unit are optional.

2. Either:
   - **Publish to web**: `File → Share → Publish to web → CSV → Publish`, copy the URL; **or**
   - just copy the normal share/edit URL (the app converts it to a CSV export automatically — the sheet must be shared as "anyone with the link").

3. Open the app → gear icon (**Settings**) → paste the URL → **Test connection** → **Save**.

## Deployment

It's fully static — deploy the folder to any static host:

- **Netlify / Vercel** — drag-and-drop the folder, or connect the repo.
- **GitHub Pages** — push to a repo and enable Pages on the branch root.

All asset paths are relative, so it works from a subpath too.

## Installing on your phone

- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** menu → *Add to Home screen* / *Install app*.

## File structure

```
/
├── index.html      App shell + all screens
├── manifest.json   PWA manifest
├── sw.js           Service worker (offline caching)
├── style.css       Design system + theme variables
├── print.css       Print-only stylesheet
├── app.js          Router + screen rendering + shopping flow
├── data.js         Built-in default 128-item list
├── sheets.js       Google Sheets fetch + CSV parsing
├── storage.js      localStorage helpers
├── session.js      Shopping session logic
├── share.js        WhatsApp share + print
└── icons/          App icons (192 / 512)
```

## Data & privacy

Everything is stored locally in your browser's `localStorage` (settings, cached list, prefill memory, session history). Nothing is sent to any server except the request that fetches your own Google Sheet.

## Tech

Vanilla HTML5 + CSS3 + ES6 JavaScript. No frameworks, no npm, no build tools.
