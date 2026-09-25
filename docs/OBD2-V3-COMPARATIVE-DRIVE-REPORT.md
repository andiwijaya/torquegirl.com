# TORQUEGIRL OBD2 DATA ENGINE V3
# COMPARATIVE DRIVE ANALYSIS REPORT

Validated locally on 26 September 2026. Continues V2 commit `e2f71f6` in `C:\TorqueGirl-obd-v1`, branch `codex/obd2-analyzer-v1`. No push, PR, merge or deployment.

## 1. Executive Summary

V3 adds deterministic driving phases, segment statistics, two independently mapped logs, physical-context comparison, evidence-backed What Changed cards, side-by-side traces and a timestamp-paired PID relationship explorer. All expensive data operations stay in the existing dedicated browser worker. The single-log analyzer, mapping preview/templates and source-preserving reconstruction remain intact.

Validation passed: **61 engine tests (39 existing + 22 V3), 20 production-browser tests (14 existing + 6 V3), typecheck, lint and production build**. A final landscape CSS adjustment was rebuilt and all three affected responsive tests passed again. Lint has zero errors and 24 existing editorial warnings.

These are operating observations, not automated fault diagnoses. Rules are visible, conservative and not universally validated against vehicles. Every new fixture is synthetic; no real-device compatibility or classification accuracy claim is made.

## 2. V1/V2 Baseline Preserved

Read both implementation reports and inspected the engine, contracts, import-session lifecycle, UI and tests before implementation. V1/V2 parser, unit normalization, time parsing, mapping catalog/validation, template schemas, source arrays, nearest readings, trace reduction and original test files are unchanged.

The route remains `/tools/obd2-log-analyzer`. V1 charts, playback, What Happened Here, staleness, source values, quality and gap markers remain. V2 still requires preview/acceptance; each run retains a separate ImportSession, accepted mapping and source text. Existing tests pass without assertion changes. No dependencies or lockfile changes were necessary.

## 3. Architecture Changes

```text
One existing browser worker
  ├─ Run A ImportSession → accepted canonical log → phase index
  └─ Run B ImportSession → accepted canonical log → phase index
       ↓ worker queries
       selected-region statistics / context matching / observations
       semantic traces / timestamp pairing / Pearson / bounded scatter
       ↓ small, source-free responses
       React phase controls / cards / plots
```

`DriveSession` composes two existing ImportSessions. The protocol retains A as the default run, preserving V1/V2 callers. New requests cover phase pages, region statistics, comparison, comparison traces, relationships and B removal. Commit rebuilds the affected phase index from accepted source-derived data. Draft mapping never changes accepted analysis.

No log is copied to a second worker or React. Phase metadata is paginated at 200 segments, full indexes remain in the worker, scatter contains at most 1,000 points, and comparison traces use 100 extrema buckets each. Cancellation terminates the sole worker and releases both runs and pending requests.

## 4. Files Added/Modified

| Area | Files |
| --- | --- |
| Core analysis | Added `lib/obd/drive.ts` |
| Two-run ownership | Added `lib/obd/drive-session.ts`; modified `worker.ts`, `protocol.ts` |
| Detector contract | Extended `lib/obd/events.ts` with a signal-aware detector interface |
| Synthetic ground truth | Added `lib/obd/drive-demo.ts`, two CSVs and README under `tests/obd/fixtures/v3/` |
| UI | Added `components/obd/drive-analysis.tsx`, route-scoped `drive.css`; integrated in `analyzer.tsx`, route page |
| Tests | Added `tests/obd/drive.test.ts`, `tests/browser/drive.spec.ts` |
| Benchmark/docs | Added `scripts/benchmark-obd-v3.ts`, this report; updated `package.json` script and README |

No editorial content, main checkout, global navigation, sitemap, analytics configuration or deployment configuration was modified.

## 5. Driving Phase Segmentation

