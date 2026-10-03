# TorqueGirl Next Development — Execution Report

## Status and authority

Task 0 established the repository baseline, approved-PRD preservation, implementation decomposition, and sequential validation plan. Tasks 1 and 2 implement and locally verify **Workstream A / A1-A5** and **Workstream B / B1-B3**. Task 2 reviewed Task 1 before continuing; parent milestone review follows each checkpoint. Workstreams C-F and the second-tool integration remain pending. This is not the final delivery report and does not authorize skipping any release gate. The parent orchestrator will review each bounded coding task and invoke the next task without asking the Product Owner to relay prompts.

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

## 3. Task 0 navigation, homepage, and content findings

At the Task 0 baseline there was no shared site header/footer component. Brand/header/footer markup was duplicated across pages, with at least these variants (replaced in Task 1; see section 10):

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

Task 0 planned these implementation entries. Task 1 evidence is recorded below for A1-A5; later scope remains pending. Optional scope remains explicitly optional. Evidence must be added after each task's reviewed diff and passing checks.

| PRD requirement | Task / likely files | Required acceptance evidence | State |
| --- | --- | --- | --- |
| Source-of-truth check; Git safety | 0; this report | Initial status, SHA, fresh remote, routes/sitemap, instructions, existing architecture/deploy/test audit | Baseline verified |
| A1 headers and real destinations | 1; shared header, all route header call sites | Actual desktop clicking; six real destinations; no empty pages; visual identity preserved | Task 1 locally verified: 17 shared shells, desktop/narrow repeated clicks |
| A2 editorial mobile discovery | 1, 9; header/CSS/browser navigation suite | Engines/Technology/Tools/Off Track/About/Home reachable; keyboard, Escape/focus, touch sizes and no clipping/overflow | Task 1 locally verified at all six sizes; release hardening remains Task 9 |
| A3 Learn / Analyze / Explore homepage | 1, 8; `app/page.tsx` | Direct analyzer discovery and editorial/tool surfaces; later explorer link; reviewed desktop/mobile screenshots | Task 1 locally verified; second tool remains Task 8 after implementation |
| A4 registry-backed Latest | 1; `lib/torquegirl-content.ts`, homepage | Newest-first registry-derived selection, stable ties, correct paths for Engine Legends; no extra manual registry | Task 1 locally verified: 3 registry units + browser cards/date/path clicks |
| A5 consistent footers | 1; shared footer/call sites | Tools on editorial paths; Privacy, Terms, Contact retained; index/analyzer coverage | Task 1 locally verified on all 17 routes, including tool index/analyzer |
| B1 directional learning links | 2; three early OBD articles/live-data/analyzer | Click scanner → capability → codes → live-data → preparation → analyzer and reciprocal learning links | Task 2 locally verified: complete desktop/320 px clicked journey, every early article to live data, reciprocal preparation/learning links |
| B2 practical record/export guidance | 2; recording guide or live-data extension, registry | Every listed context/channel/timestamp/unit/cadence/export/original/privacy item; driving safety; no unvalidated exporter claims | Task 2 locally verified: dedicated guide covers all B2 items, safe recording, primary source checks and conservative format limits |
| B3 “I have a log” local CTA | 2; guide/live-data | Visible honest local analyzer CTA, actual full-document click | Task 2 locally verified: guide/live-data CTAs, fresh documents, real worker, zero off-origin/content requests after entry |
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
| Content source-of-truth | 1, 2, 8 | Registry-derived homepage/category references and small canonical-path/update-date helpers; no CMS | Task 1 homepage/category registry paths and freshness verified; later metadata/content integration pending |
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
| 0 | Complete | Documentation checkpoint `273a676e663f03c6ac091185aad9e743bd96f120`; 61 unit / 27 local browser / 3 public baseline release pass |
| 1 | Implemented and locally verified; parent review follows checkpoint | A1-A5, 61 OBD + 3 registry units, full 38 browser regression and final focused release checks; exact evidence in section 10, checkpoint SHA in handoff |
| 2 | Implemented and locally verified; parent review follows checkpoint | B1-B3, Task 1 review, 61 OBD + 3 registry units, 48 browser regression; exact evidence in section 11 |
| 3-12 | Pending | Parent must invoke bounded sequential tasks and append exact reviewed outcomes here |

