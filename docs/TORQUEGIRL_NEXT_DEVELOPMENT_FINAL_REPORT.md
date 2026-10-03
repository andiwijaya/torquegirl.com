# TorqueGirl Next Development - Final Delivery Report

## 1. Final release status

Mandatory A1-A5, B1-B3, C1-C3, D1-D6, E1-E5/E7-E9 and F release gates are complete and verified through actual public production. Optional E6 Curve A/B comparison is deferred. No new backend, accounts, cloud storage, raw-log persistence or diagnosis was introduced.

## 2. Repository / final commit

Repository: https://github.com/andiwijaya/torquegirl.com; default branch/main integration: `main`. Reviewed Task 9 checkpoint: `97cde4e1bd631f97c4ed26be68e0512fc2236f34`. Final product source: `33abf49b98afd37e0a70eee88ab26fefdb894493`. The subsequent final checkpoint changes browser evidence/tests and documentation only; its exact SHA, final deployment and clean remote relationship are recorded in the final handoff and `outputs/next-development-release/final-state.json` after that commit exists. No newer/user work was overwritten; all integration/pushes were normal, with no force/reset or security/access changes.

## 3. What changed

### Navigation / Homepage

Shared headers and footers expose Home, Engines, Technology, Tools, Off Track and About. Homepage Learn/Analyze/Explore and two tool spotlights lead to real destinations. Latest remains registry-derived and publication-date ordered. Identity, existing imagery and editorial content remain intact; mobile menu supports keyboard, Escape, focus and touch.

### OBD Learning Journey

Scanner basics -> scanner vs reader -> codes -> live data -> recording/export preparation -> analyzer. New recording guide covers safe focused captures, units/timestamps/cadence, export integrity, retaining originals and privacy, without claiming untested exporter compatibility.

### Analyzer Onboarding

Ten practical steps explain file selection, mapping review, quality, signals, cursor/playback, phases, regions, independent A/B comparison, observations and retests. Existing real-worker V1/V2/V3 behavior remains covered.

### Observation / Retest Notebook

Optional structured notes record vehicle/context, observation, evidence, alternative explanation, next test and retest. Explicit compact capture/save, edit/reload/delete/clear, validated versioned JSON backup import/export and separate draft backup are supported. Destructive actions require confirmation; quota/denied/corrupt storage, duplicate/conflict and stale-tab cases preserve data/drafts with recovery.

### Torque-Power Explorer

Both torque+RPM->power and power+RPM->torque use pure SI math; Nm/lb-ft and kW/mechanical hp conversions retain quantities. Bounded ordered curves support sample/paste/edit, separate sampled peaks, two plots, keyboard/touch inspection and full numeric alternatives. Errors cover empty/nonfinite/overflow/duplicate/out-of-order inputs and inverse zero-RPM. Engine articles link reciprocally to the tool.

## 4. Routes added / changed

Added `/technology/how-to-record-and-export-obd2-logs` and `/tools/torque-power-explorer`. All 17 original URLs remain: `/`, `/engines`, `/engines/how-a-nascar-v8-engine-works`, `/engines/toyota-2jz-gte-tuning-legend`, `/engines/turbocharger-vs-supercharger`, `/technology`, `/technology/how-formula-1-car-creates-downforce`, `/technology/what-is-an-obd2-scanner`, `/technology/obd2-scanner-vs-code-reader`, `/technology/how-to-read-obd2-codes`, `/technology/how-to-analyze-obd2-live-data-and-logs`, `/off-track`, `/off-track/golf-day`, `/tools`, `/tools/obd2-log-analyzer`, `/privacy`, `/terms`. Shared shells changed across the 19 routes; relevant learning/engine articles, Tools, home and privacy copy were updated. Sitemap/metadata/canonical URLs and maintained modified dates agree.

## 5. Internal-link journey