Output segments contain ID, start/end elapsed seconds, duration, phase, rule evidence and limitations. Supported labels are stopped, idle, acceleration, cruise, deceleration and unclassified. Whole-log duration totals and a compact region selector expose the result. Each region can be inspected with its full-resolution statistics; Run A's region start can move the existing shared cursor.

Speed must have one unambiguous canonical identity and a known normalized unit. Missing speed or duplicate semantic speed columns produce unclassified regions. RPM is optional and must independently be unique and unambiguous to support idle. A zero-duration log produces no invented segment.

## 6. Phase Rules and Limitations

Rules operate on consecutive distinct speed timestamps; duplicates use the first original source row. The speed derivative is `(v2 − v1) / 3.6 / (t2 − t1)` in m/s². No constant cadence, smoothing, interpolation or source mutation is used.

| Rule | Threshold |
| --- | --- |
| Usable speed interval | 0.1–2 seconds; 1e-9 s numerical boundary tolerance |
| Stopped entry | Both endpoint speeds nonnegative and ≤1 km/h |
| Stopped retention | Both endpoint speeds ≤2 km/h after stopped/idle |
| Idle | Stopped-speed rule plus 400–1200 RPM at both endpoints; nearest RPM within 0.5 s |
| Moving classification | Both endpoint speeds ≥5 km/h |
| Acceleration | a ≥0.5 m/s²; retain while a ≥0.25 |
| Deceleration | a ≤−0.5 m/s²; retain while a ≤−0.25 |
| Cruise | |a| ≤0.15 m/s²; retain while |a| ≤0.25 |
| Minimum candidate duration | 3 seconds; shorter candidates become unclassified |

Unsupported intervals and transitions stay unclassified. Gaps are never assigned a supported driving phase. V3's 2 s evidence limit is intentionally stricter than V1's adaptive recording-gap marker. Speeds below 5 km/h outside stopped hysteresis remain unclassified. Sampling faster than 10 Hz is not resampled; unsupported short intervals remain unclassified.

No vehicle-specific idle speed, road gradient, gear, clutch, hybrid state or driver intent is inferred. Cruise means locally steady speed under these thresholds, not proof of cruise-control use. Consecutive candidates are merged; hysteresis reduces threshold flicker and the minimum duration suppresses brief spikes. Persistent bad sensor data can still satisfy a rule.

## 7. Phase Statistics

For the selected segment, every available signal receives full-resolution sample count, min, max, sample mean, median, median positive cadence and temporal coverage. Empty signals have null numeric statistics and zero samples; missing values are not filled.

Regions use closed endpoints for statistics, so a boundary sample may contribute to both adjacent segments if inspected separately. Segment duration totals do not double-count elapsed time. Mean and median are **sample-weighted**, not time-weighted.

Coverage equals the sum of consecutive distinct numeric sample intervals ≤2 s divided by region duration, bounded to [0,1]. It measures temporal support rather than the percentage of source rows or proof of continuous measurement. Large holes contribute no covered time. Median cadence excludes zero intervals. No time-weighted mean is claimed.

## 8. A/B Log Workflow

Load A → V2 preview/correction → accept → open A/B comparison → load B → independent preview/correction → accept → select one phase region per run → Compare selected regions.

Context labels include Run 1/Run 2, Before repair/After repair, Cold/Warm and Baseline/Modified. They organize the comparison; they never change matching rules or assert repair outcomes. Each run has its own normalized elapsed origin, source, quality, mapping/provenance and phase index. B's mapping can be reviewed, changed, discarded or accepted independently. B can be removed without losing A.

Replacing A starts a new worker and clears both logs. Replacing B resets B's results and retains A. Cancelling in-flight V3 work explicitly clears both runs by terminating their shared owner. Accepted A remapping invalidates comparative results and refreshes its phase index; B remains independent. Changing regions clears prior comparison/relationship results.

## 9. Comparable-Condition Matching