Task 0 has no unresolved product-test failure. The initial sandbox failures were infrastructure restrictions and were resolved by approved host-permission reruns; do not weaken security settings or patch product/test code around them. Git metadata writes and host browser/tsx runs may again need the same permission boundary in later tasks. Fresh remote reads/fetch were successful with authorized tools. No external dependency currently blocks Task 1.

Real-world limitation: no physical real-drive corpus validation has been performed and no approved logs were supplied for this task. Retain import support and synthetic labels; later report must distinguish format-shaped fixtures from real exported logs and actual device testing. Chromium desktop with emulated narrow/touch viewports is the tested browser baseline; no physical phone/tablet or Safari/Firefox testing was performed. Full required new-feature viewport coverage, notebook behavior, explorer calculations/UI, and final production deployment remain pending.

Bounded next task: **Task 3 - Guided Analyzer Onboarding / C1-C3**. Work in `C:\TorqueGirl` on `codex/next-development-program`; verify the Task 2 checkpoint and clean status before editing. Read the PRD and sections 10-11 here. Add a lightweight, collapsible or progressive first-use sequence beside existing decisions: file/demo, mapping, quality, selected signals, timeline/region, optional Run B and relationships, and an observation/next-test prompt using the user's own notes until the notebook exists. Review the current synthetic demo for an honest timeline/phase experience. Explain PID, STFT/LTFT, cadence/stale readings, pairing tolerance, Pearson correlation, percentage points and operating-condition matching where the choices occur. Preserve the full-document learning links, analytics exclusion, real worker and all V3 controls. Do not implement D/E early or imply persistent notebook capture exists. Run 61 OBD units, registry tests, typecheck/lint/build, new onboarding + full relevant browser regression and responsive/privacy checks; review screenshots, update evidence and checkpoint normally. No push/deployment before the complete release gates.

At program completion only, publish the single final delivery report using the PRD's 15-section format with release SHA/workflow/URLs/results, honest real-world/device limitations, final branch/status/ahead-behind, and one next product decision. Do not automatically start that next product.

## 10. Task 1 / Workstream A milestone (2026-10-03 UTC)

### Baseline and Task 0 review

Verified `C:\TorqueGirl`, clean `codex/next-development-program`, HEAD `273a676e663f03c6ac091185aad9e743bd96f120`, initially `1 0` ahead/behind `origin/main`. Fresh host-permission `git ls-remote origin refs/heads/main` returned `c2789e8357f23b84bd83aed81fb4ffee293c43d9`; no newer remote/user changes were found. The Task 0 diff contains only the full 1,425-line PRD and 270-line baseline report. Both were read completely and compared to the requirement matrix: A1-A5, B1-B3, C1-C3, D1-D6, E1-E9, optional E6, cross-cutting constraints, F gates/deployment/public fix loop and final report are accounted for. Baseline evidence is correctly distinguished from final-release evidence. No missing requirement or hidden implementation was found. No root/ancestor/repository `AGENTS.md`, `.agents/skills` or checkout-local instructions exist; the ownership-denied OBD worktree and security settings were untouched.

### Delivered behavior and decisions

