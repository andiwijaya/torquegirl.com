# TORQUEGIRL OBD2 DATA ENGINE V1 + LOG ANALYZER V1
# IMPLEMENTATION REPORT

Validated locally on 25 September 2026. No push, deployment or pull request.

## 1. Executive Summary

Implemented a local-browser OBD2 data engine and integrated analyzer at `/tools/obd2-log-analyzer`, with a `/tools` index. V1 includes conservative column identification, unit normalization, an actual-time model, transparent import quality, synchronized charts, nearest-time vehicle-state inspection, playback, gap observations, and time/semantic comparison contracts.

This is an inspection foundation, not an automated diagnostic system. It contains no fault classifier, invented signal, inferred AFR, confidence score or remote log processing. All quality gates passed: 20 engine tests, seven production-browser tests, TypeScript, lint and production build. Lint retains 24 warnings in existing editorial code.

## 2. Repository Architecture

Audited the committed baseline `a8290af`: React 19, TypeScript, Next-compatible App Router under Vinext 1.0.0-beta.5/Vite 8. Routes live under `app/`; editorial data is in `lib/torquegirl-content.ts`; site and article styling use plain CSS. Mobile navigation is local to the homepage, while article/category routes use their existing headers. Metadata uses canonical TorqueGirl URLs and a static XML sitemap.

OBD2 content already covered scanners, code readers and trouble codes. No reusable OBD ingestion engine or application test suite existed in the committed baseline. Recharts is installed, but V1 does not add a chart runtime dependency: bounded SVG paths provide the required linked charts.

The repository has Sites-origin build configuration plus a GitHub Actions workflow deploying a Cloudflare Worker on pushes to `main`. That workflow was not changed or run. Validation used the production Vinext Node server locally; Cloudflare runtime/deployment validation was not performed.

The main checkout had substantial uncommitted editorial work, including a new live-data article and Off Track pages. Work therefore used a separate worktree from committed HEAD. Those unpublished changes were inspected for context but were not copied, committed or modified.

## 3. OBD Data Architecture

```text
Browser File / demo Blob
  → isolated Web Worker
  → delimiter detection + record tokenizer
  → format/header adapter detection
  → column identity + unit compatibility
  → canonical values + elapsed timeline + quality
  → per-signal sorted sample indexes
  → full-resolution statistics / nearest samples / observations
  → bounded traces and small responses
  → React UI
```

The worker owns the full log. React receives metadata, reduced viewport traces and numeric readings, not repeated copies of the original dataset. Engine modules do not import React, access the DOM, fetch data or use persistence.

## 4. Files Added/Modified

| Area | Files |
| --- | --- |
| Data model and parsing | `lib/obd/types.ts`, `csv.ts`, `signals.ts`, `time.ts`, `engine.ts` |
| Exploration and observation contracts | `lib/obd/analysis.ts`, `events.ts` |
| Background processing | `lib/obd/protocol.ts`, `worker.ts`, `worker-client.ts`, `vite-worker.d.ts` |
| Demonstration | `lib/obd/demo.ts` |
| UI and routes | `components/obd/analyzer.tsx`, `app/tools/page.tsx`, `app/tools/obd2-log-analyzer/page.tsx`, `style.css` |
| Analytics isolation | `components/site-analytics.tsx`, `app/layout.tsx` |
| Discovery | Homepage navigation, technology category navigation/link, trouble-code article link, `public/sitemap.xml` |
| Verification | `tests/obd/engine.test.ts`, four CSV fixtures, `tests/browser/analyzer.spec.ts`, `playwright.config.ts`, `scripts/benchmark-obd.ts` |
| Developer handoff | `package.json`, minimal lockfile changes, `.gitignore`, `README.md`, this report |

Only development dependencies were added: Playwright and an explicit tsx dependency. Existing unrelated dependency versions were preserved in the lockfile.

## 5. Supported Input Formats

One header record followed by delimited records: comma CSV, semicolon CSV or TSV. Supports UTF-8 BOM, LF/CRLF, quoted delimiters, escaped quotes, multiline quoted cells, empty fields and common missing tokens. Header labels may include units in parentheses or square brackets.