Actual desktop/mobile clicks cover home Learn -> scanner -> capability -> codes -> live data -> preparation -> analyzer -> compact note -> editorial return -> notebook/retest. Home spotlight/explore, Tools cards and three engine articles reach both appropriate tools through full-document entry. Both tools return to relevant reading. Route crawl checks internal destinations, anchors and linked assets.

## 6. Local storage / privacy behavior

Only explicit notebook save/reviewed import writes strict allowlisted versioned compact JSON to browser localStorage, bounded to 100 records and 512,000 bytes. Raw logs, rows, sample arrays, traces, analysis sessions and raw source filenames are never stored/restored. File labels can enter a note only through requested compact capture. Drafts stay in memory unless explicitly downloaded. Web Locks protects cooperative cross-tab writes and fails closed when unsupported; storage is neither encrypted nor cross-device sync.

Editorial pages may load site analytics. Both tools use full-document navigation, exclude app analytics and return Cache-Control no-transform to prevent Cloudflare edge beacon injection. Actual tool input/import/CRUD/export/merge/replace/share requests are instrumented before navigation; private sentinel text must not appear in network or URLs. Share contains only the public tool URL. Actual pagehide worker/object-URL cleanup and real Back/Forward empty raw sessions are tested. Native BFCache was not observed; persisted-event guards are separately synthetic.

## 7. Tests

Local accepted checkpoint: **132 units (61 OBD / 36 notebook / 32 math / 3 content), 130 Chromium, 32 Firefox, 32 WebKit, seven additional final dialog checks**, typecheck/build pass, lint **0 errors / 20 inherited native-image warnings**. Reused unchanged suites and controlled performance evidence after independent source review.

Additional official Node **22.23.3 / npm 10.9.9**: all **132 units**, typecheck, lint **0 errors/20 warnings**, five-stage/19-route production build pass. Privacy repair repeats typecheck/lint/full build and **6/6 affected local Chromium checks, 33.2 seconds**. Actual Linux CI npm ci/build/deploy success is separately recorded. Actual public production: **131/131 complete Chromium checks** (655183.703 ms), **21/21 focused Firefox** (71123.593 ms), **21/21 focused WebKit** (90574.704 ms), plus **8/8 affected final-observer Chromium checks** (68071.354 ms). Every accepted run has **0 failed / 0 skipped / 0 flaky**. The new controlled observer fixture brings the suite to 132 defined browser cases; 131 original full cases and the eight affected/final cases cover them, without claiming a single complete 132-case run. Raw initial/intermediate failures remain preserved.

Raw npm audits **fail**: full **15 high / 10 moderate / 1 low**; production **2 moderate**; **zero critical**. Next 16.3.8, React/RSC 19.2.8 and plugin-rsc 0.5.30 including its actual vendored 19.2.8 decoder repair known runtime issues. Reviewed residual call sites provide no demonstrated current public-tool reachability; residual debt is accepted for this scoped release, not a clean audit or exhaustive security proof. Detailed dependency paths/advisories and raw output are in execution report section 18 and release evidence.

## 8. Responsive verification

Emulated **320x740, 375x812, 390x844, 430x932, 844x390, 1440x1000**, plus **768x1024 tablet**. Complete integration/menus, import/errors/mapping/playback/A+B/relationships, notebook dialogs/failure/conflicts, Explorer points/200-sample/error/units/numeric states check root and component bounds, legibility, contrast, focus, keyboard/touch and 44px targets. Actual production screenshots are inspected. These are desktop browser engines with emulated viewports, not physical phones/tablets or certified assistive technology.

## 9. Performance observations

Controlled original c2789e8/current distributions use the same patched runtime, fixtures, warm state and original median<=1.15x/p90<=1.25x guards. Earlier **1.329x** region collection remains preserved; prespecified **14 paired V3 runs and both split halves** reconcile it, region medians **295.15/298.70 ms**, ratios **1.012/1.027**. All original guards pass. No attribution beyond the measurements is claimed.