- **A1/A2:** one shared `SiteHeader`, `SiteBrand` and six-destination registry on all 17 routes: Home `/`, Engines `/engines`, Technology `/technology`, Tools `/tools`, Off Track `/off-track`, About `/#about`. About remains a real homepage section; no empty category pages were added. The analyzer keeps its dark styling and LOCAL / PRIVATE badge. At <=960px the menu expands in normal document flow, keeping it clear of shell clipping and usable in 844x390 landscape. Native disclosure semantics use an accessible changing label, `aria-expanded` and `aria-controls`; Enter/Tab, Escape with focus return, focus/outside-pointer dismissal, link dismissal, same-document About focus and resize dismissal work. Header/footer/brand targets have minimum 44px dimensions; mobile menu links are at least 48px tall. Old editorial rules that hid most links were removed.
- **A3:** server-rendered editorial homepage now says “Explore machines. Make sense of data.” Learn / Analyze / Explore cards lead to actual destinations, with a direct hero analyzer CTA and an OBD tool spotlight before Latest. Copy accurately describes local import, synthetic demo, quality/phases/A+B and evidence before diagnosis. Existing hero/article/Off Track assets and editorial character remain. All 13 previous homepage IDs remain unique and reachable. No notebook or torque-power feature is advertised. Homepage canonical, title/description, OG and Twitter copy match the positioning; existing social hero image and large-image card are explicitly retained.
- **A4:** `ArticleSummary.path` defines canonical registry destinations independently of editorial labels; Engine Legends correctly routes under `/engines`. `allArticles` composes existing category arrays; `getLatestArticles` sorts publication dates descending, retains registry order on ties and never mutates the source. Current Latest is Golf Day (2026-09-24), live-data/logs (2026-09-23), 2JZ (2026-09-22). Category cards use the same helper/paths. All homepage article features now reference registry summaries rather than duplicate titles/descriptions/assets/paths. Curated feature selection remains editorial; Latest derives automatically.
- **A5:** one shared footer on every route, including the previously footerless Tools index and minimal analyzer. All six destinations plus Privacy, Terms and `mailto:hello@torquegirl.com` Contact are present; footer branding remains readable on dark backgrounds.
- **Privacy navigation decision:** current `DocumentLink` and `SiteAnalytics` source were inspected, not assumed. Native full-document navigation is retained for every new shared link. Same-origin `/` replaces the old hard-coded production-home redirect in shell call sites: production still reaches the same homepage, while local/preproduction navigation stays on the tested origin. `HomeLink` is retained as an unused compatibility helper. Analyzer exit continues to destroy raw in-memory analysis; returning starts empty. Nothing claims future notebook persistence can restore raw logs. Future milestones must keep this fresh-document boundary, sensitive-route analytics exclusion and explicit compact-only evidence persistence.

### Changed files

New: `components/site-header.tsx`, `components/site-footer.tsx`, `components/site-brand.tsx`, `lib/site-navigation.ts`, `app/site-shell.css`, `app/home-discovery.css`, `tests/content/registry.test.ts`, `tests/browser/navigation.spec.ts`.

Modified: `lib/torquegirl-content.ts`, `package.json` (adds `test:content`, no dependency/lockfile change), `app/layout.tsx`, `app/globals.css`, `app/article.css`, this execution report, and all 17 page files: `app/page.tsx`; `app/engines/page.tsx`; `app/engines/how-a-nascar-v8-engine-works/page.tsx`; `app/engines/toyota-2jz-gte-tuning-legend/page.tsx`; `app/engines/turbocharger-vs-supercharger/page.tsx`; `app/technology/page.tsx`; `app/technology/how-formula-1-car-creates-downforce/page.tsx`; `app/technology/what-is-an-obd2-scanner/page.tsx`; `app/technology/obd2-scanner-vs-code-reader/page.tsx`; `app/technology/how-to-read-obd2-codes/page.tsx`; `app/technology/how-to-analyze-obd2-live-data-and-logs/page.tsx`; `app/off-track/page.tsx`; `app/off-track/golf-day/page.tsx`; `app/tools/page.tsx`; `app/tools/obd2-log-analyzer/page.tsx`; `app/privacy/page.tsx`; `app/terms/page.tsx`.

Final diff review also compared the 16 non-home page bodies/metadata to HEAD after allowing only shell/import/category-path/order changes: unchanged article/legal/tool content and metadata were confirmed. CSS comparison confirmed only obsolete navigation rules were removed from the two existing stylesheets. New shell/discovery CSS, components, registry, homepage and tests were reviewed directly. No analyzer algorithms, persistence, analytics, worker, assets, dependencies, deployment workflow or PRD edits occurred. `git diff --check` passes. Evidence: `outputs/next-development-task1/diff-review.json`.

### Test evidence

Logs and screenshots are ignored local artifacts under `outputs/next-development-task1/`. The production server uses `node node_modules/vinext/dist/cli.js start --port 5184`; tests use `http://127.0.0.1:5184` and the real bundled worker `_next/static/worker-_nsHyO87.js`. Task-owned servers are stopped after validation. No public deployment or new-release production check was performed; Task 0's three public tests remain baseline evidence only.

