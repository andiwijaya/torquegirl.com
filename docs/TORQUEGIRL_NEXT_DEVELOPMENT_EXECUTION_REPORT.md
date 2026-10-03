# TorqueGirl Next Development — Execution Report

## Status and authority

Task 0 only: repository baseline, approved-PRD preservation, implementation decomposition, and sequential validation plan. Product workstreams A–F are **pending**. This is not the final delivery report and does not authorize skipping any release gate. The parent orchestrator will review each bounded coding task and invoke the next task without asking the Product Owner to relay prompts.

The complete inherited user PRD is preserved in [TORQUEGIRL_NEXT_DEVELOPMENT_PRD.md](TORQUEGIRL_NEXT_DEVELOPMENT_PRD.md), including the orchestration instructions, all A–F requirements, exclusions, gates, production fix loop, final-report format, and success definition. It remains authoritative; proposals below are implementation decisions, not changes to approved scope.

Audit date: 2026-10-03 UTC. Repository and baseline checks performed approximately 07:53–08:02 UTC; documentation follows those checks.

## 1. Verified repository baseline

| Check | Actual evidence |
| --- | --- |
| Workspace | `C:\TorqueGirl`; PowerShell on Windows |
| Repository | `https://github.com/andiwijaya/torquegirl.com.git` |
| Initial branch / HEAD | Clean `main`, `c2789e8357f23b84bd83aed81fb4ffee293c43d9` |
| Initial local relationship | `git rev-list --left-right --count HEAD...origin/main`: `0 0` |
| Fresh remote verification | Connected GitHub GET `/repos/andiwijaya/torquegirl.com/branches/main` returned the same SHA; normal host-permission `git fetch origin main` also succeeded |
| Changes after audited SHA | `git log c2789e8357f23b84bd83aed81fb4ffee293c43d9..HEAD --oneline`: empty at baseline; no newer tracked or untracked user work to reconcile |
| Working tree before task | `git status --short --branch`: `## main...origin/main`; no file entries |
| Selected implementation location | Existing root checkout `C:\TorqueGirl`, branch `codex/next-development-program`, created normally from the verified baseline |
| Safety of location | Checkout is outside `outputs/`, `test-results/`, `playwright-report/`, `dist/`, `.next/`, `.vinext/`, and any build/test cleanup target; no nested implementation worktree |
| Other worktree | `git worktree list` records `C:\TorqueGirl-obd-v1`, SHA `5d9c79b`, branch `codex/obd2-analyzer-v1`; known ownership denial respected, contents/security untouched |
| Instructions | No `C:\AGENTS.md`, root `AGENTS.md`, `.agents`, or `.codex` directory exists in this checkout; no `AGENTS.md` found under app/components/lib/docs/tests/scripts. No repo-local skill instructions available. No private memory read needed |
| Tooling | Node `v24.12.0`, npm `11.6.2`; installed dependencies and Chromium available; CI uses Node 22. `rg` unavailable, so searches used `git grep`, `git ls-files`, and PowerShell |
| Network / permission boundary | Sandbox GitHub connection failed; fresh reads used the authorized connector and normal host-permission fetch. Sandbox OBD tests could not read the Windows profile; sandbox Chromium could not launch. Host-permission reruns succeeded. Sandbox denied Git ref writes; approved host-permission branch creation succeeded. No security settings were changed |

Recent history preserved: `c2789e8` private Share Tool; `cf02956` production navigation and fresh analytics-free analyzer documents; `3a0dd08` preserved editorial content and V1–V3 release; `2609b21` live-data and Off Track content; `5d9c79b` V3; `e2f71f6` V2.

Only the two requested documentation files are intended tracked changes in Task 0. Task 0 does not push, merge, trigger deployment, modify production, or implement product features. After the documentation checkpoint, inspect `git log -1` for its SHA and compare the branch against `origin/main`; its parent must be the baseline above. The exact checkpoint SHA is supplied in the task handoff rather than embedded in its own commit.

## 2. Public routes and sitemap

There are 17 current public `page.tsx` routes and 17 unique sitemap locations. All were requested successfully in both the local production-build release test and the actual public-site release test.

| Route | Sitemap | Local HTTP | Public HTTP |
| --- | --- | --- | --- |
| `/` | Yes, root has trailing slash | 200 | 200 |
| `/engines` | Yes | 200 | 200 |
| `/engines/how-a-nascar-v8-engine-works` | Yes | 200 | 200 |
| `/engines/toyota-2jz-gte-tuning-legend` | Yes | 200 | 200 |
| `/engines/turbocharger-vs-supercharger` | Yes | 200 | 200 |
| `/technology` | Yes | 200 | 200 |
| `/technology/how-formula-1-car-creates-downforce` | Yes | 200 | 200 |
| `/technology/what-is-an-obd2-scanner` | Yes | 200 | 200 |
| `/technology/obd2-scanner-vs-code-reader` | Yes | 200 | 200 |
| `/technology/how-to-read-obd2-codes` | Yes | 200 | 200 |
| `/technology/how-to-analyze-obd2-live-data-and-logs` | Yes | 200 | 200 |
| `/off-track` | Yes | 200 | 200 |
| `/off-track/golf-day` | Yes | 200 | 200 |
| `/tools` | Yes | 200 | 200 |
| `/tools/obd2-log-analyzer` | Yes | 200 | 200 |
| `/privacy` | Yes | 200 | 200 |
| `/terms` | Yes | 200 | 200 |

