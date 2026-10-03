import type { Comparison, Region } from '../obd/drive';
import { NotebookError, validateEvidence, type NotebookEvidence, type NotebookRegion, type NotebookSignal } from './model';

export interface AnalysisEvidenceInput {
  /** Explicit user-reviewed labels. Do not default these to imported filenames. */
  runALabel?: string;
  runBLabel?: string;
  signals: readonly NotebookSignal[];
  regionA?: Region;
  regionB?: Region;
  /** Optional chart selection, when a phase summary is not being captured. */
  timeRegionA?: NotebookRegion;
  timeRegionB?: NotebookRegion;
  comparison?: Comparison;
}

/** Pure opt-in projection. No Log/Blob/source rows/traces/relationships/session input.
 * Phase statistics take precedence over chart regions so their scope stays honest.
 * Signal IDs are run-local: selections default to A; set run: B for B statistics.
 * Unknown source properties are never copied; invalid/oversized selections fail.
 */
export function projectAnalysisEvidence(input: AnalysisEvidenceInput): NotebookEvidence {
  const signals = input.signals.map(s => ({ id: s.id, label: s.label, ...(s.run !== undefined ? { run: s.run } : {}), ...(s.identity !== undefined ? { identity: s.identity } : {}), ...(s.unit !== undefined ? { unit: s.unit } : {}) }));
  const region = (r: Region): NotebookRegion => ({ start: r.segment.start, end: r.segment.end, phase: r.segment.phase });
  const result: NotebookEvidence = {
    signals,
    ...(input.runALabel !== undefined ? { runALabel: input.runALabel } : {}),
    ...(input.runBLabel !== undefined ? { runBLabel: input.runBLabel } : {}),
    ...(input.regionA ? { regionA: region(input.regionA) } : input.timeRegionA ? { regionA: { start: input.timeRegionA.start, end: input.timeRegionA.end, ...(input.timeRegionA.phase !== undefined ? { phase: input.timeRegionA.phase } : {}) } } : {}),
    ...(input.regionB ? { regionB: region(input.regionB) } : input.timeRegionB ? { regionB: { start: input.timeRegionB.start, end: input.timeRegionB.end, ...(input.timeRegionB.phase !== undefined ? { phase: input.timeRegionB.phase } : {}) } } : {}),
  };
  const statistics: NonNullable<NotebookEvidence['statistics']> = [];
  for (const [run, r] of [['A', input.regionA], ['B', input.regionB]] as const) {
    for (const s of r?.stats ?? []) if (signals.some(selected => selected.id === s.id && (selected.run ?? 'A') === run)) statistics.push({ run, signalId: s.id, count: s.count, min: s.min, max: s.max, mean: s.mean, median: s.median, coverage: s.coverage, cadence: s.cadence });
  }
  if (statistics.length) result.statistics = statistics;
  if (input.comparison) {
    // Same elapsed bounds can belong to a replaced/remapped log. Compare the
    // statistics too, including operating context outside the selected signals.
    const same = (a: Region | undefined, b: Region) => a && a.segment.start === b.segment.start && a.segment.end === b.segment.end && a.segment.phase === b.segment.phase && a.stats.length === b.stats.length && a.stats.every(s => {
      const other = b.stats.find(v => v.id === s.id);
      return other && s.identity === other.identity && s.unit === other.unit && s.count === other.count && s.min === other.min && s.max === other.max && s.mean === other.mean && s.median === other.median && s.coverage === other.coverage && s.cadence === other.cadence;
    });
    if (!same(input.regionA, input.comparison.a) || !same(input.regionB, input.comparison.b)) throw new NotebookError('conflict', 'Comparison no longer matches selected regions; compare again before capture.');
    result.comparison = {
      state: input.comparison.state, reasons: [...input.comparison.reasons],
      changes: input.comparison.changes.filter(c => signals.some(s => s.identity === c.identity && s.unit === c.unit)).map(c => ({ identity: c.identity, unit: c.unit, a: c.a, b: c.b, delta: c.delta, countA: c.countA, countB: c.countB, coverageA: c.coverageA, coverageB: c.coverageB })),
    };
  }
  return validateEvidence(result);
}
