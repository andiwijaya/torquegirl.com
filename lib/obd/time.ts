import { numeric } from './csv';
export function timeKind(header: string): 'ms' | 's' | 'date' | 'unspecified' | null {
  const s = header.trim().toLowerCase();
  if (/^(?:elapsed(?: time)?|time|timestamp)\s*[([](?:ms|milliseconds)[)\]]$/.test(s)) return 'ms';
  if (/^(?:elapsed(?: time)?|time|timestamp)\s*[([](?:s|sec|seconds)[)\]]$/.test(s)) return 's';
  if (/^(device time|gps time|date\/time|datetime|date time|timestamp)$/.test(s)) return 'date';
  if (/^(time|elapsed|elapsed time)$/.test(s)) return 'unspecified';
  return null;
}
export function parseTime(raw: string, kind: ReturnType<typeof timeKind>, decimal: boolean): number | null {
  if (kind === 'ms' || kind === 's') { const n = numeric(raw, decimal); return n === null ? null : n / (kind === 'ms' ? 1000 : 1); }
  const clock = raw.trim().match(/^(\d{1,3}):(\d{2}):(\d{2}(?:\.\d+)?)$/);
  if (clock && +clock[2] < 60 && +clock[3] < 60) return +clock[1] * 3600 + +clock[2] * 60 + +clock[3];
  // ISO dates only. Offset-free timestamps use UTC consistently, not the browser timezone.
  const iso = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/);
  if (!iso || +iso[2] < 1 || +iso[2] > 12 || +iso[3] < 1 || +iso[3] > new Date(Date.UTC(+iso[1], +iso[2], 0)).getUTCDate() || +iso[4] > 23 || +iso[5] > 59 || +iso[6] > 59) return null;
  const n = Date.parse(raw.trim().replace(' ', 'T') + (iso[8] ? '' : 'Z'));
  return Number.isFinite(n) ? n / 1000 : null;
}
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}