`public/sitemap.xml` has no duplicates. Convention is slashless non-root URLs. Each page's canonical was checked against `https://torquegirl.com` plus its route (root canonical currently omits the slash); `/tools/` also returns 200. `robots.txt` points at the public sitemap. Sitemap and six preserved WebP image assets return 200 locally and publicly.

Confirmed metadata drift: privacy page says September 26, 2026, but sitemap `lastmod` is September 22, 2026. Article JSON-LD currently uses the registry publication date as `dateModified`, even where later integration edits exist. Fix meaningful update dates in a small consistent change; never invent dates or mark unchanged content as freshly published.

Planned new public route: `/tools/torque-power-explorer`. A separate recording/export guide is recommended at `/technology/how-to-record-and-export-obd2-logs`; Task 2 may instead extend the live-data article if review shows it stays readable and covers every B2 item. The notebook should remain inside the privacy-protected analyzer initially, avoiding a new public route and a second analytics boundary. No empty Machines/Motorsport/Learn/About pages.

## 3. Navigation, homepage, and content findings

There is no shared site header/footer component today. Brand/header/footer markup is duplicated across pages, with at least these variants:

| Variant | Current behavior / affected routes |
| --- | --- |
| Homepage | Local `useState` hamburger; Home, Machines, Motorsport, Engines, Technology, Tools, Learn, About, Off Track. Machines and Motorsport both point to `#explore`. Footer omits Tools |
| Editorial/category/legal | `.site-header.article-header`, `HomeLink`, and `.nav-links.article-nav`. Used by Engines, all engine articles, Technology and its articles, Off Track and story, Privacy, Terms. Link lists vary; most omit Tools; some omit Technology |
| Technology index | Explicit Tools link in header and footer; still uses editorial mobile CSS |
| Tools index | Minimal brand + Technology link, no main-navigation menu, no footer |
| Analyzer | Compact `.obd-header`, Technology + Tools, LOCAL / PRIVATE badge; minimal footer has Home/brand and Privacy, omits Terms/Contact |

`app/article.css` at <=520px intentionally hides all editorial menu links except the first Home link and `.nav-off-track`. There is no editorial hamburger. Thus the Technology index's Tools link is hidden on narrow phones even though it exists in the DOM. At 521–640px the general menu hiding rule also needs review. Touch-target sizing and tablet/landscape behavior must be checked during consolidation.

Safe consolidation recommendation: small shared `SiteHeader` and `SiteFooter` components with styling variants for editorial and analyzer surfaces; central real-destination list Home, Engines, Technology, Tools, Off Track, About (`/#about`). Preserve the visual brand and analyzer privacy badge. Use existing full-document `DocumentLink` for navigation; preserve `HomeLink` where its production-home behavior is required. Provide a keyboard/touch-operable collapsible mobile menu with `aria-expanded`, `aria-controls`, Escape handling, visible focus, and practical minimum 44px targets. Verify it opens above page content without clipping from `.site-shell{overflow:hidden}`. Avoid switching back to framework `Link` without reproducing and resolving the documented Vinext runtime issue.

Homepage `app/page.tsx` is client-rendered with entirely manual feature copy and no registry import. Hero says “Meet the machines that make power.” Tools exists only in the desktop/mobile nav; there is no direct analyzer spotlight. “Latest from the garage” manually features Turbo vs Supercharger (2026-09-21), although registry entries include 2JZ/Technology (September 22), live data (September 23), and Golf Day (September 24).

`lib/torquegirl-content.ts` contains 9 article summaries: 3 Engines, 5 Technology, 1 Off Track, with category arrays already used by the category indexes. Use these arrays for a stable newest-first helper and homepage feature cards. Add an explicit route/category-root helper or canonical path field where needed: `Engine Legends` is editorial labeling, not the route `/engine-legends`. Do not derive route roots blindly from category names. Keep editorial features and Off Track personality; add a compact Learn / Analyze / Explore discovery surface, analyzer spotlight, and later the second tool. Do not create a dashboard or CMS.

## 4. Existing OBD architecture and reusable patterns