Matching uses the selected regions' physical summaries, never row position or original absolute timestamps. Both regions must have the same supported phase, ≥3 s duration and usable speed plus at least one other context dimension. A context dimension needs compatible semantics/units, ≥5 samples per run and ≥60% temporal coverage per run.

| Dimension | Maximum absolute median difference | Maximum difference between corresponding min/max endpoints |
| --- | --- | --- |
| Speed | 5 km/h | 10 km/h |
| RPM | 250 RPM | 500 RPM |
| Throttle | 10 percentage points | 20 percentage points |
| Calculated load | 10 percentage points | 20 percentage points |
| Coolant | 10 °C | 20 °C |

**GOOD MATCH:** all five dimensions are usable and within limits. **PARTIAL MATCH:** usable speed plus at least one other dimension pass, but some dimensions lack support. **CONDITIONS DIFFER:** phases differ, or an available adequately supported dimension exceeds its median/range tolerance. **INSUFFICIENT DATA:** unsupported phase or inadequate required evidence.

Every dimension reports A/B median, delta, tolerance and range difference, or why coverage is insufficient. Partial results remain explicitly qualified. There is no numeric confidence score. Matching medians and range envelopes does not establish identical trajectories or control unmeasured road, vehicle, gear and ambient conditions; outliers can conservatively reject a match.

## 10. Signal Compatibility

Reuses V1 `comparisonPairs()` with explicit elapsed-region anchors and context. Only unique, unambiguous canonical identities with equal normalized units pair across logs. Unknown/custom identities, duplicate semantic channels and unspecified pressure/bank references do not auto-pair.

Tests preserve STFT/LTFT banks, O2 bank/sensor channels, MAP absolute versus boost gauge, pedal versus throttle, lambda versus AFR and fuel-pressure reference. Equal source labels alone have no matching authority. Custom numeric data must receive an explicit valid V2 physical mapping before comparative/relationship use.

## 11. What Changed

Only good/partial contexts produce direct difference observations. Each signal additionally needs ≥5 samples and ≥60% coverage in each selected region. Cards identify canonical signal, A/B medians, units, absolute B−A delta, sample counts, coverage and context status. Region start/end and phase are displayed directly above the cards.

The synthetic cruise example reports LTFT Bank 1 median 10.8% → 4.3%, an absolute difference of −6.5 percentage points. Equal values produce zero differences without claiming improvement. Different/unsupported conditions show the reasons and suppress direct change cards and comparison plots. No component failure, repair success, cause or diagnostic probability is generated.

## 12. A/B Visualization

Compatible signals can be shown side by side with shared Y limits and independently labelled real-time X axes. Each X origin is the selected region's own start; durations remain actual seconds and may differ. No original timestamp overlay, row alignment, time stretching or synchronized physical-event claim is made.

The worker returns extrema-reduced traces with gap breaks and full-resolution sample counts. The interface names Run A/Run B and uses blue/gold accents. Incompatible contexts cannot request a comparison plot through the engine API. There is no automatic all-segment ranking, trace subtraction or warped overlay.

## 13. PID Relationship Explorer

Select run, phase region, two different mapped numeric signals and maximum pairing offset. The engine returns scatter points, full paired count, eligible unique X timestamps, unmatched count, actual maximum/mean absolute pairing offset, future-Y count, full paired ranges and Pearson r.

Each axis keeps its own identity/unit; RPM versus MAF, speed versus RPM, throttle versus RPM, MAP versus RPM and bank-qualified trim combinations are possible. It is not necessary for X and Y to share a physical dimension. Ambiguous/custom mappings are excluded until explicitly resolved. An independent time-axis mode is not added; existing V1 timeline charts cover signal-versus-time inspection.

## 14. Pairing / Staleness Policy

Default maximum |Δt| is 0.5 s, user-selectable from 0 to 2 s. Unique X timestamps in the selected region anchor pairing. Select the nearest Y by actual timestamp; ties choose the earlier sample and duplicate times choose first source row. If that nearest Y has already been used, lies outside the region, exceeds tolerance or crosses a >2 s row-timeline break, reject the pair. No alternate pairing, reuse, interpolation or extrapolation is performed.