Torque-style `Device Time` and FORScan-style `time(ms)`/RPM conventions receive explicit heuristic labels. OBD Fusion-compatible exports use the generic table path. These are format-shape recognizers, not certifications against complete exporter catalogs. Fixtures are deterministic representative exports, not an independently collected fleet of real device logs.

Proprietary `.fsl`, binary formats, metadata preambles, separate units rows, locale-dependent dates, epoch numbers without explicit units and arbitrary exporter-specific layouts are not supported. Unsupported source columns remain preserved.

## 6. Parser Architecture

`records()` is a generator-based tokenizer with explicit quote state; it does not split records by commas or physical lines. `detectDelimiter()` scores the first records for consistent multi-column structure. The adapter registry identifies supported header conventions and can be extended without coupling parsers to UI components.

Malformed quoting and inconsistent record width reject the record and report its source line. An unterminated quoted field can consume the remaining text as one rejected record; the parser does not guess where that record was intended to end. Completely blank physical lines are ignored; a delimited all-empty record remains a missing-data record.

Hard limits: 25 MiB browser file, 250,000 data records, 128 columns and two million accepted cells. Exceeding a cap fails explicitly, rather than silently truncating analysis. Warning details are capped at 50 while counts remain complete. There is no unrestricted main-thread parsing fallback.

## 7. Canonical Signal Model

Each signal contains a unique column ID, original label/unit, optional canonical identity, display unit, ambiguity explanation, original source strings, normalized numeric-or-null values, timestamped numeric samples with original row references, missing/invalid counts and median sampling cadence.

The log retains original timestamp strings and nullable normalized timestamps in source row order. Duplicate labels remain distinct column IDs. Unknown textual values remain source strings and are excluded from numeric statistics. Source arrays remain in worker memory for the current log; a full raw-table/export interface is outside this V1.

## 8. PID Recognition

Conservative aliases cover RPM, vehicle speed, throttle, accelerator position, coolant/IAT, bank-qualified STFT/LTFT, MAF, absolute MAP, gauge boost, fuel pressure with unspecified reference, bank/sensor-qualified oxygen voltage, explicit lambda/AFR, ignition timing, calculated load, battery/control-module voltage, fuel level and commanded equivalence ratio.

Recognition preserves bank and sensor distinctions. Generic manufacturer PID numbers are not decoded without a namespace. Ambiguous manifold pressure and combined boost/vacuum names remain custom. A recognized identity does not imply a known unit; those are independent decisions.

## 9. Unit Normalization

| Input | Canonical result |
| --- | --- |
| mph | km/h: multiply by 1.609344 |
| °F | °C: `(value − 32) × 5 / 9` |
| psi | kPa: multiply by 6.894757293 |
| bar | kPa: multiply by 100 |
| Compatible km/h, °C, kPa, g/s, %, V, RPM, degrees, ratio | Retain numeric magnitude |
| Missing, incompatible or unsupported unit | Preserve values/unit and flag ambiguity; no conversion |

Conversions require both recognized identity and compatible source unit. Absolute MAP and gauge boost have distinct identities; no atmospheric-pressure subtraction is applied. Fuel pressure with an unspecified reference is not auto-matched in comparisons. Oxygen voltage is never transformed into AFR or lambda.

Semicolon/tab records accept decimal commas, but a grouping such as `1,234` is rejected as ambiguous; `0,123` is accepted. Comma-delimited embedded comma numbers are not guessed. Thousands grouping is unsupported. Numeric parsing rejects suffixes, infinities and magnitudes above JavaScript's maximum safe integer; original strings are retained. Canonical display is metric; an imperial display toggle is not implemented.

## 10. Time Model

Supports explicitly labelled seconds/milliseconds, `HH:MM:SS[.fraction]`, and validated ISO date/time strings. ISO offsets are respected. ISO timestamps without an offset are consistently interpreted in UTC; the quality report states that policy. Localized calendar formats and unitless numeric time values are not inferred.

Elapsed zero is the earliest valid timestamp, not necessarily the first input row. Sorting is stable by timestamp then original row; source order remains retained. Duplicate, backwards and missing timestamps are counted. Clock resets and midnight rollover are not repaired or split into invented sessions. Missing-time records cannot enter time-based analysis.

Charts position samples by actual elapsed seconds. Positive intervals between distinct sorted times produce min/median/max cadence statistics and an irregularity flag when max exceeds 1.2× min. Median Hz is a descriptive reciprocal, not a promise of uniform acquisition.

