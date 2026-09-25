import { ImportSession } from './import-session';
import { drivingPhaseDetector, phaseSummary, region, compare, comparisonTraces, relationship, type Segment } from './drive';
import type { MappingConfig } from './mapping-types';
export type Run = 'A' | 'B';
/** Two independent source owners in one cancellable worker; no cross-worker raw-array copies. */
export class DriveSession {
  private sessions = { A: new ImportSession(), B: new ImportSession() };
  private segments: Record<Run, Segment[]> = { A: [], B: [] };
  session(run: Run = 'A') { if (run !== 'A' && run !== 'B') throw new Error('Invalid run.'); return this.sessions[run]; }
  load(run: Run, text: string) { this.segments[run] = []; return this.session(run).load(text); }
  remap(run: Run, config: MappingConfig) { return this.session(run).remap(config); }
  commit(run: Run, revision: number) { const info = this.session(run).commit(revision); this.segments[run] = drivingPhaseDetector.detect(this.log(run)); return info; }
  clearB() { this.sessions.B = new ImportSession(); this.segments.B = []; }
  log(run: Run) { const log = this.session(run).log; if (!log) throw new Error(`Accept Run ${run} mapping first.`); return log; }
  summary(run: Run, offset = 0) { this.log(run); return phaseSummary(this.segments[run], offset); }
  segment(run: Run, id: number) { const s = this.segments[run].find(s => s.id === id); if (!s) throw new Error('Select a valid phase region.'); return s; }
  at(run: Run, time: number) {
    const all = this.segments[run]; let lo = 0, hi = all.length;
    while (lo < hi) { const m = (lo + hi) >>> 1; if (all[m].end <= time) lo = m + 1; else hi = m; }
    const found = all[lo] ?? (time === all.at(-1)?.end ? all.at(-1) : undefined);
    return found && time >= found.start && time <= found.end ? found : null;
  }
  region(run: Run, id: number) { return region(this.log(run), this.segment(run, id)); }
  compare(a: number, b: number) { return compare(this.log('A'), this.log('B'), this.segment('A', a), this.segment('B', b)); }
  traces(a: number, b: number, identity: string) { return comparisonTraces(this.log('A'), this.log('B'), this.segment('A', a), this.segment('B', b), identity); }
  relationship(run: Run, id: number, x: string, y: string, tolerance: number) { return relationship(this.log(run), this.segment(run, id), x, y, tolerance); }
}
