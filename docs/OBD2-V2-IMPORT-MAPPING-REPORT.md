# TORQUEGIRL OBD2 DATA ENGINE V2
# IMPORT INTELLIGENCE & MAPPING REPORT

Validated locally on 25 September 2026. Continued from V1 commit `bf5002e` on the existing OBD worktree and branch. No main merge, push, deployment or PR.

## 1. Executive Summary

V2 adds a required import preview, explicit signal/time/unit correction, categorical provenance, local mapping templates and source-based reprocessing before entering the V1 analyzer. Users can inspect exactly what is being interpreted and reopen mapping after analysis. Invalid physical configurations cannot be accepted; useful custom and sparse signals remain available with warnings.

Final verification: **39 engine tests and 14 production-browser tests passed**, including every original V1 engine test and all seven V1 browser scenarios. TypeScript, lint and production build passed. Remapping a 200,000-row synthetic log took 798.6 ms in the recorded Node benchmark and 882 ms in the final browser run. No diagnostic inference was added.

## 2. V1 Baseline Preserved

Read the V1 implementation report and inspected actual engine, worker, UI, tests and deployment scripts before edits. Work stayed in `C:\TorqueGirl-obd-v1`, branch `codex/obd2-analyzer-v1`. The unrelated dirty `C:\TorqueGirl` checkout remained on `main` and was only inspected with read-only Git commands.

Preserved the tokenizer, conservative numeric parsing, unit conversions, actual-time indexing, full-resolution statistics, extrema reduction, quality reporting, charts, synchronized snapshot, playback, staleness, gap detector and A/B contracts. The V1 `parseLog(text)` entry point remains supported and its 20 original tests are unchanged. V1 browser tests only gained the required Analyze log action after import/demo; existing numerical and interaction assertions were retained.

## 3. Architecture Changes

```text
File Blob → worker-owned original text
  → exporter/header inspection → versioned mapping configuration
  → existing engine with explicit mapping → draft canonical log
  → preview / categorical evidence / validation
  → user accepts current revision → accepted log
  → existing V1 analysis, traces, playback and snapshots
```

`ImportSession` owns the original text, a draft preview/log and the accepted log/configuration. It reparses original text for every correction. A failed remap invalidates the old draft revision, while the accepted analysis remains intact. Committing a stale or invalid preview fails. No normalized value is used as a source for another conversion.

The original worker client/lifecycle abstraction and Vite `?worker` integration remain intact. The protocol adds preview, remap, commit and review operations. Full raw logs do not cross repeatedly into React; only mapping metadata, up to three short examples per column, quality and the existing small analysis responses do.

## 4. Files Added/Modified

| Area | Files |
| --- | --- |
| Physical identities/units | Added `lib/obd/catalog.ts` |
| Exporter conventions | Added `lib/obd/adapters.ts` |
| Mapping contracts and validation | Added `lib/obd/mapping-types.ts`, `mapping.ts` |
| Reprocessing session | Added `lib/obd/import-session.ts` |
| Local templates | Added `lib/obd/templates.ts` |
| Engine integration | Modified `lib/obd/engine.ts`, `types.ts`, `time.ts`, `protocol.ts`, `worker.ts` |
| Mapping UI | Added `components/obd/import-preview.tsx`, route-scoped `mapping.css`; modified analyzer and route page |
| Tests/corpus | Added `tests/obd/mapping.test.ts`, `tests/browser/mapping.spec.ts`, eight V2 fixture CSVs and corpus README; adapted V1 browser entry actions |
| Benchmarks/docs | Added `scripts/benchmark-obd-v2.ts`, this report; updated package script and README |

No dependency installation, lockfile change, global CSS redesign, editorial content edit, deployment configuration change or server upload endpoint was needed for V2. Runtime validation uses the existing Zod dependency.

## 5. Import Preview

Every file and synthetic demo enters preview before analysis. Preview includes file name, exporter candidate/evidence, delimiter, accepted/rejected row counts, source columns, selected time interpretation, first/last source times, canonical elapsed values, duration and timestamp-quality counts.