| Command / check | Actual result | Evidence |
| --- | --- | --- |
| `npm run test:obd` with host permissions | **61 passed, 0 failed/skipped/cancelled**, 743.954ms | `obd-unit-host.log`; same 61 baseline tests, unchanged OBD implementation |
| `npm run test:content` with host permissions | **3 passed, 0 failed/skipped/cancelled**, 235.3922ms | `content-unit-host.log`; cross-category freshness/new publication/date ties/immutability/limits/unique paths/Engine Legends/date validity |
| `npm run typecheck` | PASS, exit 0 | `typecheck.log` |
| `npm run lint` | PASS, exit 0; **0 errors, 18 warnings**, vs baseline 0/31 | `lint.log`; remaining image-optimization warnings, no blocking/new rule error; obsolete unused disables removed |
| `npm run build` | PASS, exit 0; all five stages / 17 routes | `build.log`; existing nonblocking Vinext timing/classification notices remain |
| `npm run test:browser -- --output=outputs/next-development-task1/final-browser-results` with host permissions | **38 passed, 0 failed**, reporter duration **1.3m** | `final-browser.log`; all 27 existing tests unchanged + 11 new navigation tests, on the build with final target dimensions |
| Final focused `npm run test:browser -- tests/browser/navigation.spec.ts tests/browser/release.spec.ts --output=outputs/next-development-task1/final-navigation-release-results` with host permissions | **14 passed, 0 failed**, **39.7s** | `final-navigation-release.log`; rerun on the final build after small-text contrast and explicit social-image retention, without repeating unaffected large-log tests |
| Routes / sitemap / canonicals / preserved assets | **17/17 routes HTTP 200**, all canonicals correct; sitemap HTTP 200, **17 entries / 17 unique**; six WebP assets and `/tools/` HTTP 200 | Existing release regression and XML inventory; no new route or sitemap change |
| Privacy after actual homepage/editorial/tool clicks | Fresh `performance.timeOrigin`, zero analyzer analytics scripts/`dataLayer`, empty returning session; **0 off-origin / 0 content-bearing or non-read requests / 0 runtime errors** during sentinel import | New navigation privacy case plus unchanged real-worker/release/share-tool privacy tests |
| Navigation / resources | Six real destinations clicked at desktop and 320px repeatedly; latest cards and Engine Legends clicked; all 17 header/footer inventories; **0 monitored console/runtime errors or failed same-origin resources** | New suite checks after actual navigation, not only HTTP reads |
| Keyboard / touch / layout | Enter/Tab/focus outline/Escape return/close/reopen/About focus/focus-out/resize dismissal; 375px real touchscreen emulation and actual tap to Tools; header/footer/brand minimum 44px | New navigation tests; computed small-text contrast >=4.5:1 for homepage navigation/labels/Latest/Follow |
| Visual / responsive | Reviewed homepage closed and menus open at **320x740, 375x812, 390x844, 430x932, 844x390, 1440x1000**; editorial/analyzer menus and desktop shells; home/footer/spotlight/Latest | `WIDTHxHEIGHT-home/article/analyzer-closed/open.png`, home section/footer screenshots; 57 automated viewport artifacts. Full-section screenshots at 320 and 1440, plus 768x1024/tablet and 961px menu-breakpoint spot checks. Root and selected component/text containers measured, so hidden root overflow is not treated as sufficient proof |

Performance in the full 38-test run on the target-dimension build: 200k-row import **1843ms / 66 timer ticks**, second 200k import + comparison **2786ms / 106 ticks**, remap **880ms / 43 ticks**. Baseline was 2007ms/74, 2753ms/106 and 884ms/44. Single-machine observations show no material regression; they are not physical-device performance guarantees.

### Defects corrected and limitations

