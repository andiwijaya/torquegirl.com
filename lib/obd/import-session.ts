import { parseLog, describe } from './engine';
import { sourceHeaders, defaultMapping, validateConfig, previewDetails, type ImportPreview } from './mapping';
import type { MappingConfig } from './mapping-types';
import type { Log } from './types';
import { LIMITS } from './csv';

/** Worker-owned source text is authoritative. Draft remaps never mutate the accepted log. */
export class ImportSession {
  private text = '';
  private revision = 0;
  private draft: { log: Log; preview: ImportPreview } | null = null;
  private acceptedConfig: MappingConfig | null = null;
  log: Log | null = null;
  load(text: string): ImportPreview {
    if (text.length > LIMITS.bytes) throw new Error('Log exceeds the 25 MiB text limit.');
    this.text = text; this.log = null; this.acceptedConfig = null; this.draft = null;
    return this.remap(defaultMapping(sourceHeaders(text).headers));
  }
  remap(input: unknown): ImportPreview {
    // Invalidate a prior preview before validation, so a stale commit cannot accept a failed edit.
    this.draft = null; this.revision++;
    const config = validateConfig(input, sourceHeaders(this.text).headers), log = parseLog(this.text, config);
    const preview = previewDetails(this.text, config, log, describe(log), this.revision);
    log.format = preview.exporter.label; preview.info.format = log.format;
    this.draft = { log, preview }; return preview;
  }
  commit(revision: number) {
    if (!this.draft || revision !== this.draft.preview.revision) throw new Error('Preview changed. Review the current mapping before analysis.');
    if (this.draft.preview.issues.some(i => i.severity === 'error')) throw new Error('Resolve blocking mapping issues before analysis.');
    this.log = this.draft.log; this.acceptedConfig = structuredClone(this.draft.preview.config);
    return describe(this.log);
  }
  review() {
    if (!this.acceptedConfig) throw new Error('No accepted mapping to review.');
    return this.remap(this.acceptedConfig);
  }
}
