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

## OBD2 Data Engine V3 and Log Analyzer

The local-only analyzer is at `/tools/obd2-log-analyzer`. Its reusable TypeScript engine is in `lib/obd`; no server endpoint receives logs. V2 adds a required import preview, explicit time/PID/unit mappings and local-only mapping templates. V3 adds explainable phases, A/B context matching, change observations and a timestamp-paired relationship explorer. Both logs remain in memory. See the [V3 comparative analysis report](docs/OBD2-V3-COMPARATIVE-DRIVE-REPORT.md), the [V2 mapping report](docs/OBD2-V2-IMPORT-MAPPING-REPORT.md) for contracts, compatibility limits, measurements and handoff details, and the [V1 baseline report](docs/OBD2-V1-IMPLEMENTATION-REPORT.md) for the original analyzer architecture.

```bash
npm run test:obd
npm run benchmark:obd
npm run benchmark:obd-v2
npm run benchmark:obd-v3
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
node node_modules/vinext/dist/cli.js start --port 5184
# In another terminal:
npm run test:browser
```

Browser tests run against the production build, not a mocked worker. Screenshots are written to ignored `outputs/`. Do not use `deploy:cloudflare` for local validation.

## International foundation

The public site is English-only and uses clean root-relative URLs, so future machine and engineering articles can expand without locale-specific routing.

## Deployment

The site is built for Cloudflare Sites with the canonical domain `https://torquegirl.com`. SEO foundations include canonical metadata, Open Graph/X metadata, `robots.txt`, `sitemap.xml`, and a custom favicon.