This directional greedy policy is conservative and may discard usable alternatives; swapping axes can change the pair set. It is separate from V1's more permissive nearest-reading display policy. The UI exposes paired/eligible/unmatched counts, future samples and observed offsets. With zero pairs, ranges, offset statistics and Pearson are unavailable rather than fabricated zeros.

## 15. Correlation Mathematics

Pearson is the centered cross-product sum divided by the square root of the product of centered square sums:

`r = Σ((x − mean(x))(y − mean(y))) / sqrt(Σ(x − mean(x))² × Σ(y − mean(y))²)`.

Online centered updates operate on all accepted pairs, independent of bounded scatter rendering. At least three pairs and nonzero variance on both axes are required; otherwise r is null. Floating-point results are clamped to [−1,1]. Synthetic positive/negative linear relationships test +1/−1, and constant axes/insufficient samples test unavailable results.

Fewer than 20 pairs trigger a small-sample caution, not a significance threshold. No p-value, confidence interval, qualitative strength band or Spearman coefficient is claimed. Autocorrelation, outliers and shared driving inputs may influence the number. Correlation is explicitly not causation or proof of component health.

## 16. Event / Observation Architecture

`events.ts` now defines `LogObservationDetector<T>` alongside V1 timeline detectors. `drivingPhaseDetector` declares required inputs, full rule, thresholds, suppression and limitations. Accepted phase indexes produce typed `phase-boundary` observations containing segment ID, boundary time, label and rule evidence in each phase page.

V1 recording-gap events remain unchanged. The phase selector and snapshot expose phase context/boundaries; detectors have no fault, diagnostic score or repair-action fields. This preserves a distinction between a data observation and a vehicle diagnosis.

## 17. What Happened Here Integration

The existing inspect response adds the accepted Run A phase at the shared cursor. A binary search finds the current segment; exact internal boundaries belong to the following segment and the final endpoint belongs to the final segment. The snapshot displays phase, bounds, duration, evidence and its starting boundary.

Existing nearest values, original values/units, signed sample offsets, staleness and mapping provenance remain. No interpolation is introduced. Inspect this phase in Run A moves the shared cursor to the selected boundary. B provides separate phase statistics, provenance and relationship analysis; it does not duplicate the full V1 playback/snapshot dashboard.

## 18. Performance / Two-Log Benchmark

Synthetic workload: **200,000 rows per run**, nine columns per row, **3.6 million combined cells**. Input sizes: 9,777,882 and 10,000,102 bytes. Windows, Node v24.12.0; local-machine results, not universal latency guarantees. Runs have independent original time origins and known MAF/RPM and LTFT ground truth.

| Measurement | Recorded result |
| --- | --- |
| Two imports, mapping previews and acceptance | 1,603.3 ms |
| Both phase segmentations | 111.3 ms |
| Both selected-region statistics | 343.5 ms |
| Context matching + statistics + What Changed | 315.0 ms |
| Timestamp pairing + Pearson + bounded scatter | 71.6 ms |
| Matching + two trace queries | 415.6 ms |
| Approximate heap delta across benchmark | 566.7 MiB |
| Scatter payload | 1,000 points from 200,000 paired samples |
| Trace payload | 400 points per run |
| Full paired Pearson | 0.9999999998003486 |
| Final browser Run B import through comparison, A already loaded | 3,444 ms; 134 UI timer ticks at 20 ms interval |

Timing scopes include what their labels state; matching/trace operations recompute selected statistics and are not isolated microbenchmarks. Heap is a before/after allocation snapshot without forced GC, not peak RSS. Tests ran during ordinary local development and some checks ran concurrently.

Original per-file limits remain: 25 MiB, 250,000 rows, 128 columns, two million cells. Two runs mean two source owners; accepted and draft datasets can coexist during remapping. Large inputs can still exceed practical low-memory phone capacity. Phase summaries/plots are bounded, raw arrays stay in the worker, and no additional full-log transfer is used.