| Files | Relevant role / boundary |
| --- | --- |
| `components/document-link.tsx` | Native anchors ensure full-document navigation; this fixes a Vinext Link runtime failure and prevents editorial analytics from remaining alive inside the analyzer |
| `components/home-link.tsx` | Client component using `window.location.assign('https://torquegirl.com/')`; consider localhost test implications when consolidating |
| `components/article-share.tsx` | Existing article static-URL sharing, clipboard fallback, and accessible status patterns |
| `components/site-analytics.tsx`, `app/layout.tsx` | GA4 on ordinary pages; returns null for any path starting `/tools/obd2-log-analyzer`. Preserve this exact sensitive-route exclusion and full-document entry |
| `components/obd/analyzer.tsx` | Owns file label, worker lifetime, import preview, accepted info, selected signals, visible time range, cursor, quality, custom synchronized SVG charts, playback, current phase, Share Tool, and `DriveAnalysis` |
| `components/obd/import-preview.tsx` | Delimiter/time/PID/unit review and local mapping-template controls; correction rebuilds from source |
| `components/obd/drive-analysis.tsx` | Owns A/B phase selection, region stats, B mapping, operating-match comparison, What Changed, traces, relationship pairing/tolerance/scatter |
| `lib/obd/worker.ts`, `worker-client.ts`, `protocol.ts` | Bundled same-origin real worker; asynchronous requests, cancellation/disposal and typed response contracts |
| `lib/obd/import-session.ts`, `drive-session.ts` | A/B source owners, staged mapping and revision acceptance; raw logs remain in memory |
| `lib/obd/csv.ts`, `time.ts`, `signals.ts`, `mapping.ts`, `mapping-types.ts`, `adapters.ts`, `catalog.ts` | Parser/time/unit/PID interpretation and explicit ambiguity handling; preserve limits and source provenance |
| `lib/obd/analysis.ts`, `drive.ts`, `events.ts` | Bounded chart traces, actual-time statistics, phases, independent run origins, condition matching, conservative observations, one-to-one time pairing and Pearson. No new unrelated algorithms needed |
| `lib/obd/templates.ts` | Existing injected `TemplateStorage` interface, strict Zod versioned schemas, bounded JSON, explicit storage errors, and header fingerprint. Only mapping settings persist; no filenames/timestamps/samples |
| `lib/obd/demo.ts` | Current Explore demo: 1200 synthetic rows with sparse readings and a deliberate gap. Demonstrates quality rather than a physical vehicle model |
| `lib/obd/drive-demo.ts`, `tests/obd/fixtures/v3/*` | Synthetic A/B phases and known trim/correlation ground truth; useful optional guided-phase demo foundation. Fixtures explicitly are not real-device exports |
| `components/ui/chart.tsx` | Recharts wrapper already exists, but OBD uses lightweight custom SVG. Evaluate SVG first for bounded torque curves; no new chart dependency required |
| `components/ui/alert-dialog.tsx`, label/input/textarea/button/collapsible/drawer/sheet components | Available accessible patterns; reuse where they fit the site's current bespoke styling |
| `tests/obd/*.test.ts` | Node test/assert unit suites, injected worker/storage doubles and synthetic fixture helpers |
| `tests/browser/*.spec.ts`, `playwright.config.ts` | Chromium, 1 worker, real production build/worker, configurable `OBD_TEST_URL`, synthetic imports, responsive/touch tests, request and error monitoring |

`db/`, Drizzle dependencies, D1 examples, and `app/chatgpt-auth.ts` exist as starter scaffolding; neither new notebook nor explorer needs them. `.openai/hosting.json` has `d1:null` and `r2:null`; generated Worker config contains no database/R2/KV binding. Preserve the local-first architecture without activating scaffolding.

The early three OBD articles already have contextual direct analyzer CTAs; baseline browser tests confirm them. They do **not** currently reference the live-data article. The live-data article has good safety, channel selection, cold/warm context, fuel trim explanation, and evidence-before-diagnosis guidance, but lacks a complete export checklist: timestamp/unit preservation, concrete focused capture sequence/duration/cadence tradeoffs, original-file preservation and what not to edit. Add directional links and a focused recording guide without duplicating the whole learning cluster.

## 5. Requirement coverage matrix

All implementation entries below are planned, not delivered by Task 0. Optional scope remains explicitly optional. Evidence must be added after each task's reviewed diff and passing checks.

