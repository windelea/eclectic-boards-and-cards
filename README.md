# Eclectic Boards & Cards

Astro site, deployed free on Cloudflare. Dark mode first, "Print Shop" design, palette sampled from the Enterprise Brewing bottle stopper.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
```

## Writing a post

Add a markdown file to `src/content/blog/`:

```markdown
---
title: "My post title"
description: "One sentence shown on cards and in RSS."
date: 2026-07-20
category: blog        # or design-diary
draft: false          # true = hidden from the site
---

Post body in markdown.
```

The filename becomes the URL: `my-post.md` → `/blog/my-post`. Push to GitHub and Cloudflare rebuilds automatically (~1 minute).

## Deploying to Cloudflare (one-time, $0)

1. Push this `site/` folder to a GitHub repo.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Settings: framework preset **Astro**, build command `npm run build`, output directory `dist`. (If the repo root isn't this folder, set the root directory accordingly.)
4. Deploy. You'll get a free `*.pages.dev` URL.
5. **Custom domain:** in the Pages project → Custom domains → add `eclecticboardsandcards.com`. Since the domain is already on Cloudflare, DNS is wired automatically.

Free-tier limits (plenty for this): 500 builds/month, unlimited static requests/bandwidth, 100k Function invocations/day.

## Email signups (one-time KV setup)

The form posts to `/api/subscribe` (`functions/api/subscribe.js`), which stores emails in Cloudflare KV. Until you do this, the form politely says signups aren't wired up yet.

1. Cloudflare dashboard → **Storage & Databases → KV** → Create namespace, name it `ebc-subscribers`.
2. Pages project → **Settings → Bindings** (or Functions → KV namespace bindings) → Add binding:
   - Variable name: `SUBSCRIBERS`
   - Namespace: `ebc-subscribers`
3. Redeploy (or just push any commit).

To see your subscribers: KV → `ebc-subscribers` → the keys are the email addresses. Export any time. When you outgrow this, swap in Buttondown/Kit by pointing the form at their endpoint.

## Evergreen sections (already plumbed)

`src/content.config.ts` defines two more collections, ready when you are:

- `src/content/reviews/` — frontmatter: `title, description, date, rating (1-10), designer, playerCount`
- `src/content/games/` — frontmatter: `title, description, date, status (idea|prototype|playtesting|released), pnpFile`

Drop markdown files in, then add pages (e.g. `src/pages/reviews/index.astro`) mirroring the blog pages — or ask Claude to build them.

## Swapping the logo

Replace `public/logo.webp` (currently the reference stopper image). When your SVG is ready, drop it in `public/` and change the two references in `src/layouts/Base.astro` (favicon link + masthead img).