Corrected hidden editorial Tools/destinations, duplicate topical menu destinations, absent/inconsistent footer paths, stale manually selected Latest, duplicated homepage metadata, dark footer brand contrast, inadequate short-link/brand target dimensions and low-contrast small homepage labels. Visual review replaced an initial hero heading that split “Understand” at 320px without shrinking body/heading text. Focused tests caught the analyzer's generic button rule overriding desktop toggle hiding; the shared header selector now has appropriate specificity. Explicit OG/Twitter fields retain social imagery after replacing homepage metadata (a direct rendered-meta check confirmed nested metadata otherwise dropped the inherited image).

Infrastructure is distinguished from product defects: sandbox tsx failed before assertions with `uv_os_get_passwd returned ENOMEM`; sandbox Chromium failed all 10 initial navigation launches with `spawn EPERM`. Authorized host reruns passed; security settings were unchanged. One initial registry fixture incorrectly expected different publication dates to tie; it was corrected to supply genuinely equal dates. Five initial viewport failures used a locator tied to the changing “Open menu” label after it became “Close menu”; the test now locates the same button independently and still verifies its accessible state. The sixth failure was the actual analyzer desktop CSS issue above. Vinext emits “Premature close” diagnostics for image streams canceled by deliberate document navigation/teardown; the browser resource monitors and asset HTTP checks pass.

No external blocker remains. Coverage is Windows Chromium with emulated viewports/touch, not physical phones/tablets, Safari or Firefox; no physical vehicle/log corpus exists. Notebook, torque-power, complete B-F journeys, all-feature release hardening and production remain pending. Existing privacy sitemap date mismatch and article `dateModified` alignment remain assigned to later content integration; nav-only shell changes do not invent new article publication dates. Homepage originally has no maintained sitemap `lastmod`; no misleading article freshness date was added. The current milestone does not authorize pushing/deploying before the complete A-F gates pass.


## 11. Task 2 / Workstream B milestone (2026-10-03 UTC)

### Repository and preceding milestone review

Verified clean `C:\TorqueGirl`, branch `codex/next-development-program`, expected starting HEAD `77bac2778b43823a4525a050322b1e912cee3404`, 2 ahead / 0 behind `origin/main`. Fresh read-only `git ls-remote origin refs/heads/main` succeeded with host permissions both before implementation and before checkpoint; remote remains `c2789e8357f23b84bd83aed81fb4ffee293c43d9`. No newer user/remote work was found. No root/ancestor AGENTS.md or checkout-local .agents/.codex/skills exist; the separate ownership-denied OBD worktree was untouched.

Read the full PRD and report, then inspected the Task 1 diff against A1-A5: shared shell components/CSS, all route call sites, homepage/product copy, registry/Latest helper, canonical/social metadata and navigation/content tests. Re-ran the pre-B production-build navigation suite: **11 passed / 0 failed, 30.3s**, plus the original **3 registry tests passed** (168.8117ms, tool stdout). No concrete Task 1 regression was found. Evidence: `outputs/next-development-task2/task1-review.log`. Task 1 shell, original article assets, homepage anchors, Latest publication ordering, native DocumentLink entry and analytics exclusion were retained.

### Delivered journey and content decisions

