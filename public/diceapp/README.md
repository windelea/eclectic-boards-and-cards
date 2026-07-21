# EBC Dice

A 2D dice-table PWA: pick dice by number of sides, color them, lock them, tap to reroll one, and drag them around the table to group them — nearby dice automatically show a group subtotal. Grand total, subtotals, and roll history each toggle in settings. The current table auto-saves, and named presets can be saved/loaded. Works fully offline once visited.

Vanilla HTML/CSS/JS, zero dependencies, no build step.

## Run locally

```bash
cd diceapp
python -m http.server 4173
# open http://localhost:4173
```

## Deploy

**This folder is the source of truth.** To ship, copy it into the EBC site's public folder:

```bash
cp -r diceapp "../sites/EBC/site/public/diceapp"
```

Astro copies `public/` verbatim into `dist/`, so the app goes live at
`eclecticboardsandcards.com/diceapp` whenever the EBC site deploys to Cloudflare Pages
(see the site's README for the one-time GitHub + Cloudflare setup).

When shipping an update, bump **both** `VERSION` in `sw.js` and `BUILD` in `js/app.js`
(e.g. `v12` → `v13`) so installed PWAs pick up the new files.

Keep the two in sync. Settings shows the running version, and prints a `MISMATCH`
warning if they disagree — which means the service worker cached a stale asset and
the app is not running the code you think it is. The service worker caches with
`cache: 'reload'` to prevent that, but the warning is there because it already
happened once: a fresh `sw.js` was serving a stale `app.js`, and two iOS fixes
looked deployed when they had never actually run.

## Icons

Generated with a PowerShell System.Drawing script (EBC red, cream die, five pips).
Regenerate by re-running the script if the brand changes.
