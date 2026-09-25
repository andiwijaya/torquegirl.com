import type { LogInfo, Reading, Trace } from './types';
export type Request = { id: number } & ({ kind: 'load'; file: Blob } | { kind: 'view'; signals: string[]; start: number; end: number } | { kind: 'inspect'; time: number });
export type Response = { id: number; error: string } | { id: number; kind: 'load'; info: LogInfo } | { id: number; kind: 'view'; traces: Trace[] } | { id: number; kind: 'inspect'; readings: Reading[] };