- **B1:** each early scanner/capability/code article now has one contextual link to live-data/log analysis. The existing scanner → capability → codes links remain usable. Live-data analysis leads to preparation, and the new preparation guide links back to live-data/capability learning. Analyzer reciprocal learning links include preparation and all earlier resources. Tests click the full scanner → capability → codes → live data → preparation → analyzer journey at narrow phone and desktop widths, then return through the reciprocal guide and live-data CTA.
- **B2:** added `/technology/how-to-record-and-export-obd2-logs`. The existing 12-minute live-data article already explains interpretation with three figures and a channel table; a dedicated 8-minute preparation guide keeps both readable. Reuses the existing licensed `meter1.webp` image, shared header/footer, ArticleShare, rail, recap cards, step list, related-article CTA and takeaway styling. No generated assets or dependencies.
- Guide covers focused supported channels, bank/sensor identity, codes/freeze-frame preservation, cold/warming/warm context, settled idle, ordinary steady cruise and acceleration/deceleration context, practical duration examples without universal prescriptions, actual cadence versus file-writing interval, gaps/repeated/stale values, timestamps/timezones, units, CSV/TSV when the exporter supports them, export/layout differences, private originals and documented working copies, what not to alter, location/VIN/time/filename privacy, and safe next verification/retest in the reader's own notes.
- Safety is explicit: configure and verify while parked; keep cables clear of controls; never operate a phone/scanner/computer while driving; passenger operation or secure unattended logging; stop safely for changes/export; ventilated stationary running; ordinary lawful conditions only, with no hard pulls/sudden braking/risky maneuvers. The guide does not require every driving phase or claim a diagnosis.
- **B3:** guide and live-data article expose **I HAVE A LOG / Analyze my log locally** using full-document DocumentLink. Explain browser-local processing, no upload, original-file backup, and clearing the in-memory analysis on leaving/reload. No onboarding, notebook, torque-power feature or future persistence is presented as existing.
- New registry entry automatically becomes homepage Latest and first Technology card. Existing publication dates remain intact; optional registry `updatedDate` records 2026-10-03 for the four substantively changed OBD articles. Visible update dates, JSON-LD dateModified, OG publication/modification fields and sitemap lastmod agree. New guide title/description/canonical/OG/Twitter/share URL derive from the registry. Sitemap now has **18 unique routes**, preserving all **17 existing routes**. Unrelated privacy-date drift remains assigned to Task 8.
- Analyzer learning copy now accurately calls exporter recognition a header convention rather than validated scanner/app compatibility. Core analyzer, imports, workers, algorithms, storage, analytics, deployment and security settings are unchanged.

### Primary sources and implementation checks

