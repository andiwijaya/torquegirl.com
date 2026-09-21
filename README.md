# TorqueGirl.com

TorqueGirl is a bilingual media and education site about the engineering behind powerful machines: motorsport, performance engines, technology, and iconic machinery.

## Stack

- Next.js-compatible Vinext starter with React and TypeScript
- Static-first Cloudflare Sites deployment
- CSS-driven responsive layout with no database, CMS, or backend
- English-only editorial content in `app/page.tsx`

## Development

```bash
npm run install:ci
npm run dev
npm run build
npm run lint
npx tsc --noEmit
```

The production build outputs the deployable site under `dist/client`. Cloudflare Sites publishes from the `main` branch using `npm run build`.

## Content architecture

The homepage is organized around reusable editorial surfaces: explore categories, engineering scope, a future featured machine, and the TorqueGirl guide. Future routes can expand into `/machines/`, `/motorsport/`, `/engines/`, `/technology/`, `/comparisons/`, and `/learn/`, with article content modeled as flexible sections rather than fixed fields.

## International foundation

The public site is English-only and uses clean root-relative URLs, so future machine and engineering articles can expand without locale-specific routing.

## Deployment

The site is built for Cloudflare Sites with the canonical domain `https://torquegirl.com`. SEO foundations include canonical metadata, Open Graph/X metadata, `robots.txt`, `sitemap.xml`, and a custom favicon.
