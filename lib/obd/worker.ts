import { DriveSession } from './drive-session';
import { nearest, trace } from './analysis';
import { LIMITS } from './csv';
import type { Request, Response } from './protocol';
const drive = new DriveSession();
self.onmessage = async ({ data }: MessageEvent<Request>) => {
  const send = (response: Response) => self.postMessage(response);
  try {
    const run = data.run ?? 'A', session = drive.session(run);
    if (data.kind === 'load') {
      if (data.file.size > LIMITS.bytes) throw new Error('Maximum file size is 25 MiB. Split the log before importing.');
      send({ id: data.id, kind: 'preview', preview: drive.load(run, await data.file.text()) });
    } else if (data.kind === 'remap') {
      send({ id: data.id, kind: 'preview', preview: session.remap(data.config) });
    } else if (data.kind === 'commit') {
      send({ id: data.id, kind: 'commit', info: drive.commit(run, data.revision) });
    } else if (data.kind === 'review') {
      send({ id: data.id, kind: 'preview', preview: session.review() });
    } else if (data.kind === 'phases') {
      send({ id: data.id, kind: 'phases', summary: drive.summary(run, data.offset) });
    } else if (data.kind === 'region') {
      send({ id: data.id, kind: 'region', region: drive.region(run, data.segment) });
    } else if (data.kind === 'compare') {
      send({ id: data.id, kind: 'compare', comparison: drive.compare(data.a, data.b) });
    } else if (data.kind === 'comparison-traces') {
      send({ id: data.id, kind: 'comparison-traces', traces: drive.traces(data.a, data.b, data.identity) });
    } else if (data.kind === 'relationship') {
      send({ id: data.id, kind: 'relationship', relationship: drive.relationship(run, data.segment, data.x, data.y, data.tolerance) });
    } else if (data.kind === 'clear-b') {
      drive.clearB(); send({ id: data.id, kind: 'clear-b' });
    } else {
      const log = session.log;
      if (!log) throw new Error('Import a log first.');
      if (data.kind === 'view') send({ id: data.id, kind: 'view', traces: log.signals.filter(s => data.signals.includes(s.id)).slice(0, 6).map(s => trace(s, data.start, data.end)) });
      else send({ id: data.id, kind: 'inspect', readings: log.signals.map(s => nearest(s, data.time)), phase: drive.at(run, data.time) });
    }
  } catch (error) { send({ id: data.id, error: error instanceof Error ? error.message : 'Unable to process this log.' }); }
};
