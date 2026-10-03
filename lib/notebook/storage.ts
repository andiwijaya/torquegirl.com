import { emptyNotebook, exportNotebookJson, NotebookError, parseNotebookJson, validateDraft, validateNotebook, type NotebookDocument, type NotebookDraft } from './model';

export const NOTEBOOK_KEY = 'torquegirl.obd.observation-notebook.v1';
export const NOTEBOOK_LOCK = NOTEBOOK_KEY;
export interface NotebookStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
/** Must serialize this critical section across every writer to this origin/key.
 * Production uses Web Locks; tests inject a shared deterministic lock. No unsafe
 * read/check/write fallback when locks are absent: reading/export still works.
 */
export type NotebookExclusive = <T>(task: () => T) => Promise<T>;
export interface NotebookOptions { exclusive?: NotebookExclusive; now?: () => string; id?: () => string }
export interface NotebookSnapshot { readonly document: NotebookDocument; readonly token: string | null }
export interface NotebookPlan {
  readonly kind: 'merge' | 'replace' | 'delete' | 'clear';
  readonly requiresConfirmation: boolean;
  readonly added: number;
  readonly removed: number;
  readonly unchanged: number;
  /** Merge retains the local record for every conflicting ID; no silent overwrite. */
  readonly conflictIds: readonly string[];
  readonly preview: NotebookDocument;
}

/** Construction is inert; nothing reads or writes storage until explicitly called.
 * Keep form drafts in UI memory; update replaces all editable fields, preserving ID
 * and creation time. Pass the snapshot that the displayed form/plan was based on.
 */
