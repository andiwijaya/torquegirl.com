export const LIMITS = { bytes: 25 * 1024 * 1024, rows: 250_000, columns: 128, cells: 2_000_000 };
export interface RecordRow { fields: string[]; line: number; error?: string }

/** Streaming RFC-4180-style tokenizer: quoted newlines and escaped quotes are retained. */
export function* records(text: string, delimiter: string): Generator<RecordRow> {
  let fields: string[] = [], field = '', quoted = false, closed = false, error = '';
  let line = 1, start = 1;
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i <= text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else if (c === undefined) { error = 'Unclosed quoted field'; quoted = false; }
      else { field += c; if (c === '\n') line++; continue; }
      if (c !== undefined) continue;
    }
    if (c === delimiter || c === '\n' || c === '\r' || c === undefined) {
      fields.push(field); field = ''; closed = false;
      if (fields.length > LIMITS.columns) throw new Error(`Maximum ${LIMITS.columns} columns supported.`);
      if (c === delimiter) continue;
      if (fields.length > 1 || fields.some(v => v.trim() !== '') || error) yield { fields, line: start, error: error || undefined };
      fields = []; error = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
      line++; start = line;
    } else if (c === '"' && field === '' && !closed) quoted = true;
    else { if (closed || c === '"') error = 'Unexpected character around quoted field'; field += c; }
  }
}

export function detectDelimiter(text: string): string {
  let best = ',', bestScore = -Infinity;
  for (const delimiter of [',', ';', '\t']) {
    const widths: number[] = [];
    try { for (const row of records(text, delimiter)) { widths.push(row.fields.length); if (widths.length === 12) break; } }
    catch { continue; }
    const counts = new Map<number, number>();
    for (const width of widths) if (width > 1) counts.set(width, (counts.get(width) ?? 0) + 1);
    for (const [width, count] of counts) {
      const score = count * 10 + Math.min(width, 9);
      if (score > bestScore) { best = delimiter; bestScore = score; }
    }
  }
  return best;
}

export function numeric(raw: string, decimalComma: boolean): number | null {
  const s = raw.trim();
  // “1,234” could be a thousands group: never silently interpret it as 1.234.
  if (decimalComma && /^[-+]?[1-9]\d{0,2},\d{3}$/.test(s)) return null;
  const normalized = decimalComma && /^[-+]?\d+,\d+(?:e[-+]?\d+)?$/i.test(s) ? s.replace(',', '.') : s;
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER ? value : null;
}
export const isMissing = (s: string) => /^(?:|n\/a|na|null|nan|--|-)$/i.test(s.trim());
