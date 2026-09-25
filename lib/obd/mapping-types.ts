import { z } from 'zod';
import { signalCatalog, unitOptions } from './catalog';
export const columnMappingSchema = z.object({
  index: z.number().int().min(0).max(127), state: z.enum(['auto', 'user', 'custom', 'ignore']),
  identity: z.string().nullable().refine(v => v === null || signalCatalog.some(s => s.id === v), 'Unknown canonical identity'),
  unit: z.string().nullable().refine(v => v === null || unitOptions.includes(v), 'Unsupported interpretation unit'),
  via: z.enum(['manual', 'template']).nullable(),
}).strict();
export const mappingSchema = z.object({
  version: z.literal(1),
  time: z.object({ index: z.number().int().min(0).max(127).nullable(), format: z.enum(['auto', 's', 'ms', 'clock', 'iso']), source: z.enum(['auto', 'user', 'template']) }).strict(),
  columns: z.array(columnMappingSchema).min(2).max(128),
}).strict();
export type ColumnMapping = z.infer<typeof columnMappingSchema>;
export type MappingConfig = z.infer<typeof mappingSchema>;
export interface MappingProvenance { state: ColumnMapping['state']; reason: string; interpretedUnit: string | null; via: ColumnMapping['via'] }
export interface MappingIssue { severity: 'error' | 'warning'; message: string; column?: number }
