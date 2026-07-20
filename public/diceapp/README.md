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

When shipping an update, bump `VERSION` in `sw.js` (e.g. `ebc-dice-v1` → `ebc-dice-v2`)
so installed PWAs pick up the new files.

## Icons

Generated with a PowerShell System.Drawing script (EBC red, cream die, five pips).
Regenerate by re-running the script if the brand changes.