## 11. Log Quality System

The visible report contains parsed/rejected records, duration, recognized/custom signal counts, missing/non-numeric values, missing/duplicate/backwards timestamps, interval statistics, irregular sampling, recording gaps, normalization ambiguities and parser notices. A source-mapping table exposes original labels, canonical identity and source/display units.

No timestamps or values are filled forward into the underlying log. Retained nonnumeric custom values are counted transparently. Global row cadence and individual-signal cadence are separate.

## 12. Visualization

Up to six selectable signals, each on its own labelled Y scale, share a real-time X window and cursor. Features include zoom about the cursor, pan earlier/later, reset, keyboard arrows, tap/drag inspection, current nearest readings in chart headings, source-backed snapshot cards, and full-resolution viewport min/max/sample mean.

Time buckets retain first/last/min/max samples. Missing source rows and material per-signal gaps break the path. Isolated points remain visible. Straight connecting lines are a visual guide; no interpolated reading is supplied to the state panel. Statistics explicitly state that the mean is sample-weighted, not time-weighted. Empty windows are labelled, rather than presenting invented data.

SVG rendering uses a bounded number of paths and reduced vertices, not a DOM node for every input sample. The UI has no new chart library runtime dependency.

## 13. What Happened Here

The shared cursor queries every signal's time index using binary search. The closest numeric sample can lie before or after the cursor. Equidistant samples choose the earlier timestamp. Duplicate timestamps choose the first original source row.

Each selected reading shows normalized value/unit, original value/unit, sample time and signed `Δ = sample time − cursor time`. A positive Δ explicitly identifies a future sample. A value is marked **STALE** beyond `max(2 seconds, 3 × that signal's median positive interval)`. This is a transparent exploration policy, not a diagnostic validity guarantee. Unavailable readings are shown as unavailable; no interpolation occurs.

## 14. Playback

Play, pause, scrub and 0.25×/1×/2×/5×/10× speed are implemented. A monotonic browser clock advances actual elapsed time, with approximately 10 UI updates per second. Recording gaps consume their real elapsed duration and are never skipped automatically. Playback stops at the end; Play restarts it. Manual inspection pauses playback.

Playback does not automatically pan a zoomed viewport. The user can reset or pan explicitly. Timers are cleaned up on pause, end, import replacement and unmount.

## 15. Gauges

Compact numeric readouts serve as the state dashboard for the selected signals. They show actual values, units, source times and staleness. No decorative gauge assumes an RPM redline, temperature danger zone or vehicle specification that the file did not provide.

## 16. Event Markers

V1 implements recording gaps only. The rule is an adjacent distinct-time interval strictly greater than `max(5 seconds, 5 × median positive interval)`. Clicking an observation moves the shared cursor and frames the gap.

`events.ts` defines a detector interface, described rule, context and registry; `Observation` provides a typed marker contract. Future signal-based detectors can extend this contract with documented inputs/rules. V1 does not label throttle, temperature or trim behavior as a fault. The displayed event list is capped at 500; the total count remains complete.

## 17. A/B Foundation

`ComparisonAlignment` requires two explicit elapsed-time anchors and physical-context text. `comparisonPairs()` matches unique known signal identities with compatible normalized units. Unknown, unit-ambiguous, reference-unspecified and duplicate semantic channels do not auto-match. The output supplies a time offset, never a row-number alignment.

This is a tested engine contract, not a two-log comparison interface. The caller remains responsible for choosing genuinely comparable driving conditions. No before/after conclusion is generated.

## 18. Large-Log Performance

The browser passes a Blob to a dedicated worker. The full source and indexes remain there; only small descriptions, snapshots and bounded viewport traces cross back to React. Sorting and data reduction run off the UI thread. Snapshot lookup is logarithmic per signal; full viewport statistics scan the applicable numeric samples.

Worker replacement, cancel, import failure and component unmount release the worker and reject pending requests. Browser validation instrumented actual worker creation/termination, including a cancelled large import: five created and five terminated. File/row/cell/column limits bound workload; they do not guarantee identical performance or memory availability on every phone.

## 19. Mobile UX

