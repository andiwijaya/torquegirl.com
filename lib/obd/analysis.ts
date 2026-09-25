import type { Log, Reading, Sample, Signal, Trace } from './types';

export function lowerBound(samples: Sample[], time: number): number {
  let lo = 0, hi = samples.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (samples[mid].time < time) lo = mid + 1; else hi = mid; }
  return lo;
}
/** Nearest numeric sample; ties choose earlier time, duplicates choose first source row. */
export function nearest(signal: Signal, time: number): Reading {
  const samples = signal.samples, i = lowerBound(samples, time);
  let sample = samples[i];
  if (i && (!sample || time - samples[i - 1].time <= sample.time - time)) sample = samples[i - 1];
  if (sample) sample = samples[lowerBound(samples, sample.time)];
  const offset = sample ? sample.time - time : null;
  return { id: signal.id, value: sample?.value ?? null, source: sample ? signal.sourceValues[sample.row] : null, time: sample?.time ?? null, offset, stale: offset !== null && Math.abs(offset) > Math.max(2, (signal.cadence ?? 0) * 3) };
}

/** Bucket extrema preserve first/last and local minima/maxima; original samples are never changed. */
export function reduceSamples(samples: Sample[], start: number, end: number, buckets = 300): Sample[] {
  buckets = Math.max(1, Math.min(1000, Math.floor(buckets)));
  const lo = lowerBound(samples, start), hi = lowerBound(samples, end + Number.EPSILON * Math.max(1, Math.abs(end)) * 2);
  const output: Sample[] = [];
  let group: Sample[] = [], bucket = -1;
  const flush = () => {
    if (!group.length) return;
    let min = group[0], max = group[0];
    for (const p of group) { if (p.value < min.value) min = p; if (p.value > max.value) max = p; }
    const selected = [...new Set([group[0], min, max, group[group.length - 1]])].sort((a, b) => a.time - b.time || a.row - b.row);
    output.push(...selected); group = [];
  };
  for (let i = lo; i < hi; i++) {
    const next = Math.min(buckets - 1, Math.floor((samples[i].time - start) / Math.max(end - start, 1e-9) * buckets));
    if (next !== bucket) { flush(); bucket = next; } group.push(samples[i]);
  }
  flush(); return output;
}

export function trace(signal: Signal, start: number, end: number, buckets = 240): Trace {
  const lo = lowerBound(signal.samples, start), hi = lowerBound(signal.samples, end + Number.EPSILON * Math.max(1, Math.abs(end)) * 2);
  let min = Infinity, max = -Infinity, mean = 0, count = 0;
  for (let i = lo; i < hi; i++) { const v = signal.samples[i].value; min = Math.min(min, v); max = Math.max(max, v); mean += (v - mean) / ++count; }
  const reduced = reduceSamples(signal.samples, start, end, buckets), points: Trace['points'] = [];
  // Break at raw missing rows OR long signal-specific intervals, even after reduction.
  for (let i = 0; i < reduced.length; i++) {
    const p = reduced[i], prev = reduced[i - 1];
    if (prev) {
      const a = lowerBound(signal.samples, prev.time), b = lowerBound(signal.samples, p.time);
      let gap = false;
      for (let j = a + 1; j <= b; j++) {
        const x = signal.samples[j - 1], y = signal.samples[j];
        if (y && (y.time - x.time > Math.max(5, (signal.cadence ?? 0) * 5) || y.row > x.row + 1)) { gap = true; break; }
      }
      if (gap) points.push({ time: (prev.time + p.time) / 2, value: null });
    }
    points.push({ time: p.time, value: p.value });
  }
  return { id: signal.id, points, min: count ? min : null, max: count ? max : null, average: count ? mean : null, count };
}

export interface ComparisonAlignment { aAnchorSeconds: number; bAnchorSeconds: number; context: string }
/** Explicit physical-event anchors, never row offsets. Ambiguous/unknown/duplicate semantics do not auto-match. */
export function comparisonPairs(a: Log, b: Log, alignment: ComparisonAlignment) {
  if (!Number.isFinite(alignment.aAnchorSeconds) || !Number.isFinite(alignment.bAnchorSeconds) || !alignment.context.trim()) throw new Error('Comparison requires finite time anchors and physical context.');
  return a.signals.filter(s => s.identity && !s.ambiguity && !s.identity.includes('unspecified')).flatMap(s => {
    const candidates = b.signals.filter(t => t.identity === s.identity && t.unit === s.unit && !t.ambiguity);
    return candidates.length === 1 && a.signals.filter(t => t.identity === s.identity).length === 1 ? [{ a: s.id, b: candidates[0].id, identity: s.identity, unit: s.unit, bTimeOffset: alignment.aAnchorSeconds - alignment.bAnchorSeconds, context: alignment.context }] : [];
  });
}
