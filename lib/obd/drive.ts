import { lowerBound, nearest, trace, comparisonPairs } from './analysis';
import type { Log, Signal, Trace } from './types';
import type { LogObservationDetector } from './events';

export type Phase = 'stopped' | 'idle' | 'acceleration' | 'cruise' | 'deceleration' | 'unclassified';
export interface Segment { id: number; start: number; end: number; duration: number; phase: Phase; evidence: string; caveat: string }
export interface PhaseObservation { kind: 'phase-boundary'; time: number; segment: number; label: string; evidence: string }
export interface PhaseSummary { segments: Segment[]; events: PhaseObservation[]; total: number; offset: number; durations: Record<Phase, number> }
export interface Statistics { id: string; identity: string | null; unit: string | null; count: number; min: number | null; max: number | null; mean: number | null; median: number | null; coverage: number; cadence: number | null }
export interface Region { segment: Segment; stats: Statistics[] }
export interface Change { identity: string; unit: string; a: number; b: number; delta: number; countA: number; countB: number; coverageA: number; coverageB: number }
export interface Comparison { state: 'GOOD MATCH' | 'PARTIAL MATCH' | 'CONDITIONS DIFFER' | 'INSUFFICIENT DATA'; reasons: string[]; a: Region; b: Region; changes: Change[]; pairs: { a: string; b: string; identity: string; unit: string | null }[] }
export interface Relationship { x: string; y: string; tolerance: number; count: number; eligible: number; unmatched: number; maxOffset: number | null; meanOffset: number | null; futurePairs: number; pearson: number | null; xRange: [number, number] | null; yRange: [number, number] | null; points: { x: number; y: number }[]; note: string }