Portrait uses a two-column, scrollable signal chooser and stacked charts; snapshot readouts use a compact two-column grid. Current values also appear directly in chart headings so a tap can be inspected without scrolling to the full snapshot. Landscape uses more chart width and retains compact controls.

Buttons and chart inspection support touch. Charts derive their coordinate width from ResizeObserver; labels do not shrink with a fixed desktop SVG canvas. Tested 320×740, 390×844 and 844×390, with no horizontal document overflow. A separate touch-capable Chromium test verifies actual tap-driven state updates.

## 20. Privacy

There is no file upload API, analytics event carrying a log, remote diagnosis, localStorage or indexedDB persistence. The analyzer does not initialize site analytics. Other editorial routes retain their analytics behavior; previously loaded site analytics in an existing browsing session are not claimed to be uninstalled.

A fresh production-browser session monitored all requests during import, charting, playback and inspection and observed zero off-origin requests. This verifies that tested flow; it is not a claim about browser extensions or unrelated software on the user's device.

## 21. Actual Test Results

| Command | Final result |
| --- | --- |
| `npm run test:obd` | 20 passed, 0 failed |
| `npm run typecheck` | Passed, no TypeScript errors |
| `npm run lint` | Passed: 0 errors, 24 existing editorial warnings |
| `npm run build` | Passed, all 14 baseline/new routes listed |
| `npm run test:browser` | 7 passed, 0 failed; 8.8 seconds in final recorded run |
| `npm ci --dry-run --ignore-scripts --no-audit --no-fund` | Passed lockfile consistency check |
| `git diff --check` | Passed |

Engine tests cover quoted/multiline CSV, BOM/CRLF, delimiters, header adapters, identity families, unknown/duplicate columns, compatible and ambiguous units, malformed rows, numeric/time edge cases, irregular/duplicate/backwards/missing times, nearest selection/ties/staleness, extrema reduction, full-resolution statistics, gap observations, A/B contracts, resource limits and worker cleanup. A 200,000-row benchmark adds realistic scale validation.

## 22. Browser/Responsive Results

Tests ran against the built production application at `http://127.0.0.1:5184`, using the real compiled worker, not a mock. They asserted converted numeric readings, stale values, cursor synchronization, playback progression through a gap, zoom/keyboard inspection, source quality, replacement/error recovery/cancellation, touch, responsive overflow and privacy.

Existing homepage, engines index, technology index, trouble-code guide, scanner guide, privacy and Tools routes returned HTTP 200 and displayed their H1. Homepage discovery and sitemap inclusion were verified. This is targeted regression coverage, not an exhaustive pixel comparison of every editorial page.

Desktop and mobile/landscape screenshots were inspected visually. Artifacts are in ignored `outputs/`: `obd-desktop-empty.png`, `obd-desktop-loaded.png`, `obd-390x844.png`, `obd-320x740.png`, `obd-844x390.png` and viewport chart captures. Desktop testing used 1440×1000. Testing did not include physical iOS/Android devices, Safari or Firefox.

## 23. Benchmarks

Synthetic fixture: 200,000 rows, nine columns / 1,800,000 cells, 7,993,163 bytes. Includes multiple signal cadences, textual custom values and a recording gap. Windows, Node v24.12.0; local machine measurements, not universal performance guarantees.

| Measurement | Recorded result |
| --- | --- |
| Engine import / normalization / indexing | 674.9 ms |
| Six full-duration chart queries | 137.4 ms |
| 1,000 snapshots across all signals | 5.6 ms |
| Approximate heap delta across benchmark | 156.6 MiB |
| Largest reduced trace, including gap separators | 1,889 points |
| Final browser large-file import and chart readiness | 1,633 ms |
| Browser 20 ms UI timer ticks during that import | 56 |

Heap delta is an approximate retained/allocation snapshot without forced GC, not peak RSS. Browser timing includes file assignment and waiting for rendered results. Large-log performance on low-memory phones remains unmeasured.

## 24. Problems Found and Fixed

