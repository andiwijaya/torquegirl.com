export interface Signal {
  id: string;
  originalName: string;
  originalUnit: string | null;
  identity: string | null;
  unit: string | null;
  ambiguity: string | null;
  sourceValues: string[];
  values: (number | null)[];
  samples: Sample[];
  missing: number;
  invalid: number;
  cadence: number | null;
}
export interface Sample { time: number; value: number; row: number }
export interface Observation { kind: 'time-gap'; time: number; start: number; label: string }
export interface Quality {
  parsed: number; rejected: number; missingTimes: number; duplicateTimes: number;
  backwardsTimes: number; duration: number; recognized: number; unknown: number;
  missingValues: number; invalidValues: number; intervalMin: number | null;
  intervalMedian: number | null; intervalMax: number | null; irregular: boolean;
  warnings: string[]; warningCount: number; gaps: number;
}
export interface Log {
  format: string; delimiter: string; signals: Signal[];
  originalTimes: string[]; times: (number | null)[];
  quality: Quality; events: Observation[];
}
export type SignalInfo = Omit<Signal, 'sourceValues' | 'values' | 'samples'>;
export interface LogInfo { format: string; delimiter: string; signals: SignalInfo[]; quality: Quality; events: Observation[] }
export interface Reading { id: string; value: number | null; source: string | null; time: number | null; offset: number | null; stale: boolean }
export interface Trace { id: string; points: { time: number; value: number | null }[]; min: number | null; max: number | null; average: number | null; count: number }
