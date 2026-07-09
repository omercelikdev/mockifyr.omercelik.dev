# mockifyr-web

Marketing + docs site for [Mockifyr](https://github.com/omercelikdev/mockifyr) —
built with **Astro + Starlight**, themed with Mockifyr's design tokens. Deploys to
**Cloudflare Pages** at `mockifyr.omercelik.dev`.

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output → ./dist
npm run preview
```

- Landing (splash hero) — `src/content/docs/index.mdx`
- Docs pages — `src/content/docs/*.md`
- Nav — `astro.config.mjs` (`sidebar`)
- Theme — `src/styles/mockifyr.css` (Mockifyr tokens → Starlight variables)

## Deploy — Cloudflare Pages

1. Push this repo to GitHub (`omercelikdev/mockifyr-web`).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Custom domain:** add `mockifyr.omercelik.dev` (if the zone `omercelik.dev` is on Cloudflare, DNS is
   wired automatically).

Every push to `main` deploys; PRs get preview URLs.

## Content source

User-facing docs are authored here (they're a different audience from the engine repo's
`docs/*.md`, which are developer/parity notes). Keep this site's copy in sync with the
released image and the in-app dashboard.