1. Production Vinext rewrote `import.meta.url` inside a client component to `file:///ROOT/...`, breaking the initial standard worker URL. Switched to Vite's `?worker` constructor import and verified the emitted production worker in Chromium. Vite documents both worker mechanisms in its [feature guide](https://vite.dev/guide/features).
2. Fixed-width desktop SVG coordinates made small-screen labels too small. Replaced them with measured width and fewer mobile X labels; inspected new screenshots.
3. Sparse signals could leave invisible isolated points after gaps. Single-point segments now render with a visible round stroke.
4. All-empty delimited records were initially treated like blank lines. They now contribute missing-data counts.
5. Ambiguous decimal groups such as `1,234` and extreme numeric magnitudes could misrepresent data. They remain source text and are excluded from numeric interpretation.
6. A render-local mutation triggered the React lint rule. Replaced it with point-neighbor-based path generation.
7. Failed imports now dispose their worker immediately; cancellation/replacement is instrumented in browser tests.
8. Removed unrelated npm lockfile metadata churn while retaining required new testing dependencies; validated lockfile consistency.
9. An initial screenshot capture returned a Chromium protocol error. Subsequent complete production test runs captured the requested desktop/mobile artifacts successfully.

## 25. Known Limitations

- Representative CSV conventions only; no universal Torque/FORScan/OBD Fusion compatibility claim or real-fleet validation.
- No header-mapping wizard, timezone selection, imperial display toggle, proprietary formats, metadata preambles or automatic session repair.
- Unknown textual source values are retained in the engine but have no full raw-table/export interface.
- No diagnostic inference, vehicle-specific thresholds, DTC acquisition, live adapter connection or repair recommendation.
- Recording gaps are the only implemented observation type.
- A/B is a data-contract foundation without a comparison UI.
- Worker input is read as a bounded whole text file; the tokenizer streams records, not bytes from disk. Maximum limits can still be expensive on low-memory devices.
- No automatic viewport-follow during playback; no drag-to-select zoom or pinch zoom. Zoom/pan buttons, scrub and chart inspection are implemented.
- Browser coverage is Chromium only, including emulated mobile/touch.
- Production build passes under Vinext; no live Cloudflare deployment was attempted. Vinext reports route classification as unknown, an existing framework limitation.

## 26. Comparison Against OBDViz-Level Capabilities

The useful comparison is against a basic CSV plotting workflow, not an unverified claim to outperform a particular commercial product. V1 goes beyond plotting through explicit canonical identity/unit handling, preserved source values, timestamp-quality evidence, synchronized nearest-time snapshots with distance/staleness, real-gap playback, bounded worker processing and tested semantic comparison contracts.

TorqueGirl does not replace a complete scan-tool suite. OBD Software's own [OBD Fusion desktop description](https://www.obdsoftware.net/software/obdfusiondesktop) documents live vehicle/scanner functionality and recording/playback; TorqueGirl V1 only analyzes compatible exported logs. No direct OBDViz/OBDwiz usability or performance benchmark was performed, and no overall superiority claim is made.

## 27. Recommended SINGLE Next Phase

**Real-export compatibility and mapping validation.** Build a consented, anonymized fixture corpus across Torque, OBD Fusion and FORScan versions; add an explicit column/time/unit mapping preview with provenance and regression tests. This improves trustworthy ingestion before introducing diagnosis or expanding comparison UX.

## 28. Git Status

Development branch: `codex/obd2-analyzer-v1` in `C:\TorqueGirl-obd-v1`, based on `a8290af`. This report is included in the local implementation commit; use `git log -1` in that worktree for its exact hash.

No push, deployment or PR was performed. `C:\TorqueGirl` remains on `main` with the pre-existing editorial modifications and untracked content. The feature is intentionally not merged into that dirty checkout. The final response provides the created commit hash and post-commit status.

## 29. Handoff Notes

From `C:\TorqueGirl-obd-v1`, use the README commands to reproduce tests and the production preview. The local preview route is `/tools/obd2-log-analyzer`; the public domain has not changed. Screenshots and generated build files are ignored and not committed.

Before integrating with the main checkout, finish/preserve its editorial work. Shared touchpoints that may need contextual merging are homepage navigation, the technology index, the trouble-code article and sitemap. The unpublished live-data article was not committed as part of this feature; link it to the analyzer when that editorial work is integrated.

Adding a parser convention belongs in `lib/obd`, with a deterministic fixture and unit/time tests. New observations must state their rule and remain separate from diagnosis. Future comparison callers must supply meaningful physical/time anchors and preserve pressure/bank/sensor semantics. No deployment is required to review or run this implementation locally.
