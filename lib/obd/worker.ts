import { parseLog, describe } from './engine';
import { nearest, trace } from './analysis';
import { LIMITS } from './csv';
import type { Log } from './types';
import type { Request, Response } from './protocol';
let log: Log | null = null;
self.onmessage = async ({ data }: MessageEvent<Request>) => {
  const send = (response: Response) => self.postMessage(response);
  try {
    if (data.kind === 'load') {
      if (data.file.size > LIMITS.bytes) throw new Error('Maximum file size is 25 MiB. Split the log before importing.');
      log = parseLog(await data.file.text());
      send({ id: data.id, kind: 'load', info: describe(log) });
    } else {
      if (!log) throw new Error('Import a log first.');
      if (data.kind === 'view') send({ id: data.id, kind: 'view', traces: log.signals.filter(s => data.signals.includes(s.id)).slice(0, 6).map(s => trace(s, data.start, data.end)) });
      else send({ id: data.id, kind: 'inspect', readings: log.signals.map(s => nearest(s, data.time)) });
    }
  } catch (error) { send({ id: data.id, error: error instanceof Error ? error.message : 'Unable to process this log.' }); }
};