Each responsive column card shows original label/unit, mapping state, physical identity, chosen interpretation unit, last normalized/display unit, categorical evidence, numeric/missing counts, source-to-normalized examples and warnings. Examples are explicitly labelled as the **last preview**. Editing creates a pending state; Analyze log stays disabled until Update preview succeeds. Search and state/review filters make many-column logs manageable.

## 6. Exporter Detection

Four explicit descriptors separate exporter knowledge from generic CSV tokenization:

| Adapter | Recognizer and bounded behavior |
| --- | --- |
| Torque / Torque Pro-style | `Device Time`; selected descriptive aliases, explicit header units; combined boost/vacuum remains custom |
| FORScan-style | `time(ms)` plus RPM; `1/min` unit alias and VSS, SHRTFT/LONGFT, TP/APP, SPARKADV and bank/sensor O2 abbreviations |
| OBD Fusion-style candidate | Explicit `Time (sec/seconds)` with descriptive SAE-style sensor labels; nonexclusive heuristic, clearly labelled candidate |
| Generic CSV/TSV | Conservative shared aliases; no exporter-derived unit defaults |

Each descriptor documents recognizable evidence, time conventions, units and unsupported quirks. These signatures can overlap generic exports; they never certify a specific application/version. No default vehicle type, pressure reference or missing unit is inferred from exporter identity.