## 19. Mobile UX

Verified 320×740, 390×844 and 844×390. Region selectors, run accents, statistics/change cards, mapping preview and progressive-disclosure panels fit narrow screens without horizontal document overflow. Controls are touch-sized; browser comparison tests use touch-enabled contexts and tap the comparison action.

Portrait stacks A/B traces and cards. Landscape limits SVG height to 220 px so plots and labels fit more usefully in the short viewport. This final CSS change was rebuilt and the three responsive scenarios rerun successfully. Desktop comparison, phone region controls and relationship scatter screenshots were inspected visually.

## 20. Privacy

Both source logs, mappings, phases, relationship pairs and comparison results remain in browser memory. No upload endpoint, network analysis, analytics event, cloud storage or comparison persistence was added. V2's explicit local mapping templates remain the only persistent OBD configuration.

A fresh production-browser test monitored import, A/B comparison, plotting and B remapping and observed zero off-origin requests. It also found no new OBD storage entries. Existing V2 template privacy/schema tests continue passing. Worker cancellation/removal releases memory ownership. These tests do not make claims about third-party browser extensions or external device software.

## 21. Actual Test Results

| Check | Actual result |
| --- | --- |
| `npm run test:obd` | 61 passed, 0 failed: 20 V1 + 19 V2 + 22 V3 |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed: 0 errors, 24 existing editorial warnings |
| Final focused ESLint after analysis/test fixes | Passed without output/errors |
| `npm run build` | Passed; all 14 routes listed |
| `npm run test:browser` | 20 passed, 0 failed; 44.0 seconds in final full run |
| Responsive rerun after landscape CSS adjustment | All 3 affected scenarios passed; 4.1 seconds |
| `npm run benchmark:obd-v3` | Passed known-value, pair-count and payload-bound assertions |
| `git diff --check` | Passed |

New deterministic tests cover every supported phase, hysteresis/duration, gaps, irregular/duplicate/tiny timestamps, derivatives, missing speed/RPM, full-resolution statistics, context/semantic compatibility, distinct banks/sensors/pressure references, What Changed, asynchronous pairing/tolerance/no reuse, Pearson signs/constants/small samples, source/session isolation, phase pagination, decimal 10 Hz boundaries, differing condition envelopes and empty-duration data.

## 22. Browser / Responsive Results

Tests execute the actual compiled worker against the production Vinext server on port 5184. V3 adds six scenarios: numerical A/B and privacy; asynchronous relationship and independent B; three responsive/touch workflows; and two-large-log lifecycle/cancellation. Assertions include actual medians, −6.5 percentage-point difference, phase changes, paired counts, offset statistics and Pearson, not just DOM presence.

B time remapping changes B to unclassified while A's cruise remains. Different phases suppress change cards. A 200,000-pair relationship is verified in-browser. Cancelling a large B re-import observes exactly one worker created and terminated, removes both analyzers, and a fresh import succeeds. Existing V1/V2 import, playback, template, mapping, source preservation, error recovery and route tests pass.

Artifacts in ignored `outputs/`: `obd-v3-desktop-comparison.png`, `obd-v3-regions-{320,390,844}.png`, `obd-v3-comparison-{320,390,844}.png`, `obd-v3-scatter-{320,390,844}.png`, plus refreshed V1/V2 captures. Coverage is Chromium with emulated viewports/touch, not physical phones, Safari or Firefox.

## 23. Problems Found and Fixed