| PRD requirement | Task / likely files | Required acceptance evidence | State |
| --- | --- | --- | --- |
| Source-of-truth check; Git safety | 0; this report | Initial status, SHA, fresh remote, routes/sitemap, instructions, existing architecture/deploy/test audit | Baseline verified |
| A1 headers and real destinations | 1; shared header, all route header call sites | Actual desktop clicking; six real destinations; no empty pages; visual identity preserved | Pending |
| A2 editorial mobile discovery | 1, 9; header/CSS/browser navigation suite | Engines/Technology/Tools/Off Track/About/Home reachable; keyboard, Escape/focus, touch sizes and no clipping/overflow | Pending |
| A3 Learn / Analyze / Explore homepage | 1, 8; `app/page.tsx` | Direct analyzer discovery and editorial/tool surfaces; later explorer link; reviewed desktop/mobile screenshots | Pending |
| A4 registry-backed Latest | 1; `lib/torquegirl-content.ts`, homepage | Newest-first registry-derived selection, stable ties, correct paths for Engine Legends; no extra manual registry | Pending |
| A5 consistent footers | 1; shared footer/call sites | Tools on editorial paths; Privacy, Terms, Contact retained; index/analyzer coverage | Pending |
| B1 directional learning links | 2; three early OBD articles/live-data/analyzer | Click scanner → capability → codes → live-data → preparation → analyzer and reciprocal learning links | Pending |
| B2 practical record/export guidance | 2; recording guide or live-data extension, registry | Every listed context/channel/timestamp/unit/cadence/export/original/privacy item; driving safety; no unvalidated exporter claims | Pending |
| B3 “I have a log” local CTA | 2; guide/live-data | Visible honest local analyzer CTA, actual full-document click | Pending |
| C1 10-step first-use sequence | 3; analyzer/import-preview/drive-analysis | Low-intrusion guide states match file/demo → mapping → analysis → quality → signals → timeline → region → optional B/relationship → note | Pending |
| C2 guided synthetic demo | 3, 5; existing demos/UI | Demo imports through real mapping/worker and reaches timeline, phase and notebook; synthetic label; no diagnosis | Pending |
| C3 contextual terminology | 3; decision controls | PID/STFT/LTFT/cadence/stale/tolerance/Pearson/percentage-point/match help near the relevant decision | Pending |
| D1 optional structured notebook fields | 4, 5; model and notebook component | Vehicle/goal/date/conditions/baseline/change/region/signals/observation/alternative/next test/retest/free notes; optional fields remain optional | Pending |
| D2 compact evidence references | 4, 5; analyzer + DriveAnalysis integration | Explicit capture of A/B labels, phase/range/signals/statistics/comparison; bounded allowlisted snapshot; no raw files, sample arrays or traces in storage/export | Pending |
| D3 local persistence + CRUD | 4, 5; versioned storage utility/UI | Save/edit/delete/clear; reload; denied/quota/corrupt storage errors preserve data/drafts; destructive actions confirmed | Pending |
| D4 safe JSON backups | 4, 5; schema/import/export | Version + schema validation before mutations; size/type/value/unknown-field checks; round trip; malformed/unsupported rejection; destructive replace confirmation | Pending |
| D5 privacy and local files | 5, 8, 9; tool copy/privacy/network tests | Raw logs memory-only, notebook browser-only, explicit local export; no off-origin/content-bearing requests or note analytics | Pending |
| D6 usable narrow forms | 5, 9 | Stacked fields/cards at 320–430px; real input/edit/import/delete usability and focus | Pending |
| E1 relationship explanation | 7; explorer copy | Torque/RPM/power explained with units; no arbitrary curve prediction claim | Pending |
| E2 correct math + conversions | 6; `lib/torque-power`, math tests | Mechanical hp and Nm/lb-ft conversion documented; SI angular speed derivation; numeric reference and inverse tests | Pending |
| E3 point and curve modes | 6, 7; core/UI | Torque + RPM → power and power + RPM → torque; multiple RPM/torque points → both plotted outputs | Pending |
| E4 validated curve input | 6, 7 | Finite numeric values, missing/duplicate/out-of-order/RPM policy; actionable errors; sample and paste/edit input; bounded point count | Pending |
| E5 responsive accessible curves + peaks | 7, 9 | Both units/axes, separate torque/power peak RPM, numeric summaries, keyboard/touch inspection where practical; chart never sole evidence | Pending |
| E6 optional Curve A/B | Optional after 7, before 9 | Implement only if core stable and small; otherwise record deliberate optional deferral | Optional, undecided |
| E7 reciprocal engine learning | 8; three engine articles/explorer | Contextual NASCAR/2JZ/turbo links and tool return links, clicked and checked | Pending |
| E8 both tools on index | 8; `app/tools/page.tsx` | Analyzer + explorer discoverable; working destination links; shared navigation/footer | Pending |
| E9 second tool homepage discovery | 8; homepage tool spotlight | Explorer discoverable without overwhelming editorial page | Pending |
| Content source-of-truth | 1, 2, 8 | Registry-derived homepage/category references and small canonical-path/update-date helpers; no CMS | Pending |
| SEO and sitemap | 2, 7, 8, 10 | New titles/descriptions/canonicals/OG/semantic headings; unique route coverage; all 17 existing routes retained; accurate lastmod | Pending |
| Accessibility | 1, 3, 5, 7, 9 | Keyboard access, visible focus, labels, error/status messaging, touch sizes, heading order, chart text summaries | Pending |
| Six required viewports + tablet | 9, 10, 12 | 320×740, 375×812, 390×844, 430×932, 844×390, 1440×1000; add tablet ~768px; screenshots/overflow/touch checks | Pending |
| Existing V3 + performance preserved | 3–10, 12 | All 61 baseline unit tests and 27 browser tests preserved or reviewed for justified selector changes; workers/cancel/large import/remap/A+B/relationship behavior | Pending release regression |
| Privacy/network | 5, 9, 10, 12 | Instrument before navigation and exercise note fields/save/edit/export/import + A/B; no sensitive sentinels in requests; no analyzer analytics scripts; fresh-doc entry | Pending release regression |
| No fabricated real-drive validation | Every task/final report | Synthetic/format fixtures remain labeled; no approved physical logs supplied; retain real file import; document missing corpus | Constraint active |
| Architecture/out-of-scope boundaries | Every diff review | No backend/auth/sync/log upload/AI diagnosis/tuning advice/speculative compatibility/new framework/dependency or unrelated algorithms | Constraint active |
| F integration and 12 gates | 8–10; regression suites/report | Exact gate ledger and complete scope coverage before production push | Pending |
| F existing deployment | 11; existing workflow unchanged unless needed | Fresh origin sync, intended normal commits, normal main integration/push; run ID/SHA/conclusion/logs | Pending; no deploy in Task 0 |
| F actual public verification + fix loop | 12 | Browser tests on `https://torquegirl.com`, all route/feature/navigation/worker/persistence/network/error/mobile checks; fix→test→commit→push→redeploy→retest if needed | Pending |
| Final consolidated report / single next decision | After 12 | All 15 requested sections, exact results/URLs/run/SHA/final Git state and honest remaining limitations | Pending |

