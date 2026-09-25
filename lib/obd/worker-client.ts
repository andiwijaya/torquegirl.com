import type { Request, Response } from './protocol';
export interface WorkerPort {
  onmessage: ((event: MessageEvent<Response>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: Request): void;
  terminate(): void;
}
export class LogWorkerClient {
  private seq = 0;
  private pending = new Map<number, { resolve: (value: Response) => void; reject: (error: Error) => void }>();
  private disposed = false;
  constructor(private worker: WorkerPort) {
    worker.onmessage = ({ data }) => { const p = this.pending.get(data.id); this.pending.delete(data.id); if (p) { if ('error' in data) p.reject(new Error(data.error)); else p.resolve(data); } };
    worker.onerror = () => this.dispose('Background processing failed. Try a smaller log or reload the page.');
  }
  request(message: Request extends infer R ? R extends Request ? Omit<R, 'id'> : never : never): Promise<Response> {
    if (this.disposed) return Promise.reject(new Error('Import cancelled.'));
    const id = ++this.seq;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.worker.postMessage({ ...message, id } as Request); });
  }
  dispose(reason = 'Import cancelled.') {
    if (this.disposed) return;
    this.disposed = true; this.worker.terminate(); this.worker.onmessage = null; this.worker.onerror = null;
    for (const p of this.pending.values()) p.reject(new Error(reason)); this.pending.clear();
  }
}
