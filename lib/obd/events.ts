import type { Log, Observation } from './types';

/** Signal-aware detectors complement timeline detectors; their output remains observational. */
export interface LogObservationDetector<T> {
  id: string; requiredInputs: string; rule: string; suppression: string; limitations: string;
  detect(log: Log): T;
}

export interface TimelineContext { orderedTimes: number[]; origin: number; medianInterval: number | null }
export interface ObservationDetector {
  id: string;
  description: string;
  detect(context: TimelineContext): { events: Observation[]; total: number };
}
/** Registry boundary for future deterministic observations; detectors must document their rule. */
export const timeGapDetector: ObservationDetector = {
  id: 'time-gap',
  description: 'Adjacent distinct timestamps separated by more than max(5 seconds, 5 × median positive interval).',
  detect({ orderedTimes, origin, medianInterval }) {
    const threshold = Math.max(5, (medianInterval ?? 0) * 5), events: Observation[] = [];
    let total = 0;
    for (let i = 1; i < orderedTimes.length; i++) {
      const delta = orderedTimes[i] - orderedTimes[i - 1];
      if (delta > threshold) {
        total++;
        if (events.length < 500) events.push({ kind: 'time-gap', start: orderedTimes[i - 1] - origin, time: orderedTimes[i] - origin, label: `${delta.toFixed(2)} s recording gap (> ${threshold.toFixed(2)} s)` });
      }
    }
    return { events, total };
  },
};
export const observationDetectors: readonly ObservationDetector[] = [timeGapDetector];