## 6. Bounded sequential implementation and test plan

For **each** task: recheck status/branch and changed files, read the relevant PRD sections, implement only that task, inspect the full diff (including generated/unexpected files), compare acceptance criteria, run relevant tests, correct failures before acceptance, update this matrix/task ledger, then make a normal checkpoint when stable. Only one source writer at a time. Do not change failing assertions merely to accept a regression. User work or newer origin changes discovered later must be reconciled without reset/force checkout/force push.

| Task | Implementation scope and likely affected files | Ordered checks before acceptance / checkpoint |
| --- | --- | --- |
| 0 | Preserve full PRD and audit baseline in the two requested docs | Baseline lint/typecheck/61 OBD/build/27 local browser/3 public release tests; inspect docs-only diff; documentation commit |
| 1 | Shared small navigation/footer; all 17 route shells; homepage Learn/Analyze/Explore + direct analyzer CTA + registry-backed Latest; `app/globals.css`, `article.css` overrides | Review all header/footer variants and privacy navigation; typecheck → lint → build → focused navigation/route/sitemap/fresh-document browser tests → manual desktop/narrow/menu screenshots; commit navigation/homepage |
| 2 | Repair OBD directional links; practical focused recording/export guide (recommended dedicated route) or bounded live-data extension; registry/sitemap/metadata | Editorial review against every B2 item and driving-safety wording; typecheck → lint → build → actual clicking early article → live-data → preparation → analyzer; sitemap/canonical/reciprocal checks; commit learning journey |
| 3 | Low-intrusion staged analyzer help + contextual definitions + guided synthetic timeline/phase experience; no new analysis algorithms | OBD unit tests → typecheck/lint/build → onboarding demo + existing import/mapping/worker/playback/phase/A+B/relationship/privacy browser coverage; screenshots at 320/390/landscape; commit onboarding |
| 4 | Strict notebook model, storage, backup export/import and compact evidence projection; injected storage test helper | New notebook unit suite: CRUD/roundtrip/version/invalid/extra/raw payload/nonfinite/size/date/duplicate IDs/storage quota/denied/corruption/destructive replacement semantics → OBD units → typecheck/lint; commit model/storage |
| 5 | Analyzer-local notebook cards/forms, explicit capture, save/edit/delete/clear confirmations, local download/import; phase/range/signals/stats/comparison integration | Notebook units → OBD units → typecheck/lint/build → create/edit/reload/delete/clear/export/import/malformed/cancel/no-raw-persistence/no-network browser tests → 320/390/landscape screenshots; commit notebook integration |
| 6 | Unit-aware torque/power pure math, curve parser/order/duplicate/limits/peak logic and documented constants | Independent numeric expected-values and roundtrip/conversion/invalid/zero-RPM/peak tie tests → typecheck/lint; add discoverable test script without replacing OBD tests; commit core math |
| 7 | `/tools/torque-power-explorer`, point directions/units, practical curve input/sample, responsive lightweight chart + numeric peak/readout summaries, metadata | Math unit suite → typecheck/lint/build → point calculations + Nm/kW/lb-ft/hp conversions + curve/peaks/errors/keyboard/touch/chart responsive browser tests; commit explorer |
| Optional 7b | Assess small A/B curve comparison only after stable core | If implemented, independent curve/unit/error/peak tests and mobile comparison coverage; otherwise explicitly record E6 deferral without blocking required scope |
| 8 | Tool index lists both; reciprocal engine and OBD learning links; homepage second tool; privacy notebook copy; registry/sitemap/lastmod alignment | Complete route/metadata/sitemap/internal-link crawl incl. anchors; actual content→tool clicks; freshness logic; typecheck/lint/build; commit content integration |
| 9 | Responsive/a11y/performance/privacy hardening across complete features; targeted fixes only | All six requested viewports + tablet; no root **or component** overflow/clipping, menu touch/focus/Escape, editable forms, chart inspection/numeric summaries; console/failed resources/network sentinels; existing large-log checks and `benchmark:obd*`; commit hardening |
| 10 | Full regression and reviewed release gate ledger; update execution evidence and limitations | OBD + notebook + torque units → typecheck → lint → production build → complete browser suite on that build → route/link/SEO/sitemap and all responsive/visual/network gates. Confirm every required coverage row complete; commit release fixes/preparation |
| 11 | Integrate accepted implementation into freshly synchronized main using normal commits; push through existing GitHub/Cloudflare mechanism | Recheck branch/intended SHAs/status/origin; resolve any new work safely and rerun affected gates; normal push, monitor existing workflow to completed success, inspect deploy logs/revision. No second hosting platform |
| 12 | Actual public release browser/full journey verification; repeat production fix loop until required gates pass | Run suite with `OBD_TEST_URL=https://torquegirl.com`; test all URLs, clicks, metadata/resources/workers, notebook CRUD/reload/export/import and privacy, explorer math/curve/mobile/errors, Off Track/legal regression, screenshots and six viewports; record exact run/URLs/results and final clean Git relationship |