1. Initial test code used invented short column IDs. Corrected it to actual source-column IDs; numerical expectations remain independently specified.
2. Added explicit type narrowing for inherited semantic comparison pairs; nullable identities cannot leak into V3's typed result.
3. React lint rejected reading a worker ref during render. Added state for the active client passed to the child while retaining the existing lifecycle ref in handlers/effects.
4. Self-review found potential decimal 10 Hz threshold flicker. Added a 1e-9 s boundary tolerance and deterministic regression test without changing real Δtime calculations.
5. Median-only context could hide very different ranges. Added corresponding min/max envelope checks and an outlier regression case; mismatches suppress observations.
6. Disabled comparison-signal changes while its query is in flight and invalidated results on region/page changes, preventing labels from drifting from returned results.
7. Empty relationship offset statistics now return null; unavailable measurements are not displayed as measured zeros.
8. Clarified percentage-point differences and the lack of causal inference. Limited landscape chart height after visual review and reran responsive tests.

## 24. Known Limitations

- Synthetic validation only; no genuine device logs, labelled road drives or vehicle-specific thresholds were supplied or collected.
- Fixed conservative phase rules may leave substantial data unclassified, particularly low speed, sparse data or >10 Hz inputs. No resampling or smoothing is performed.
- Full-resolution statistics are sample-weighted. Context medians/envelopes do not control all physical confounders or match detailed trajectories.
- Users select one phase segment per run. No automatic region ranking, arbitrary range editor, multi-region aggregation or saved comparison workspace.
- Side-by-side region-relative plots only; no event-aligned overlay or time warping. B does not have a second full playback dashboard.
- Directional nearest-then-reject pairing can discard alternatives; axis reversal may change pairs. Scatter thinning is deterministic and may miss visual clusters; correlation uses all pairs.
- Pearson is descriptive only. No Spearman, lag search, significance testing, robust regression or causal/diagnostic inference.
- Selected statistics are recomputed for some requests. Two large logs used approximately 567 MiB heap delta here; low-memory hardware remains unmeasured.
- Phase metadata is paginated; all segments remain queryable. Per-file limits remain unchanged and do not guarantee device-specific memory availability.
- All V2 format/time/encoding limitations remain. Cloudflare runtime deployment and physical mobile browsers were not tested.

## 25. Remaining Gap vs OBDViz-Level Experience

V3 closes TorqueGirl's previously documented gaps in actual A/B interaction, operating-phase context and timestamp-aware relationship exploration. It adds evidence-led import-to-comparison workflows while preserving local processing.

Remaining TorqueGirl gaps toward a mature interactive analysis experience include real-export/real-drive validation, richer dashboard/axis customization, user-selected event anchors, automatic candidate-region search and lower-memory operation. No fresh competitor audit or direct usability/performance comparison was performed, so this report makes no claim that OBDViz lacks these features or that TorqueGirl is superior.

## 26. Recommended SINGLE Next Phase

**Validate ingestion, phase rules and comparison decisions against a consented, anonymized real-drive corpus with human-labelled operating regions.** Record exporter/version/units, vehicle context, acquisition cadence and expected boundaries, then turn confirmed discrepancies into adapter/phase/matching regressions. This is the largest remaining trust gap before expanding interpretation.

## 27. Git Status

Work remains only in `C:\TorqueGirl-obd-v1` on `codex/obd2-analyzer-v1`, after V2 commit `e2f71f6`. This report is included in the local V3 commit; `git log -1` supplies its hash, also recorded in the final response with post-commit status.

No main checkout modification, merge, reset, stash, deletion of unrelated work, push, PR or deployment was performed. The public site is unchanged.

## 28. Handoff Notes

Use README commands for engine tests, typecheck, lint, build, `benchmark:obd-v3`, the local production server and Playwright. The two small `tests/obd/fixtures/v3/synthetic-*.csv` files provide a reviewable A/B example; their README records provenance and expected values. Select cruise in both runs for the LTFT comparison and acceleration in A for RPM/MAF Pearson +1.

New physical rules belong in `drive.ts` with detector documentation and deterministic ground truth. Keep parser/exporter mappings in the existing V2 modules. Preserve original source ownership, explicit units, evidence limits, bounded responses and invalidation when mappings change. Phase thresholds are analytic heuristics, not vehicle fault thresholds. No deployment is needed to review this local implementation.
