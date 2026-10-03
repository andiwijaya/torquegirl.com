import { z } from 'zod';

export const NOTEBOOK_SCHEMA = 'torquegirl.observation-notebook';
export const NOTEBOOK_VERSION = 1;
export const NOTEBOOK_LIMITS = Object.freeze({ records: 100, bytes: 512_000, recordBytes: 24_000, depth: 10, signals: 16, statistics: 32, changes: 16 });
export type NotebookErrorCode = 'invalid' | 'version' | 'limit' | 'unavailable' | 'write' | 'conflict' | 'confirmation';
export class NotebookError extends Error {
  constructor(public readonly code: NotebookErrorCode, message: string) { super(message); this.name = 'NotebookError'; }
}

// Plain text only. Preserve whitespace and Unicode exactly, but reject control codes
// (except tab/newline/CR) and unpaired surrogates that UTF-8 would silently replace.
function validText(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 32 && ![9, 10, 13].includes(code) || code === 127) return false;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}
const text = (max: number) => z.string().max(max).refine(validText, 'Unsupported control code or invalid Unicode.');
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/);
const value = z.number().finite().min(-1e12).max(1e12);
const seconds = z.number().finite().min(0).max(1e9);
const count = z.number().int().min(0).max(2_000_000);
const fraction = z.number().finite().min(0).max(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T00:00:00.000Z`);
  return v.slice(0, 4) !== '0000' && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, 'Use a real calendar date (YYYY-MM-DD).');
const timestamp = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/).refine(v => {
  const d = new Date(v);
  return v.slice(0, 4) !== '0000' && Number.isFinite(d.getTime()) && d.toISOString() === v;
}, 'Use an ISO UTC timestamp.');

export const notebookRegionSchema = z.object({ start: seconds, end: seconds, phase: z.enum(['stopped', 'idle', 'acceleration', 'cruise', 'deceleration', 'unclassified']).optional() }).strict().refine(v => v.end >= v.start, 'Region end precedes start.');
export const notebookSignalSchema = z.object({ id: text(160).refine(v => v.length > 0), label: text(160), run: z.enum(['A', 'B']).optional(), identity: text(100).optional(), unit: text(40).optional() }).strict();
const signals = z.array(notebookSignalSchema).max(NOTEBOOK_LIMITS.signals).refine(v => new Set(v.map(s => `${s.run ?? 'A'}:${s.id}`)).size === v.length, 'Duplicate signal IDs within a run.');
const statistic = z.object({ run: z.enum(['A', 'B']), signalId: text(160), count, min: value.nullable(), max: value.nullable(), mean: value.nullable(), median: value.nullable(), coverage: fraction, cadence: seconds.nullable() }).strict().refine(s => s.min === null || s.max === null || s.min <= s.max, 'Minimum exceeds maximum.');
const change = z.object({ identity: text(100), unit: text(40), a: value, b: value, delta: value, countA: count, countB: count, coverageA: fraction, coverageB: fraction }).strict();
export const notebookEvidenceSchema = z.object({
  runALabel: text(160).optional(), runBLabel: text(160).optional(),
  regionA: notebookRegionSchema.optional(), regionB: notebookRegionSchema.optional(), signals,
  statistics: z.array(statistic).max(NOTEBOOK_LIMITS.statistics).optional(),
  comparison: z.object({ state: z.enum(['GOOD MATCH', 'PARTIAL MATCH', 'CONDITIONS DIFFER', 'INSUFFICIENT DATA']), reasons: z.array(text(400)).max(8), changes: z.array(change).max(NOTEBOOK_LIMITS.changes) }).strict().optional(),
}).strict().superRefine((e, ctx) => {
  const keys = new Set<string>();
  for (const s of e.statistics ?? []) {
    const key = `${s.run}:${s.signalId}`;
    if (keys.has(key) || !e.signals.some(v => v.id === s.signalId && (v.run ?? 'A') === s.run) || !(s.run === 'A' ? e.regionA : e.regionB)) ctx.addIssue({ code: 'custom', message: 'Statistics require a selected signal/region and unique run/signal pair.' });
    keys.add(key);
  }
  if (e.comparison && (!e.regionA || !e.regionB)) ctx.addIssue({ code: 'custom', message: 'Comparison requires both regions.' });
  const changes = new Set<string>();
  for (const c of e.comparison?.changes ?? []) {
    const key = `${c.identity}:${c.unit}`;
    if (changes.has(key) || !e.signals.some(s => s.identity === c.identity && s.unit === c.unit)) ctx.addIssue({ code: 'custom', message: 'Comparison changes require a selected identity/unit and no duplicates.' });
    changes.add(key);
  }
});
export const notebookDraftSchema = z.object({
  vehicleLabel: text(160).optional(), vehicleIdentifier: text(160).optional(), question: text(2000).optional(),
  testDate: date.optional(), conditions: text(2000).optional(), baseline: text(2000).optional(), modification: text(2000).optional(),
  selectedRegion: notebookRegionSchema.optional(), selectedSignals: signals.optional(),
  observation: text(4000).optional(), alternativeExplanation: text(2000).optional(), nextTest: text(2000).optional(), retestResult: text(4000).optional(), notes: text(6000).optional(),
  evidence: notebookEvidenceSchema.optional(),
}).strict();
const recordSchema = notebookDraftSchema.extend({ id, createdAt: timestamp, updatedAt: timestamp }).refine(r => r.updatedAt >= r.createdAt, 'Update time precedes creation.');
const documentSchema = z.object({ schema: z.literal(NOTEBOOK_SCHEMA), version: z.literal(NOTEBOOK_VERSION), revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), records: z.array(recordSchema).max(NOTEBOOK_LIMITS.records) }).strict().refine(d => new Set(d.records.map(r => r.id)).size === d.records.length, 'Duplicate record IDs.');
export type NotebookRegion = z.infer<typeof notebookRegionSchema>;
export type NotebookSignal = z.infer<typeof notebookSignalSchema>;
export type NotebookEvidence = z.infer<typeof notebookEvidenceSchema>;
export type NotebookDraft = z.infer<typeof notebookDraftSchema>;
export type NotebookRecord = z.infer<typeof recordSchema>;
export type NotebookDocument = z.infer<typeof documentSchema>;

export const emptyNotebook = (): NotebookDocument => ({ schema: NOTEBOOK_SCHEMA, version: NOTEBOOK_VERSION, revision: 0, records: [] });
export const jsonBytes = (v: string) => new TextEncoder().encode(v).byteLength;

/** Bound unknown trees before schema recursion; reject dangerous keys at every depth. */
function checkTree(input: unknown, depth = 0, seen = new Set<object>()) {
  if (depth > NOTEBOOK_LIMITS.depth) throw new NotebookError('limit', 'Notebook nesting exceeds the supported depth.');
  if (!input || typeof input !== 'object') return;
  if (seen.has(input)) throw new NotebookError('invalid', 'Notebook must be an acyclic plain JSON value.');
  seen.add(input);
  if (!Array.isArray(input) && Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) throw new NotebookError('invalid', 'Notebook must contain plain JSON objects.');
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(input))) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || !('value' in descriptor)) throw new NotebookError('invalid', 'Unsafe notebook key or accessor.');
    checkTree(descriptor.value, depth + 1, seen);
  }
  seen.delete(input);
}
function parseSchema<T>(schema: z.ZodType<T>, input: unknown): T {
  checkTree(input);
  const result = schema.safeParse(input);
  if (!result.success) {
    if (result.error.issues.some(issue => issue.code === 'too_big' && issue.path.length === 1 && issue.path[0] === 'records')) throw new NotebookError('invalid', 'Notebook supports at most 100 records. Export a backup before removing saved notes to make room; nothing was changed.');
    throw new NotebookError('invalid', 'Notebook fields are invalid or unsupported; nothing was changed.');
  }
  return result.data;
}
export const validateDraft = (input: unknown): NotebookDraft => parseSchema(notebookDraftSchema, input);
export const validateEvidence = (input: unknown): NotebookEvidence => parseSchema(notebookEvidenceSchema, input);
export function validateNotebook(input: unknown): NotebookDocument {
  checkTree(input);
  if (input && typeof input === 'object' && 'version' in input && input.version !== NOTEBOOK_VERSION) throw new NotebookError('version', 'Unsupported notebook version; saved data was preserved.');
  const document = parseSchema(documentSchema, input);
  for (const record of document.records) if (jsonBytes(JSON.stringify(record)) > NOTEBOOK_LIMITS.recordBytes) throw new NotebookError('limit', 'A notebook record exceeds 24,000 UTF-8 bytes.');
  if (jsonBytes(JSON.stringify(document)) > NOTEBOOK_LIMITS.bytes) throw new NotebookError('limit', 'Notebook exceeds 512,000 UTF-8 bytes.');
  return document;
}
export function parseNotebookJson(input: string): NotebookDocument {
  if (typeof input !== 'string') throw new NotebookError('invalid', 'Choose a JSON text notebook.');
  if (input.length > NOTEBOOK_LIMITS.bytes || jsonBytes(input) > NOTEBOOK_LIMITS.bytes) throw new NotebookError('limit', 'Notebook import exceeds 512,000 UTF-8 bytes.');
  // Scan nesting before JSON.parse; braces inside escaped JSON strings do not count.
  let depth = 0, quoted = false, escaped = false;
  for (const char of input) {
    if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; }
    else if (char === '"') quoted = true;
    else if (char === '{' || char === '[') { if (++depth > NOTEBOOK_LIMITS.depth) throw new NotebookError('limit', 'Notebook nesting exceeds the supported depth.'); }
    else if (char === '}' || char === ']') depth--;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(input.replace(/^\uFEFF/, '')); } catch { throw new NotebookError('invalid', 'Malformed notebook JSON; nothing was changed.'); }
  return validateNotebook(parsed);
}
/** Compact, validated backup; never executes text or creates a network request. */
export const exportNotebookJson = (document: NotebookDocument): string => JSON.stringify(validateNotebook(document));