### Notebook design recommendation to confirm in Task 4

Use `localStorage` for bounded, compact JSON notes: current patterns already expose injected storage and Zod, and there is no blob/raw-log persistence. IndexedDB provides asynchronous larger stores but adds migrations and lifecycle complexity without a current need; reevaluate only if bounded note size or reliable writes cannot meet the shape. Document the final capacity limits and synchronous write cost; do not silently truncate content.

Use a unique notebook key, top-level schema/version, strict allowlisted objects, stable IDs, finite numeric evidence, bounded strings/records/total bytes, and explicit errors. Optional text fields should be rendered as plain text. Validate an entire imported file before mutating current storage; reject malformed JSON, unsupported version, oversized or unexpected raw-log/trace/sample payloads, invalid types and duplicate IDs. Use atomic whole-document writes and an explicit import merge/replace policy. Confirm replacement/clear/delete in the UI and allow cancellation without changes. Preserve the previous saved document and draft on quota/denied errors; do not auto-clear corrupt storage. Consider a storage-event/concurrent-tab conflict guard so one tab cannot silently clobber another tab's notes.

Only an explicit capture/save may persist compact A/B user labels, elapsed region/phase, selected signal names/units, a bounded set of count/min/max/mean/median/cadence/coverage values and a compact observed-change/context summary. Never pass `Log`, file Blob, raw CSV, `sourceValues`, raw timestamps/samples, chart traces or scatter points to the persistence function. Let users review evidence and labels before saving; explain raw logs stay in memory and evidence is a snapshot rather than a reloadable analysis. Do not autosave an imported vehicle identifier or complete filename invisibly.

Export via a local Blob/download with schema/version; import via a local file input and JSON parsing. No upload/fetch endpoint, evaluation, HTML execution or sharing of notes. Explain origin/browser storage isolation, browser data clearing/private mode limits, and user-controlled backup sensitivity. Keep notebook inside the excluded analyzer document. It must be usable even when no raw log is loaded; ordinary manual notes need not require evidence capture.

### Torque–Power math recommendation to confirm in Task 6

Use SI internally: `P(W) = torque(Nm) × RPM × 2π / 60`, so the kW denominator is `60000/(2π)` ≈ 9549.296586. Define mechanical/imperial hp as `550 ft·lbf/s`, with `1 ft = 0.3048 m` and `1 lbf = 4.4482216152605 N`; this gives `1 lb-ft = 1.3558179483314004 Nm` and `1 hp = 745.6998715822702 W`. Imperial denominator is `33000/(2π)` ≈ 5252.113122, not an unexplained rounded magic number. State that hp means mechanical hp, not metric PS. No net/gross/wheel/flywheel equivalence is implied.

Accept Nm/lb-ft and kW/hp for both point directions. Define zero RPM behavior explicitly: torque→power at zero gives zero; power→torque at zero is undefined and must report an error. Decide and explain supported nonnegative/RPM/input bounds. Reject NaN/Infinity/empty values and nonsensical overflow. Use independent known references (e.g. 100 Nm × 3000 RPM ≈31.415926536 kW) and inverse/cross-unit tests, not tests that just recompute the same implementation expression.

Recommend pasteable two-column RPM/torque values with sample data and a practical finite point cap. Validate all rows and missing values; either reject unordered/duplicate RPM or visibly sort with a documented duplicate rule, never silently overwrite. Report peaks from supplied samples and explicitly avoid claiming a measured/predicted engine curve or interpolated true peak. Use two labeled scales or separate responsive plots; no suggestion that curves crossing numerically proves a physical event. Numeric summaries/readouts and keyboard inspection supplement the visual. Optional Curve A/B is a separate decision after the required core is stable.

### Driving-safety and learning-content checklist for Task 2

Prepare the device and recording before moving; keep the driver focused on the road and use a passenger/operator where needed. Do not tell readers to do acceleration tests on public roads or exceed legal/safe conditions. A repeatable stationary idle or normal lawful drive is sufficient; conditions need not all appear in one recording. Explain engine cold/warm context, appropriate ventilation for stationary running, chosen supported channels, focused duration sufficient to observe the question, stable cruise and safe ordinary transitions where applicable. Avoid universal sampling-rate/duration prescriptions or guaranteed diagnosis thresholds.

Export only through a software-supported CSV/TSV workflow; application menus and formats vary. Preserve the original, row timestamps and ordering, original units/banks/labels, gaps/missing values, and numerical precision. Do not invent readings, manually resample/interpolate, normalize units/times without records, or remove awkward rows before import; use preview mapping and retain provenance. Explain scanner polling/channel-count cadence tradeoffs and asynchronous/stale readings. Review identifying data before voluntarily sharing a backup elsewhere; TorqueGirl imports remain local. Any factual scanner/device export claims require actual validation or authoritative documentation, not assumption from synthetic format-shaped fixtures.

