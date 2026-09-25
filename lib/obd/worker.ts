import { ImportSession } from './import-session';
import { nearest, trace } from './analysis';
import { LIMITS } from './csv';
import type { Request, Response } from './protocol';
const session = new ImportSession();
self.onmessage = async ({ data }: MessageEvent<Request>) => {
  const send = (response: Response) => self.postMessage(response);
  try {
    if (data.kind === 'load') {
      if (data.file.size > LIMITS.bytes) throw new Error('Maximum file size is 25 MiB. Split the log before importing.');
      send({ id: data.id, kind: 'preview', preview: session.load(await data.file.text()) });
    } else if (data.kind === 'remap') {
      send({ id: data.id, kind: 'preview', preview: session.remap(data.config) });
    } else if (data.kind === 'commit') {
      send({ id: data.id, kind: 'commit', info: session.commit(data.revision) });
    } else if (data.kind === 'review') {
      send({ id: data.id, kind: 'preview', preview: session.review() });
    } else {
      const log = session.log;
      if (!log) throw new Error('Import a log first.');
      if (data.kind === 'view') send({ id: data.id, kind: 'view', traces: log.signals.filter(s => data.signals.includes(s.id)).slice(0, 6).map(s => trace(s, data.start, data.end)) });
      else send({ id: data.id, kind: 'inspect', readings: log.signals.map(s => nearest(s, data.time)) });
    }
  } catch (error) { send({ id: data.id, error: error instanceof Error ? error.message : 'Unable to process this log.' }); }
};