Checked these primary documents on 2026-10-03 and linked them in the guide: [OBD Solutions: Reading Real-Time Data](https://www.obdsol.com/knowledgebase/obd-software-development/reading-real-time-data/) for requested parameter/PID behavior; [OBDLink: Get Started with Logs](https://support.obdlink.com/support/solutions/articles/43000709894-get-started-with-logs) for channel refresh costs, repeated values at fixed write intervals, distinct CSV/binary logging and logging-channel selection; [OBD Fusion official feature documentation](https://www.obdsoftware.net/software/obdfusion) for the existence of logged CSV files alongside live graphing. Those sources establish documented features, **not** TorqueGirl compatibility with every app/version/device/export. No device ranking, universal export steps or physical-validation claim was added.

Verified TorqueGirl-specific guidance against `lib/obd/csv.ts`, `time.ts`, `mapping.ts` and `adapters.ts`: comma/semicolon/tab detection, text CSV/TSV/TXT, one header record, unsupported preambles/separate unit rows/proprietary binaries, explicit numeric time interpretation, seconds/milliseconds/ISO/clock support, UTC handling for offset-free ISO values, unit provenance and conservative header heuristics. Files themselves were unchanged. The duration and context examples are editorial planning guidance, not device specifications or diagnostic thresholds.

### Actual final evidence

All local evidence is under ignored `outputs/next-development-task2/`. Production build served by task-owned `node node_modules/vinext/dist/cli.js start --port 5184` at `http://127.0.0.1:5184`, using real worker `_next/static/worker-_nsHyO87.js`. Test output directories stay under that evidence directory; no existing root results or user files were deleted.

| Command / check | Actual result | Evidence |
| --- | --- | --- |
| `npm run test:obd` with host permissions | **61 passed, 0 failed/skipped/cancelled**, 923.9011ms | `obd-unit.log`; core OBD untouched |
| `npm run test:content` with host permissions | **3 passed, 0 failed/skipped/cancelled**, 270.6847ms | `content-unit.log`; expected new publication + valid update dates |
| `npm run typecheck` | PASS, exit 0 on final source/tests | `final-typecheck.log` |
| `npm run lint` | PASS, exit 0; **0 errors / 19 warnings** | `final-lint.log`; 18 inherited image warnings + 1 new guide image warning using the existing img convention |
| `npm run build` | PASS, exit 0; all five stages / **18 routes** | `final-build.log`; existing nonblocking Vinext timing/classification notices |
| Focused `test:browser -- tests/browser/obd-learning.spec.ts` | **10 passed / 0 failed**, **20.1s** | `final-learning.log`, `final-learning-results/` |
| Complete `npm run test:browser -- --output=outputs/next-development-task2/verified-browser-results` | **48 passed / 0 failed**, **1.7m** | `verified-browser.log`; all prior 38 cases + 10 B cases |
| Routes / links / SEO | **17 existing + 1 new HTTP 200**, 18 unique sitemap entries; **17 unique internal destinations/anchors checked** across 5 learning articles; no monitored same-origin resource/runtime/console errors | New learning SEO/link crawl plus unchanged release regression; all canonicals, descriptions, OG/Twitter images, dates and actual homepage/category entry clicks |
| Actual guide/live-data → analyzer entry | Fresh performance.timeOrigin, zero analytics scripts/dataLayer, real same-origin worker and rendered charts, empty analysis on returning, **0 off-origin / 0 content-bearing or non-read requests after analyzer document commit** | Narrow + desktop journey tests; synthetic sentinel filename and numeric value checked in requests/storage; existing privacy/share-tool regression also passes |
| Sharing | New guide clipboard/social payload uses only its canonical article URL; existing tool sharing remains static | New guide share test + 4 unchanged tool-share tests |
| Responsive and visual | **320 x 740, 375 x 812, 390 x 844, 430 x 932, 844 x 390 landscape, 1440 x 1000 desktop** | 114 screenshots: each changed article intro/CTA, guide safety/channels/conditions/cadence/time/export/original/privacy sections, analyzer reciprocal links; measured root, figure and text bounds; reviewed guide at all six sizes plus live-data CTA and source/control layouts |

Final full-run performance: 200k-row import **1847ms / 66 timer ticks**, second 200k import + comparison **2785ms / 108 ticks**, remap **887ms / 44 ticks**. Task 1 was 1843/66, 2786/106 and 880/43. No material regression is evident from these single-machine measurements; they are not device guarantees.

### Failures investigated, fixes and scope review

Initial B responsive assertions reported the inherited phone figures' intentional bleed into article padding as body scrollWidth overflow. The corrected check measures figure/text actual viewport bounds and every text container's own overflow while allowing that existing safe image bleed; it does not rely only on hidden root overflow. It then caught two real inherited 320 px heading overflows in the code/live-data articles. Shorter equivalent headings (brand-specific codes; compare related signals) preserve meaning without shrinking text. Visual review also caught the mobile I HAVE A LOG label touching its link at 375 px; stacked mobile labels and a minimum 44 px related-link target corrected it.

The initial full regression had **46 passes / 2 failures**: the second narrow heading and a timing assertion that started privacy monitoring when the analyzer navigation request began. The latter caught a page-view beacon from the outgoing **recording article**, before the fresh analyzer document committed; it contained no imported data. The final test starts the boundary at the main frame's analyzer document commit and continues monitoring every subsequent request through file import, worker analysis and the reciprocal return/demo entry. Fresh-document and analytics-absence assertions remain. Focused 10/10 and final full 48/48 pass. This timing correction does not disable editorial analytics or filter away analyzer-origin requests.

Final diff was reviewed: two new files (guide and browser suite), four OBD articles, analyzer reciprocal copy, two small existing article CSS rules, registry, sitemap, registry fixture expectations, navigation test title and this report. No changes to PRD, OBD component/core files, persistence, DocumentLink implementation, SiteAnalytics, assets, package/lockfile or deployment workflow. `git diff --check` passes. No unowned/newer work or denied worktree changed. Diff evidence: `outputs/next-development-task2/diff-review.json`. Task-owned servers were stopped after validation. Normal checkpoint SHA and final clean Git relationship are provided in the handoff; no push/deployment was performed.

Limitations remain explicit: Windows Chromium with emulated sizes, not physical phones/tablets or Safari/Firefox; no approved real-drive corpus or actual scanner/app/device validation. Vinext can log Premature close for image streams canceled by deliberate document navigation; same-origin browser resource checks and asset HTTP checks pass. No unresolved B product-test failure or external blocker remains. C-F, later unrelated date alignment, final release gates and production verification remain pending. Next task is **Task 3 / C1-C3 analyzer onboarding**, bounded as above.