## 7. Actual Task 0 tests and evidence

Evidence logs are ignored local artifacts under `outputs/next-development-baseline/`; they are not code changes or intended release assets. Existing suites also generate screenshots under `outputs/`. Browser results were redirected into a dedicated baseline subdirectory to avoid deleting preexisting root `test-results/`. The repo root/branch is never placed beneath either output directory.

| Check / command | Actual result | Evidence / qualification |
| --- | --- | --- |
| `npm run lint` | PASS, exit 0; **0 errors, 31 warnings** | `lint.log`; existing image optimization and unused-disable warnings; no auto-fix applied |
| `npm run typecheck` | PASS, exit 0 | `typecheck.log` |
| `npm run test:obd` sandbox | Infrastructure FAIL, exit 1; all 3 test files fail before assertions | `obd-unit.log`; `uv_os_get_passwd returned ENOMEM` in tsx Windows profile access; not evidence of product-unit failures |
| Same `npm run test:obd` with host permissions | PASS, **61 tests, 61 passed, 0 failed/skipped/cancelled**, 1118.423ms | `obd-unit-host.log`; original test command/code unchanged |
| `npm run build` | PASS, exit 0; all 5 build stages and 17 routes emitted | `build.log`; portable Vinext production build; nonblocking plugin-timing/static route-classification notices |
| `node node_modules/vinext/dist/cli.js start --port 5184` | PASS, serves fresh production build at `http://127.0.0.1:5184` | Task-owned session; real Worker bundle `_next/static/worker-_nsHyO87.js`; stop server at task completion |
| `npm run test:browser -- --output=outputs/next-development-baseline/browser-results` sandbox | Infrastructure FAIL, **27 startup failures** | `browser.log`; every Chromium launch fails `spawn EPERM` before product assertions |
| Same suite with host permissions, output `browser-host-results` | PASS, **27 passed, 0 failed**, 54.4s | `browser-host.log`; all 5 spec files on localhost production build, real worker/synthetic data |
| Set `OBD_TEST_URL=https://torquegirl.com`; `npm run test:browser -- tests/browser/release.spec.ts --output=outputs/next-development-baseline/production-browser-results` with host permissions | PASS, **3 passed, 0 failed**, 24.3s | `production-browser.log`; current existing public site only, not verification of a new release |
| Sitemap inventory | PASS: 17 entries / 17 unique / 17 page routes | PowerShell XML inventory and existing route test; no new routes yet |
| Visual baseline | Reviewed homepage screenshots at 320×740 and 1440×1000 | Existing `outputs/release-editorial-320-_.png` and `outputs/release-editorial-1440-_.png`; product remains early machines positioning |
| Notebook/math/new-feature suites | NOT RUN / not yet implemented | Required in Tasks 4–10; do not infer coverage from OBD baseline |
| All-six-viewport product matrix | NOT RUN in Task 0 | Existing analyzer/mapping/drive tests cover 320×740, 390×844, 844×390; editorial release covers 320×740, 390×844, 1440×1000. 375×812, 430×932 and full new-feature states await Task 9 |
| `benchmark:obd`, `benchmark:obd-v2`, `benchmark:obd-v3` | NOT RUN in Task 0 | Browser large-file observations below establish a practical baseline; run bounded benchmarks during performance hardening |
| Physical vehicle/export corpus | NOT RUN; no user-approved physical logs supplied | Existing fixture documentation explicitly synthetic/format-shaped; no validated compatibility claim added |
| New production deployment | NOT RUN, deliberately outside Task 0 | Existing successful baseline workflow only; full release awaits all gates |

Local browser suite confirms existing import preview/mapping/templates, source normalization/quality, synchronized cursor and touch inspection, playback/zoom, phase statistics and controls, independent A/B origins/operating-match/What Changed/traces, relationship pairing/tolerance/Pearson, worker cancellation/replacement, storage denial resilience, static Share Tool payload and narrow layouts. Future note persistence tests must update any existing “no torquegirl.obd storage keys” assertion only in note-specific scenarios: unsaved analysis must still persist no raw data.

Current-site public release suite actually checked all 17 URLs listed above, their visible H1/canonical, sitemap, `/tools/`, six WebP assets, direct OBD CTAs and reciprocal learning link. It clicked editorial entries into the analyzer and checked changed `performance.timeOrigin` (fresh document), no Google Tag Manager/Cloudflare Insights scripts, and no console/runtime errors in that journey. The imported synthetic log used a same-origin worker; **0 off-origin requests, 0 non-read requests, 0 runtime errors** in the monitored analyzer case. Notebook/network tests still need to be added and run on the later release.

Performance observations from the local suite, not a physical-device benchmark: large-log import 2007ms / 74 UI timer ticks; second 200k-row import plus comparison 2753ms / 106 ticks; 200k-row remap 884ms / 44 ticks. These are single Windows Chromium measurements and should be compared under similar conditions after changes, not advertised as guaranteed throughput.