export const PHASE_RULES = 'Unique canonical speed required. Intervals 0.1–2 s use actual Δt; acceleration = Δkm/h ÷ 3.6 ÷ Δs. Stop ≤1 km/h (exit >2); idle additionally 400–1200 RPM. Moving ≥5 km/h: acceleration ≥0.5 m/s² (retain ≥0.25), deceleration ≤−0.5 (retain ≤−0.25), cruise |a|≤0.15 (retain ≤0.25). Candidate runs shorter than 3 s become unclassified. No smoothing, interpolation or classification over unsupported intervals.';
export const PAIRING_POLICY = 'Unique X timestamps anchor one-to-one nearest Y samples within the selected region and ≤0.5 s (configurable 0–2 s). Ties choose earlier; duplicate timestamps choose first source row. A Y sample is never reused. No interpolation. Pairs crossing any >2 s row-timeline break are excluded. Full paired data drives Pearson; scatter is a deterministic bounded sample.';
const rule: Record<Phase, string> = {
  stopped: 'Speed ≤1 km/h; hysteresis retains stop through 2 km/h. RPM does not support the idle rule.',
  idle: 'Stopped-speed rule and RPM 400–1200 at both interval endpoints, each within 0.5 s.',
  acceleration: 'Speed ≥5 km/h and actual-time derivative ≥0.5 m/s²; retain ≥0.25.',
  cruise: 'Speed ≥5 km/h and |actual-time derivative| ≤0.15 m/s²; retain ≤0.25.',
  deceleration: 'Speed ≥5 km/h and actual-time derivative ≤−0.5 m/s²; retain ≤−0.25.',
  unclassified: 'Missing/ambiguous evidence, unsupported sampling interval, transition, or candidate shorter than 3 s.',
};
export function canonical(log: Log, identity: string): Signal | undefined {
  const found = log.signals.filter(s => s.identity === identity);
  return found.length === 1 && !found[0].ambiguity && found[0].unit ? found[0] : undefined;
}
export function derivative(t0: number, v0: number, t1: number, v1: number): number | null {
  const dt = t1 - t0;
  return dt >= 0.1 - 1e-9 && dt <= 2 + 1e-9 && [t0, t1, v0, v1].every(Number.isFinite) ? (v1 - v0) / 3.6 / dt : null;
}
export function phases(log: Log): Segment[] {
  const speed = canonical(log, 'speed'), rpm = canonical(log, 'rpm'), raw: Segment[] = [];
  const add = (start: number, end: number, phase: Phase) => {
    if (end <= start) return;
    const last = raw.at(-1);
    if (last && last.phase === phase && last.end === start) { last.end = end; last.duration = end - last.start; }
    else raw.push({ id: raw.length, start, end, duration: end - start, phase, evidence: rule[phase], caveat: 'Conservative operating label, not vehicle-specific validation. Interval evidence does not prove engine/load state.' });
  };
  if (!speed) { add(0, log.quality.duration, 'unclassified'); return raw; }
  // Deduplicate before deriving; source arrays are untouched.
  const samples = speed.samples.filter((s, i, all) => i === 0 || s.time !== all[i - 1].time);
  add(0, samples[0]?.time ?? log.quality.duration, 'unclassified');
  let previous: Phase = 'unclassified';
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i], d = derivative(a.time, a.value, b.time, b.value);
    let phase: Phase = 'unclassified';
    if (d !== null && a.value >= 0 && b.value >= 0) {
      const stopLimit = previous === 'idle' || previous === 'stopped' ? 2 : 1;
      if (Math.max(a.value, b.value) <= stopLimit) {
        const idle = rpm && [a.time, b.time].every(t => { const r = nearest(rpm, t); return r.value !== null && r.offset !== null && Math.abs(r.offset) <= 0.5 && r.value >= 400 && r.value <= 1200; });
        phase = idle ? 'idle' : 'stopped';
      } else if (Math.min(a.value, b.value) >= 5) {
        if (d >= (previous === 'acceleration' ? 0.25 : 0.5)) phase = 'acceleration';
        else if (d <= (previous === 'deceleration' ? -0.25 : -0.5)) phase = 'deceleration';
        else if (Math.abs(d) <= (previous === 'cruise' ? 0.25 : 0.15)) phase = 'cruise';
      }
    }
    add(a.time, b.time, phase); previous = phase;
  }
  add(samples.at(-1)?.time ?? 0, log.quality.duration, 'unclassified');
  const stable: Segment[] = [];
  for (const part of raw) {
    const phase = part.duration < 3 - 1e-9 ? 'unclassified' : part.phase, last = stable.at(-1);
    if (last && last.phase === phase && last.end === part.start) { last.end = part.end; last.duration = last.end - last.start; }
    else stable.push({ ...part, id: stable.length, phase, evidence: rule[phase] });
  }
  return stable;
}
export const drivingPhaseDetector: LogObservationDetector<Segment[]> = {
  id: 'driving-phase', requiredInputs: 'Unique known-unit speed; optional unique RPM for idle.', rule: PHASE_RULES,
  suppression: 'First source row per timestamp; threshold hysteresis; candidate duration ≥3 s. Numerical boundary epsilon 1e-9 s.',
  limitations: 'No engine/gear/road inference. Sparse (>2 s), too-fast (<0.1 s) and unsupported intervals remain unclassified.', detect: phases,
};
export function phaseSummary(segments: Segment[], offset = 0): PhaseSummary {
  const durations: PhaseSummary['durations'] = { stopped: 0, idle: 0, acceleration: 0, cruise: 0, deceleration: 0, unclassified: 0 };
  for (const s of segments) durations[s.phase] += s.duration;
  offset = Math.max(0, Math.floor(offset));
  const page = segments.slice(offset, offset + 200);
  return { segments: page, events: page.map(s => ({ kind: 'phase-boundary', time: s.start, segment: s.id, label: `Phase starts: ${s.phase}`, evidence: s.evidence })), total: segments.length, offset, durations };
}
export function stats(signal: Signal, start: number, end: number): Statistics {
  const values: number[] = [], deltas: number[] = [];
  let mean = 0, covered = 0, min = Infinity, max = -Infinity, last: number | null = null;
  for (let i = lowerBound(signal.samples, start); i < signal.samples.length && signal.samples[i].time <= end; i++) {
    const s = signal.samples[i]; values.push(s.value); mean += (s.value - mean) / values.length; min = Math.min(min, s.value); max = Math.max(max, s.value);
    if (last !== null && s.time > last) { const dt = s.time - last; deltas.push(dt); if (dt <= 2) covered += dt; } last = s.time;
  }
  const median = (v: number[]) => { v.sort((a, b) => a - b); const n = v.length; return n ? (v[Math.floor((n - 1) / 2)] + v[Math.floor(n / 2)]) / 2 : null; };
  return { id: signal.id, identity: signal.identity, unit: signal.unit, count: values.length, min: values.length ? min : null, max: values.length ? max : null, mean: values.length ? mean : null, median: median(values), cadence: median(deltas), coverage: end > start ? Math.min(1, covered / (end - start)) : 0 };
}
export function region(log: Log, segment: Segment): Region { return { segment, stats: log.signals.map(s => stats(s, segment.start, segment.end)) }; }
export function compare(a: Log, b: Log, sa: Segment, sb: Segment): Comparison {
  const ar = region(a, sa), br = region(b, sb), reasons: string[] = [];
  const pairs = comparisonPairs(a, b, { aAnchorSeconds: sa.start, bAnchorSeconds: sb.start, context: `${sa.phase} / ${sb.phase}` });
  let state: Comparison['state'] = 'GOOD MATCH';
  if (sa.phase === 'unclassified' || sb.phase === 'unclassified') { state = 'INSUFFICIENT DATA'; reasons.push('At least one region has no supported operating phase.'); }
  else if (sa.phase !== sb.phase) { state = 'CONDITIONS DIFFER'; reasons.push(`Phase differs: ${sa.phase} vs ${sb.phase}.`); }
  let usable = 0, missing = 0, differs = false, speedUsable = false;
  for (const [identity, tolerance] of [['speed', 5], ['rpm', 250], ['throttle', 10], ['load', 10], ['coolant', 10]] as const) {
    const pair = pairs.find(p => p.identity === identity), x = ar.stats.find(s => s.id === pair?.a), y = br.stats.find(s => s.id === pair?.b);
    if (!x || !y || x.median === null || y.median === null || Math.min(x.count, y.count) < 5 || Math.min(x.coverage, y.coverage) < 0.6) { missing++; reasons.push(`${identity}: insufficient compatible coverage (need ≥5 samples and ≥60% in each region).`); continue; }
    usable++; if (identity === 'speed') speedUsable = true;
    const delta = Math.abs(y.median - x.median), envelopeDelta = Math.max(Math.abs(x.min! - y.min!), Math.abs(x.max! - y.max!)), mismatch = delta > tolerance || envelopeDelta > 2 * tolerance;
    differs ||= mismatch;
    reasons.push(`${identity}: median A ${x.median.toFixed(2)}, B ${y.median.toFixed(2)} ${pair!.unit}; Δ ${delta.toFixed(2)}, tolerance ${tolerance}; max min/max difference ${envelopeDelta.toFixed(2)}, limit ${2 * tolerance} → ${mismatch ? 'differs' : 'within range'}.`);
  }
  if (state === 'GOOD MATCH') {
    if (differs) state = 'CONDITIONS DIFFER';
    else if (!speedUsable || usable < 2 || Math.min(sa.duration, sb.duration) < 3) state = 'INSUFFICIENT DATA';
    else if (missing) state = 'PARTIAL MATCH';
  }
  reasons.push('Matching compares region medians, not row positions or identical trajectories. Unmeasured road, gear, vehicle and ambient conditions remain unknown.');
  const changes: Change[] = state === 'GOOD MATCH' || state === 'PARTIAL MATCH' ? pairs.flatMap(p => {
    const x = ar.stats.find(s => s.id === p.a)!, y = br.stats.find(s => s.id === p.b)!;
    return x.median !== null && y.median !== null && Math.min(x.count, y.count) >= 5 && Math.min(x.coverage, y.coverage) >= 0.6 ? [{ identity: p.identity!, unit: p.unit!, a: x.median, b: y.median, delta: y.median - x.median, countA: x.count, countB: y.count, coverageA: x.coverage, coverageB: y.coverage }] : [];
  }) : [];
  return { state, reasons, a: ar, b: br, changes, pairs: pairs.map(p => ({ ...p, identity: p.identity! })) };
}
export function comparisonTraces(a: Log, b: Log, sa: Segment, sb: Segment, identity: string): { a: Trace; b: Trace } {
  const match = compare(a, b, sa, sb);
  if (!['GOOD MATCH', 'PARTIAL MATCH'].includes(match.state)) throw new Error('Select comparable operating regions before plotting a comparison.');
  const pair = match.pairs.find(p => p.identity === identity);
  if (!pair) throw new Error('No unique compatible semantic signal.');
  return { a: trace(a.signals.find(s => s.id === pair.a)!, sa.start, sa.end, 100), b: trace(b.signals.find(s => s.id === pair.b)!, sb.start, sb.end, 100) };
}
export function relationship(log: Log, segment: Segment, xId: string, yId: string, tolerance = 0.5): Relationship {
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 2) throw new Error('Pairing tolerance must be 0–2 seconds.');
  const x = log.signals.find(s => s.id === xId), y = log.signals.find(s => s.id === yId);
  if (!x || !y || !x.identity || !y.identity || x.ambiguity || y.ambiguity || xId === yId) throw new Error('Select two different numeric signals with explicit compatible mapping and known units.');
  const times = [...new Set(log.times.filter((t): t is number => t !== null))].sort((a, b) => a - b);
  const breaks = times.filter((t, i) => i > 0 && t - times[i - 1] > 2).map(time => ({ time, value: 0, row: 0 }));
  let count = 0, eligible = 0, mx = 0, my = 0, xx = 0, yy = 0, xy = 0, maxOffset = 0, sumOffset = 0, futurePairs = 0;
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity, lastY = -1;
  const points: Relationship['points'] = [];
  const stride = Math.max(1, Math.ceil((lowerBound(x.samples, segment.end + 1e-9) - lowerBound(x.samples, segment.start)) / 1000));
  for (let i = lowerBound(x.samples, segment.start); i < x.samples.length && x.samples[i].time <= segment.end; i++) {
    const a = x.samples[i]; if (i > 0 && x.samples[i - 1].time === a.time) continue;
    eligible++;
    let j = lowerBound(y.samples, a.time);
    if (j && (!y.samples[j] || a.time - y.samples[j - 1].time <= y.samples[j].time - a.time)) j--;
    if (y.samples[j]) j = lowerBound(y.samples, y.samples[j].time);
    const b = y.samples[j];
    if (!b || j <= lastY || b.time < segment.start || b.time > segment.end || Math.abs(b.time - a.time) > tolerance) continue;
    // A pair cannot span a row-timeline discontinuity, even with a permissive tolerance.
    const boundary = breaks[lowerBound(breaks, Math.min(a.time, b.time) + 1e-9)];
    if (boundary !== undefined && boundary.time <= Math.max(a.time, b.time)) continue;
    lastY = j; count++;
    const dx = a.value - mx, dy = b.value - my; mx += dx / count; my += dy / count;
    xx += dx * (a.value - mx); yy += dy * (b.value - my); xy += dx * (b.value - my);
    const offset = Math.abs(b.time - a.time); maxOffset = Math.max(maxOffset, offset); sumOffset += offset; if (b.time > a.time) futurePairs++;
    xmin = Math.min(xmin, a.value); xmax = Math.max(xmax, a.value); ymin = Math.min(ymin, b.value); ymax = Math.max(ymax, b.value);
    if ((eligible - 1) % stride === 0 && points.length < 1000) points.push({ x: a.value, y: b.value });
  }
  const pearson = count >= 3 && xx > 0 && yy > 0 ? Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy))) : null;
  return { x: x.id, y: y.id, tolerance, count, eligible, unmatched: eligible - count, maxOffset: count ? maxOffset : null, meanOffset: count ? sumOffset / count : null, futurePairs, pearson, xRange: count ? [xmin, xmax] : null, yRange: count ? [ymin, ymax] : null, points, note: count < 20 ? 'Fewer than 20 pairs; interpret cautiously. Correlation is not causation.' : 'Descriptive Pearson only; autocorrelation, outliers and common driving inputs can influence it. Correlation is not causation.' };
}
