import { z } from 'zod';
import { mappingSchema, type MappingConfig } from './mapping-types';
import { validateConfig } from './mapping';
export const TEMPLATE_KEY = 'torquegirl.obd.mapping-templates.v1';
const templateSchema = z.object({ version: z.literal(1), id: z.string().min(1).max(80), name: z.string().trim().min(1).max(60), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), config: mappingSchema }).strict();
const storeSchema = z.object({ version: z.literal(1), templates: z.array(templateSchema).max(20) }).strict();
export type MappingTemplate = z.infer<typeof templateSchema>;
export interface TemplateStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
/** Fingerprint only; no header text, filenames, timestamps or sample values are persisted. */
export async function headerFingerprint(headers: string[]): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(headers.map(h => h.trim())));
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
}
export function readTemplates(storage: TemplateStorage): MappingTemplate[] {
  const text = storage.getItem(TEMPLATE_KEY);
  if (!text) return [];
  if (text.length > 300_000) throw new Error('Local template data exceeds the supported size. Reset saved templates.');
  const result = storeSchema.safeParse(JSON.parse(text));
  if (!result.success) throw new Error('Saved template schema is invalid or unsupported. Reset saved templates.');
  return result.data.templates;
}
function writeTemplates(storage: TemplateStorage, templates: MappingTemplate[]) {
  const text = JSON.stringify(storeSchema.parse({ version: 1, templates }));
  if (text.length > 300_000) throw new Error('Local mapping storage limit reached. Delete a template before saving.');
  storage.setItem(TEMPLATE_KEY, text);
}
export async function saveTemplate(storage: TemplateStorage, name: string, headers: string[], config: MappingConfig) {
  const template = templateSchema.parse({ version: 1, id: crypto.randomUUID(), name, fingerprint: await headerFingerprint(headers), config: validateConfig(config, headers) });
  const list = readTemplates(storage);
  if (list.length >= 20) throw new Error('Maximum 20 local templates. Delete one before saving another.');
  writeTemplates(storage, [...list, template]); return template;
}
export async function applyTemplate(template: MappingTemplate, headers: string[]): Promise<MappingConfig> {
  const parsed = templateSchema.parse(template);
  if (parsed.fingerprint !== await headerFingerprint(headers)) throw new Error('Template headers do not match this file in name, units, order and duplicate positions. No mapping applied.');
  const config: MappingConfig = { version: 1, time: { ...parsed.config.time, source: 'template' }, columns: parsed.config.columns.map(c => ({ ...c, state: c.state === 'auto' ? 'user' : c.state, via: 'template' })) };
  return validateConfig(config, headers);
}
export function deleteTemplate(storage: TemplateStorage, id: string) { writeTemplates(storage, readTemplates(storage).filter(t => t.id !== id)); }
export function renameTemplate(storage: TemplateStorage, id: string, name: string) { writeTemplates(storage, readTemplates(storage).map(t => t.id === id ? { ...t, name } : t)); }
export function resetTemplates(storage: TemplateStorage) { storage.removeItem(TEMPLATE_KEY); }