export function createNotebookStore(storage: NotebookStorage | undefined, options: NotebookOptions = {}) {
  const plans = new WeakMap<NotebookPlan, { token: string | null; text: string; destructive: boolean }>();
  const now = options.now ?? (() => new Date().toISOString());
  const id = options.id ?? (() => crypto.randomUUID());
  const read = (): NotebookSnapshot => {
    if (!storage) throw new NotebookError('unavailable', 'Browser notebook storage is unavailable. Keep your draft and try a local backup.');
    let token: string | null;
    try { token = storage.getItem(NOTEBOOK_KEY); } catch { throw new NotebookError('unavailable', 'Notebook storage could not be read; nothing was changed.'); }
    return { token, document: token === null ? emptyNotebook() : parseNotebookJson(token) };
  };
  const current = (snapshot: NotebookSnapshot): NotebookSnapshot => {
    const saved = read();
    if (saved.token !== snapshot.token) throw new NotebookError('conflict', 'Notebook changed in another tab. Reload saved notes and review your draft before saving again.');
    return saved;
  };
  const candidate = (base: NotebookSnapshot, records: NotebookDocument['records']) => validateNotebook({ ...base.document, revision: base.document.revision + 1, records });
  const write = async (token: string | null, text: string): Promise<NotebookSnapshot> => {
    if (!options.exclusive) throw new NotebookError('unavailable', 'Safe cross-tab notebook saving is unavailable in this browser. Saved notes were preserved.');
    try {
      return await options.exclusive(() => {
        const base = current({ token, document: emptyNotebook() });
        const document = parseNotebookJson(text);
        if (exportNotebookJson(base.document) === text) return base;
        try { storage!.setItem(NOTEBOOK_KEY, text); } catch { throw new NotebookError('write', 'Notebook could not be saved (storage unavailable or full). Saved notes and your draft were preserved.'); }
        return { token: text, document };
      });
    } catch (error) {
      if (error instanceof NotebookError) throw error;
      throw new NotebookError('unavailable', 'Safe cross-tab notebook saving is unavailable; saved notes were preserved.');
    }
  };
  const plan = (base: NotebookSnapshot, document: NotebookDocument, details: Omit<NotebookPlan, 'preview'>): NotebookPlan => {
    const text = exportNotebookJson(document);
    const result: NotebookPlan = { ...details, preview: parseNotebookJson(text) };
    plans.set(result, { token: base.token, text, destructive: details.requiresConfirmation });
    return result;
  };
  return {
    read,
    export(snapshot: NotebookSnapshot): string { return exportNotebookJson(current(snapshot).document); },
    async create(snapshot: NotebookSnapshot, draft: NotebookDraft): Promise<NotebookSnapshot> {
      const fields = validateDraft(draft), base = current(snapshot), key = id(), time = now();
      if (base.document.records.some(r => r.id === key)) throw new NotebookError('conflict', 'Generated record ID already exists; nothing was changed.');
      return write(base.token, exportNotebookJson(candidate(base, [...base.document.records, { ...fields, id: key, createdAt: time, updatedAt: time }])));
    },
    async update(snapshot: NotebookSnapshot, key: string, draft: NotebookDraft): Promise<NotebookSnapshot> {
      const fields = validateDraft(draft), base = current(snapshot), existing = base.document.records.find(r => r.id === key);
      if (!existing) throw new NotebookError('conflict', 'Record no longer exists; your draft was preserved.');
      // A backwards system clock must not invalidate an existing record.
      const time = now();
      const document = candidate(base, base.document.records.map(r => r.id === key ? { ...fields, id: key, createdAt: r.createdAt, updatedAt: time < r.updatedAt ? r.updatedAt : time } : r));
      return write(base.token, exportNotebookJson(document));
    },
    planDelete(snapshot: NotebookSnapshot, key: string): NotebookPlan {
      const base = current(snapshot);
      if (!base.document.records.some(r => r.id === key)) throw new NotebookError('conflict', 'Record no longer exists.');
      return plan(base, candidate(base, base.document.records.filter(r => r.id !== key)), { kind: 'delete', requiresConfirmation: true, added: 0, removed: 1, unchanged: base.document.records.length - 1, conflictIds: [] });
    },
    planClear(snapshot: NotebookSnapshot): NotebookPlan {
      const base = current(snapshot);
      return plan(base, candidate(base, []), { kind: 'clear', requiresConfirmation: true, added: 0, removed: base.document.records.length, unchanged: 0, conflictIds: [] });
    },
    planImport(snapshot: NotebookSnapshot, json: string, mode: 'merge' | 'replace' = 'merge'): NotebookPlan {
      const imported = parseNotebookJson(json), base = current(snapshot);
      if (mode !== 'merge' && mode !== 'replace') throw new NotebookError('invalid', 'Choose merge or replacement.');
      if (mode === 'replace') return plan(base, candidate(base, imported.records), { kind: 'replace', requiresConfirmation: true, added: imported.records.length, removed: base.document.records.length, unchanged: 0, conflictIds: [] });
      const records = [...base.document.records], conflictIds: string[] = [];
      let added = 0, unchanged = 0;
      for (const record of imported.records) {
        const existing = records.find(r => r.id === record.id);
        if (!existing) { records.push(record); added++; }
        else if (JSON.stringify(existing) === JSON.stringify(record)) unchanged++;
        else conflictIds.push(record.id);
      }
      return plan(base, added ? candidate(base, records) : base.document, { kind: 'merge', requiresConfirmation: false, added, removed: 0, unchanged, conflictIds });
    },
    /** UI must obtain affirmative confirmation for delete/clear/replace. A cancelled
     * or merely previewed plan never writes. Private plan data resists preview edits.
     */
    async commitPlan(reviewed: NotebookPlan, confirmation?: { confirmed: true }): Promise<NotebookSnapshot> {
      const prepared = plans.get(reviewed);
      if (!prepared) throw new NotebookError('invalid', 'Notebook plan is unknown; prepare it again.');
      // Use the original requirement, not mutable public preview properties.
      if (prepared.destructive && confirmation?.confirmed !== true) throw new NotebookError('confirmation', 'Confirm this notebook action before applying it.');
      const result = await write(prepared.token, prepared.text);
      plans.delete(reviewed);
      return result;
    },
  };
}

/** Call on the client only. Getter denial/missing Web Locks fail closed without
 * deleting anything. Listen for storage events on NOTEBOOK_KEY to refresh UI;
 * exact snapshot checks remain authoritative even if an event was missed.
 */
export function browserNotebookStore() {
  let storage: NotebookStorage | undefined;
  try { if (typeof window !== 'undefined') storage = window.localStorage; } catch { /* denied */ }
  let exclusive: NotebookExclusive | undefined;
  try {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      const locks = navigator.locks;
      exclusive = task => locks.request(NOTEBOOK_LOCK, { mode: 'exclusive' }, task);
    }
  } catch { /* denied: read/export can still work */ }
  return createNotebookStore(storage, { exclusive });
}