Local near-limit real UI note: **496,121 bytes / 100 records, 62.5 ms through render, 0.8 ms localStorage write**; the next note is rejected without changing bytes. Explorer 200 points repeated at all seven sizes: **17-35 ms through two frames**, 400 markers/200 numeric samples with independent unit results. Production timings are observations rather than independent benchmarks; **200k import 1914 ms/68 UI ticks, B import+compare 2875 ms/111 ticks, remap 899 ms/44 ticks; near-limit notebook 64.7 ms render/0.9 ms write; 200-point Explorer 29.7 ms through two frames**. No physical device/real-drive throughput claim.

## 10. Deployment

Unchanged `.github/workflows/deploy-cloudflare.yml`: main push -> Ubuntu Node 22 -> npm ci -> build -> Wrangler Worker `torquegirl-com`. Existing authorized keyring/OAuth used; no credentials or protections changed.

First [run 37133005941](https://github.com/andiwijaya/torquegirl.com/actions/runs/37133005941) at 74375a4 failed npm ci before deploying; repaired only eight optional @emnapi lock paths required by npm 10/Linux, retaining unrelated versions and peer classifications. [Run 37133324640](https://github.com/andiwijaya/torquegirl.com/actions/runs/37133324640) deployed c61bce0 successfully, version `37ac1e4f-772f-4135-bb30-9624791ccb4c`. Privacy fix [run 37134308569](https://github.com/andiwijaya/torquegirl.com/actions/runs/37134308569) deployed exact product SHA **33abf49b98afd37e0a70eee88ab26fefdb894493**, job **111235577957**, completed **2026-10-03T15:45:00Z**, Cloudflare version **5d9dee4c-6d14-4927-a21c-12639952ac46**. The final evidence checkpoint deployment is recorded in the handoff/final-state evidence.

Public site: https://torquegirl.com; Worker endpoint: https://torquegirl-com.andiw999.workers.dev. Rollback reference: original **c2789e8357f23b84bd83aed81fb4ffee293c43d9**, successful [run 36203821098](https://github.com/andiwijaya/torquegirl.com/actions/runs/36203821098), Cloudflare version **16eda17c-7db9-4e53-8bb9-0cd738452b11**. Normal workflow checks are green; deployment does not imply a CI test suite that the workflow does not run.

## 11. Production verification

Tests target **https://torquegirl.com** directly, not a preview or workers.dev substitution. All 19 URLs in section 4, https://torquegirl.com/sitemap.xml, internal anchors/assets/canonical/metadata, actual learning/notebook export/import journey, both Explorer directions/units/curve peaks/errors and seven viewports are covered. Verified live tools: https://torquegirl.com/tools/obd2-log-analyzer and https://torquegirl.com/tools/torque-power-explorer; guide: https://torquegirl.com/technology/how-to-record-and-export-obd2-logs.

First full production run **126 passed/4 failed, 0 skipped/flaky, 685923.949 ms** exposed automatic edge analytics in Explorer. All four failures are preserved; repo response-header repair redeployed normally. Six independent real-click entry snapshots after fix have **no analytics scripts or dataLayer** on either tool. Final production evidence: `production-{chromium-final,firefox-accepted,webkit-accepted,chromium-affected}.{log,json}`, screenshots in `production-chromium-artifacts`, independent six-entry `analytics-probe-final.json`, active Cloudflare deployment list and `production-accepted-summary.json`, all under `outputs/next-development-release/`. Full Chrome crawl reports **19 routes/17 original/22 internal destinations/46 assets, 0 broken**, and the compact A/B notebook journey **32 requests/0 prohibited/0 runtime errors, 4138-byte backup/8 signals/8 statistics**. Actual pagehide disposes **1/1 worker and 2/2 object URLs**. The private-tool base/slash/query response checks all pass. Native BFCache remains explicitly unobserved; actual history and synthetic guards are recorded separately.

## 12. Bugs found during implementation and how they were fixed

Client-readiness races now disable controls until handlers/state are ready. Private form history restoration and lifecycle cleanup are guarded. Notebook failed draft import restores storage eligibility; bounded dialogs scroll and preserve visible controls/focus. Mobile inherited heading/byline clipping wraps correctly. Contrast and validation focus/error relationships are repaired. Supported runtime security patches include the decoder actually used by plugin-rsc. Controlled benchmarks resolve the preserved timing discrepancy without weakening guards.

Release found two additional defects: npm 10/Linux optional lock resolutions repaired narrowly; actual Cloudflare Explorer analytics injection prevented by documented no-transform headers and response regression. Vinext wildcard headers did not match the base path, so explicit base and descendant entries are both tested. Initial Firefox extended production coverage found harness assumptions: file selection before disabled-input readiness, early empty Worker.url(), and rapid document exits cancelling image/module loads. Tests now await readiness, inspect actual running-worker location, explicitly decode article images, and separately record only outgoing-document NS_BINDING_ABORTED or WebKit Load request cancelled events tied to a real navigation within one second. All HTTP failures, console errors, unexpected/current-document aborts and private-network assertions remain release failures. A controlled intercepted fixture proves those failure channels are retained; the live NASCAR image decodes and its SHA256 matches repository bytes. Initial Firefox 16/20, intermediate 16/20, 18/20 and 20/21 runs and one interrupted stale-copy attempt remain preserved. Final 21/21 accepted Firefox coverage follows the corrections. WebKit initially passed 15/21: outgoing editorial cancellations and a late Cloudflare RUM access-control error. A browser API ownership probe records all beacons in the recording guide/Tools index, none in private tools. Explicit editorial-load settlement and the equivalent WebKit cancellation classification produce 21/21 accepted coverage with page-error/privacy assertions unchanged. No product/runtime/asset modification was needed for those harness findings. Failed/intermediate test and deployment evidence is retained; no test assertion or security setting was bypassed.

## 13. Remaining known limitations

No user-approved real scanner/app export or physical real-drive corpus was supplied/tested. Scanner compatibility, car behavior, phone/tablet hardware, actual Safari/macOS and assistive technology are not certified. Native BFCache was not observed. Optional E6 Curve A/B is deferred. Notes remain bounded local data; browser clearing/storage restrictions can remove/prevent saves and users need explicit backups. Sampled Explorer curves interpolate no unsupplied engine capability and use mechanical hp, not PS.

Residual audit findings remain maintenance debt, reassessed before exposing image/OG upload, ZIP/YAML/AJV authorization, WebSocket, server-action or database scaffolding. Narrow optional lockfile advisory fixes can be a separate maintenance change; no unrelated upgrades included. Lint retains 20 native-image warnings. No external release blocker remains. Workflow annotations flag checkout/setup-node v4 action-runtime maintenance and the announced ubuntu-latest image migration; the app itself builds under Node 22. Keep those as separate maintenance items.

The cancellation observer uses the request-start page.url() and a symmetric one-second navigation window. It can misattribute a genuine abort shortly before a navigation; its controlled fixture proves current-document abort/HTTP/console failure retention but does not directly exercise both excluded browser-specific outgoing reasons. This is a precision limitation, not exhaustive network proof. No active-document or private-origin issue is waived solely on timing: independent image decoding/integrity, unfiltered private sentinels, document-level fetch/XHR/beacon initiators and analytics/header checks support the scoped release.

## 14. Git final state

Branch **main**, product SHA **33abf49b98afd37e0a70eee88ab26fefdb894493**. Final evidence-only checkpoint SHA and deployed revision are resolved after this report's commit exists and recorded in `outputs/next-development-release/final-state.json` plus final handoff. Final check must confirm clean working tree and **0 ahead / 0 behind origin/main** after fresh fetch. The development checkpoint branch is preserved; no force/reset performed.

## 15. Recommended SINGLE next product decision

Approve a small, consented real-export/real-drive validation corpus with documented exporter/version/unit/time provenance and conservative acceptance criteria before deciding whether to expand toward Garage. Do not implement that next product automatically.
