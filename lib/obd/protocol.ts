import type { LogInfo, Reading, Trace } from './types';
import type { MappingConfig } from './mapping-types';
import type { ImportPreview } from './mapping';
export type Request = { id: number } & ({ kind: 'load'; file: Blob } | { kind: 'remap'; config: MappingConfig } | { kind: 'commit'; revision: number } | { kind: 'review' } | { kind: 'view'; signals: string[]; start: number; end: number } | { kind: 'inspect'; time: number });
export type Response = { id: number; error: string } | { id: number; kind: 'preview'; preview: ImportPreview } | { id: number; kind: 'commit'; info: LogInfo } | { id: number; kind: 'view'; traces: Trace[] } | { id: number; kind: 'inspect'; readings: Reading[] };