## 8. Deployment source of truth and release gates

The operative deployment is `.github/workflows/deploy-cloudflare.yml`, named **Deploy to Cloudflare Workers**, triggered by push to `main` (also supports `workflow_dispatch`), Ubuntu + Node 22 + `npm ci`, then `npm run deploy:cloudflare`. That script builds and runs `wrangler deploy --config dist/server/wrangler.json --name torquegirl-com`. CI uses existing `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` secrets; no credentials were printed or changed. Concurrency group `cloudflare-production` cancels prior in-progress runs.

Fresh GitHub evidence: baseline [workflow run 36203821098](https://github.com/andiwijaya/torquegirl.com/actions/runs/36203821098), run number **27**, push on `main`, SHA `c2789e8357f23b84bd83aed81fb4ffee293c43d9`, completed **success**, last updated **2026-09-26T00:11:01Z**. Public baseline browser checks succeeded independently of that CI result.

README references “Cloudflare Sites” and static-first output, but the actual script/workflow deploys the generated server Worker plus `dist/client` assets. The additional `sites` Git remote and `.openai/hosting.json` are historical starter/project metadata, not a reason to use a second deployment platform. Use GitHub→existing Cloudflare Worker, not Sites publishing.

Before final production push, record each of these as a current-release result; Task 0 baseline passes are not final-release gate passes:

| Gate | Required final evidence | Task 0 disposition |
| --- | --- | --- |
| 1 Git safe | Fresh status/branch/HEAD/origin and reviewed intended commits | Initial verified; docs-only branch selected |
| 2 OBD preserved | Existing functional unit + real worker/browser suite | Baseline pass, rerun after implementation |
| 3 New units | Notebook + torque math/conversions/invalid suites | Pending |
| 4 Typecheck | Exit 0 on intended release | Baseline pass only |
| 5 Lint | No new blocking errors; record warnings | Baseline 0 errors/31 warnings only |
| 6 Production build | Exit 0 on intended release and generated worker/assets | Baseline pass only |
| 7 Browser | Full existing + new suites pass on intended build | Existing baseline 27 pass; new pending |
| 8 Responsive | Six sizes and tablet across menus/tool/form/chart states | Partial baseline only |
| 9 Privacy | Fresh analytics-free analyzer entry; no log/note transmission | Existing baseline pass; notebook pending |
| 10 SEO/sitemap | All old/new routes unique and correct canonicals/lastmod | Baseline intact; privacy-date mismatch to fix |
| 11 Internal links | Full journey clicking + route/anchor crawl | Existing direct analyzer links pass; new journey pending |
| 12 Visual home/mobile nav | Human/model inspection of desktop/mobile open+closed states and content surfaces | Baseline home reviewed; new states pending |

After normal integration/push, monitor the exact workflow run for the intended SHA, check jobs/deploy logs and revision information, then run actual public browser verification. If the public site is stale or defective, reproduce, fix, run local affected/full relevant tests, commit/push normally, await redeploy, and retest until the release gates pass. Never equate CI success with production correctness.

## 9. Task ledger, handoff, and known limitations

| Task | State | Checkpoint / evidence |
| --- | --- | --- |
| 0 | Baseline and documents ready for parent review | Two requested docs; fresh synchronized baseline; 61 unit / 27 local browser / 3 public release pass; docs-only checkpoint SHA in task handoff |
| 1–12 | Pending | Parent must invoke bounded sequential tasks and append exact reviewed outcomes here |

Task 0 has no unresolved product-test failure. The initial sandbox failures were infrastructure restrictions and were resolved by approved host-permission reruns; do not weaken security settings or patch product/test code around them. Git metadata writes and host browser/tsx runs may again need the same permission boundary in later tasks. Fresh remote reads/fetch were successful with authorized tools. No external dependency currently blocks Task 1.

Real-world limitation: no physical real-drive corpus validation has been performed and no approved logs were supplied for this task. Retain import support and synthetic labels; later report must distinguish format-shaped fixtures from real exported logs and actual device testing. Chromium desktop with emulated narrow/touch viewports is the tested browser baseline; no physical phone/tablet or Safari/Firefox testing was performed. Full required new-feature viewport coverage, notebook behavior, explorer calculations/UI, and final production deployment remain pending.

Bounded next task: **Task 1 — navigation/footer consolidation + homepage repositioning and registry-derived Latest only**. Work in `C:\TorqueGirl` on `codex/next-development-program`. Read this report and full PRD, recheck status and remote, preserve `DocumentLink` analytics isolation and existing editorial assets. Implement real destinations/shared small shell, accessible editorial mobile menu, compact Learn/Analyze/Explore + direct analyzer spotlight, and current registry-derived Latest; keep the second-tool destination for Task 8 after it exists. Inspect the diff, run the Task 1 checks above, correct defects, update coverage evidence, and make a normal checkpoint. Do not implement the notebook/explorer, push, or deploy during Task 1.

At program completion only, publish the single final delivery report using the PRD's 15-section format with release SHA/workflow/URLs/results, honest real-world/device limitations, final branch/status/ahead-behind, and one next product decision. Do not automatically start that next product.