The vendor sources establish CSV-export support, not a universal invariant schema: [Torque support](https://torque-bhp.com/community/main-forum/general-faq/paged/21/), [OBD Fusion](https://www.obdsoftware.net/software/obdfusiondesktop), [FORScan export discussion](https://forum.forscan.org/viewtopic.php?t=17696).

## 7. Column Mapping

States are AUTO-MAPPED, USER-MAPPED, CUSTOM / UNKNOWN and IGNORE. Auto mappings must match the actual detected alias/unit; runtime validation rejects an altered configuration falsely labelled AUTO. User mappings require an explicit canonical identity and provenance. Custom/ignored columns cannot claim an identity.

The catalog distinguishes trim banks, O2 bank/sensor voltage channels, accelerator/throttle, coolant/intake temperature, absolute MAP/gauge boost, explicit lambda/AFR, and absolute/gauge/differential/unspecified fuel-pressure reference. Ambiguous pressure labels stay custom until the user explicitly chooses a physical meaning. Duplicate semantic mappings warn but retain separate column IDs; existing A/B logic avoids automatically matching ambiguous duplicates.

Ignored columns are excluded from canonical analysis, not deleted from original source text. Resetting/remapping restores them. No signal is silently dropped because its name is unknown.

## 8. Time Mapping

Users select the source time column and choose elapsed seconds, elapsed milliseconds, HH:MM:SS, ISO timestamp, or conservative automatic ISO/clock recognition. Numeric values without a declared interpretation do not become an assumed epoch/time unit.

The preview identifies observed supported time syntax and shows first/last raw time, first/last elapsed time, duration, missing, duplicate and backwards counts. Explicit ISO and clock modes do not accept each other's formats. Mixed ISO/clock domains under automatic interpretation are a blocking ambiguity; users must choose one interpretation, and incompatible rows remain visibly unusable.

V1 policies remain: earliest valid timestamp is elapsed zero; source order/timestamps remain preserved; indexes sort by actual time; no uniform sampling, clock-reset, localized-date or midnight repair is invented. Offset-free ISO uses UTC. The analyzer now displays sub-tenth-second cursor/sample times to millisecond precision when needed; underlying engine precision is unchanged.

## 9. Unit Mapping

Allowed units include km/h/mph, °C/°F, kPa/psi/bar, RPM, g/s, %, V, degrees and explicit ratios. Unit aliases are normalized; source labels such as `F` or `1/min` remain separately preserved.

Validation checks selected units against target quantity and known source dimension. It rejects pressure-as-speed, voltage-as-temperature and O2 volts-as-AFR, including attempts to bypass dimensional validation by leaving the chosen unit unset. Within-dimension correction is explicit: interpreting a source temperature column as °C instead of its labelled °F rebuilds from the original raw number.

Pressure conversion changes scale only. Relabelling a known pressure reference requires an explicit user decision and produces a semantic-change warning; no atmospheric or differential-reference calculation is invented. Unknown units can remain native with a visible warning. A genuinely wrong source unit label in a different physical dimension must be corrected in the source rather than bypassing protection here.

## 10. Mapping Provenance

Each V2 signal carries state, interpretation unit, manual/template origin and a human-readable reason: exact alias, alias plus compatible unit, exporter alias, explicit user choice, explicit template application, intentional custom state or ignore decision.

The canonical log and `LogInfo` also carry the accepted versioned mapping, including time selection/provenance and ignored-column configuration. This metadata is available to downstream consumers/export code; no new log-export interface is claimed. The analyzer quality table exposes provenance, and user-corrected snapshot readings show both original source units and the chosen interpretation. No confidence percentages exist.

## 11. Mapping Templates

Templates persist only under `torquegirl.obd.mapping-templates.v1` in localStorage. Mapping and template schema version is **1**, independently versioned from product V2. Strict schemas allow only configuration: column positions/states/identities/units, time interpretation, a user-entered template name/ID and a SHA-256 fingerprint of ordered trimmed headers.

Original header text, filename, row values, sample timestamps, vehicle data, normalized arrays and parser examples are not automatically persisted. The template name is entered by the user; it is never taken from the log filename. Saving unknown payload fields or unsupported schema versions is rejected.

Save, explicit apply, rename, delete and reset are implemented. No template is automatically applied. Apply requires a matching ordered header fingerprint, including unit text and duplicate positions. A mismatch leaves the current mapping unchanged. Matching headers indicate configuration compatibility, not proof of identical vehicle semantics; updated source examples remain visible for review. Limits are 20 templates and 300,000 serialized characters. Storage errors are displayed without preventing analysis.

## 12. Reprocessing Architecture

Remapping reconstructs values, timeline, sorted sample indexes, cadence, quality and events from retained source text. Accepted and draft logs are distinct. Keep previous analysis returns to the original accepted values/cursor; reopening mapping rebuilds the accepted configuration, not a discarded draft.

Draft revisions prevent stale acceptance. Malformed mappings are rejected before source indexing/conversion. Failed reprocessing cannot overwrite the last accepted log. Cancelling ongoing processing terminates the whole current import session and releases both accepted and draft data; importing a new file/demo starts a fresh worker. Per-cell update-in-place normalization is never used.

## 13. Analyzer Integration

Analyze log enters the existing synchronized charts, quality report, What Happened Here, playback and gap observations only after the current preview is valid. Review mapping reopens the accepted mapping. Changed interpretation cannot leak into visible analysis before acceptance.

Bank/sensor identities, original source values, source units and staleness remain intact. Browser assertions verify a raw speed of 60 explicitly interpreted as mph produces 96.56 km/h; later values and nearest-time snapshots change correctly after unit/time remapping. Applying a saved template restores that interpretation. Numeric source text remains unchanged.

## 14. Fixture Corpus

Added eight **synthetic/representative**, explicitly labelled fixtures—two per exporter family—in `tests/obd/fixtures/v2`. The corpus README records origin and coverage. None is claimed as a genuine device export.

Coverage includes descriptive/abbreviated headers, banked trims, O2 channels, ISO/clock/seconds/milliseconds, imperial/metric speed and temperature, psi/bar/kPa, custom PIDs, missing units, ambiguous pressure, duplicate labels, sparse samples, malformed records, semicolon decimal commas and TSV. Original four V1 fixtures remain unchanged.

## 15. Performance

Recorded synthetic workload: **200,000 rows / 1.8 million cells / 7,993,163 bytes**, nine columns. Remapping changes both time interpretation and speed units and asserts resulting source-backed values. Windows, Node v24.12.0.

| Measurement | Recorded result |
| --- | --- |
| Initial worker-equivalent engine preview | 725.7 ms |
| Reprocess time/unit mappings | 798.6 ms |
| Six full-duration traces after remap | 49.4 ms |
| 1,000 snapshots across all signals | 5.3 ms |
| Approximate heap delta across the benchmark | 306.8 MiB |
| Largest reduced trace including gap separators | 1,889 points |
| Final production-browser import through analysis | 1,766 ms; 62 UI timer ticks |
| Final production-browser remap preview | 882 ms; 44 UI timer ticks |

The UI timer interval was 20 ms; continued ticks demonstrate background processing in this test. These are local measurements, not device-independent guarantees. Heap delta is not peak RSS or a forced-GC measurement. V2 deliberately retains source text and up to accepted/draft canonical datasets for safe review; this consumes more memory than V1. Limits remain 25 MiB, 250,000 records, 128 columns and two million cells. Low-memory physical phones were not benchmarked.

## 16. Mobile UX

Mapping uses cards rather than a wide spreadsheet. Each card shows a readable source label, categorical state, physical signal/unit correction and visible source examples/warnings. Native selects and inputs have touch-sized controls. Search and state filters work with a bounded scrolling card area.

Tested preview, manual correction and downstream values at **320×740**, **390×844** and **844×390**, with no horizontal document overflow. V1 touch-capable chart inspection remains covered. Desktop preview and mobile card screenshots were visually inspected. Desktop uses two columns of cards; mobile uses one. The acceptance bar is in normal document flow on narrow phones to avoid covering controls.

## 17. Privacy

No upload endpoint or network request containing log, mapping or vehicle data was added. Full source data lives in the dedicated worker and is released when the import is replaced/cancelled or the analyzer unmounts. Preview examples are memory-only. Explicitly saved mapping configuration is the only new persisted data.

Production-browser monitoring found **zero off-origin requests** during import, mapping, template save/apply/delete, remapping and snapshot exploration in the tested fresh session. Tests inspect localStorage and verify its allowed top-level schema and absence of sentinel raw values, original header strings and filenames. Browser storage denial does not prevent local analysis. Existing analytics suppression on the analyzer remains intact; no claim is made about third-party browser extensions.

## 18. Actual Test Results

| Check | Final result |
| --- | --- |
| `npm run test:obd` | **39 passed**, 0 failed: original 20 + 19 V2 tests |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, 0 errors; 24 pre-existing editorial warnings |
| Focused ESLint on OBD/tests/benchmark | Passed without warnings/errors |
| `npm run build` | Passed; all 14 routes listed |
| `npm run test:browser` | **14 passed**, 0 failed; final run 27.6 seconds |
| `npm run benchmark:obd-v2` | Passed with source/time/value assertions |
| `git diff --check` | Passed |

V2 engine tests cover recognizers, provenance, manual mapping, custom/ignore preservation, time/unit remapping, dimension rejection, pressure/bank/sensor separation, duplicate semantics, empty/sparse data, strict time formats, mixed-time ambiguity, template lifecycle/compatibility/version/privacy, malformed configurations, stale commits, rollback and source-based reconstruction. Large-log and real-worker cancellation/recovery are exercised in the benchmark and browser suite.

## 19. Browser/Responsive Results

Tests ran against the production build and actual compiled worker on `http://127.0.0.1:5184`, not mocked analysis data. They assert changed numeric readings, source values, time duration, accepted-versus-draft isolation, template-restored values, provenance and worker lifecycle, rather than relying on element existence.

The large-log remap cancellation test observes one worker created and one terminated, verifies preview/charts disappear, then successfully imports a fresh demo. Existing homepage/category/article/privacy routes and sitemap/navigation checks remain passing. Browser coverage is Chromium including emulated viewport/touch; Safari, Firefox and physical mobile hardware were not tested.

Artifacts in ignored `outputs/` include `obd-v2-desktop-preview.png`, `obd-v2-mapping-320.png`, `obd-v2-mapping-390.png`, `obd-v2-mapping-844.png`, corresponding viewport card screenshots and refreshed V1 analyzer screenshots. They contain synthetic test data only.

## 20. Problems Found and Fixed

1. Added worker-enforced dimension checks, including the null-unit bypass, so UI filtering is not the only guard against incompatible mappings.
2. Draft remap failure now invalidates its revision; stale preview acceptance cannot overwrite accepted analysis.
3. Mixed ISO/clock data initially produced a mathematically sortable but physically misleading timeline. V2 blocks it until one explicit interpretation is selected.
4. User-corrected units could make a snapshot's original unit look inconsistent with its normalized value. Snapshot cards now also show the explicitly interpreted unit.
5. Sub-tenth-second remaps were obscured by V1's one-decimal clock labels. Added millisecond display where needed and corrected minute-boundary rounding/edge-label alignment.
6. Template serialization/read size limits are aligned; schemas reject extra raw-data fields, unsupported versions and incompatible headers.
7. A floating-point test used exact equality for a decimal conversion; it now uses a tight numerical tolerance. A browser test's expected synthetic speed was corrected from 80.0 to the actual source value 79.9.
8. Playwright's disabled matcher did not reflect a disabled native option; the test now checks the native disabled property, alongside independent engine rejection tests.
9. Fixed TypeScript provenance union typing and a new test's lint declaration. No production fault was hidden by weakening numerical expectations.

## 21. Known Limitations

- No genuine device-export corpus was supplied or obtained. Detection is representative and conservative, not universal compatibility certification.
- Header-first UTF-8 CSV/TSV only; metadata preambles, separate units rows, proprietary FSL/binary formats and arbitrary locale dates remain unsupported.
- No manual delimiter/encoding wizard, arbitrary epoch/date parser or timezone selector. Automatic time accepts supported ISO/clock syntax only.
- Header-compatible templates cannot prove that identically labelled channels retain the same physical meaning; application is explicit and preview remains mandatory.
- Strong dimensional guards intentionally reject cross-dimension source-unit corrections. The source header must be fixed outside the tool in that case.
- Remapping reparses retained text and can hold two canonical datasets; memory use is higher than V1. Browser tests do not establish performance on low-memory phones.
- Templates are local to the browser/origin; no synchronization, template import/export or log export UI was added. The default profile name is generic; users choose their own label.
- A/B remains a contract foundation; no automated diagnosis, live scan-tool connection, fault inference or repair recommendation exists.
- Production build and local Vinext runtime were tested; Cloudflare deployment was not performed. The existing Vinext unknown-route-classification notice remains.

## 22. Remaining Gap vs OBDViz-Level Experience

[OBDViz's own site](https://obdviz.com/) advertises browser-local CSV analysis, grouped multi-axis timelines, instrument mapping and gauge playback. TorqueGirl now adds a reviewable ingestion step with unit/time correction, categorical mapping evidence, versioned local profiles and source-backed reconstruction before its existing chart/snapshot/playback workflow.

Remaining gaps include validated real-export breadth, richer dashboard customization and combined/grouped-axis presentation. No direct comparative usability, compatibility or speed trial against OBDViz was performed; no overall superiority or feature-absence claim about that product is made.

## 23. Recommended SINGLE Next Phase

**Validate the mapping engine against a consented, anonymized real-device export corpus.** Collect exports with known application/version/unit settings from Torque, OBD Fusion and FORScan, record provenance and expected values, then turn confirmed differences into adapter fixtures and regression cases. This addresses the remaining trust gap before adding diagnostic inference or broader analytics.

## 24. Git Status

V2 continues on branch `codex/obd2-analyzer-v1` in `C:\TorqueGirl-obd-v1`, directly after V1 commit `bf5002e`. This report is included in the local V2 commit; use `git log -1` there for its exact hash. The final response records the actual commit and post-commit worktree state.

No merge into main, push, deployment, PR, stash, reset or edit to unrelated editorial work was performed. The original `C:\TorqueGirl` status remains the same set of modified/untracked editorial files seen at the start of this task.

## 25. Handoff Notes

The existing route remains `/tools/obd2-log-analyzer`. Open a CSV, review/correct mapping, Update preview after edits, then Analyze log. Review mapping reopens the accepted interpretation. Save/apply/delete templates are explicit, local actions. Cancel import during remapping clears the whole in-memory session; Keep previous analysis discards the draft while retaining accepted results.

Reproduce locally with the README commands: engine tests, typecheck, lint, build, `benchmark:obd-v2`, production Vinext server on port 5184, then Playwright tests. New exporter-specific aliases belong in `adapters.ts`; physical identities and dimensional rules belong in `catalog.ts`; all new behavior requires representative or genuinely sourced fixtures with origin stated accurately.

Keep the main editorial work separate until its owner explicitly requests integration. The public site has not changed. No further approval or deployment is necessary to review this local V2 implementation.
