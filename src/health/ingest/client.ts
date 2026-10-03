import { mergeImport, type ImportLog } from '../store';
import type { ImportResult, Progress } from '../types';

/**
 * One import at a time, kept here rather than in a view, so leaving the
 * Data page does not stop it and coming back shows where it got to.
 */
export interface Job {
  file: { name: string; size: number };
  state: 'reading' | 'saving' | 'done' | 'error' | 'cancelled';
  progress: Progress | null;
  started: number;
  log?: ImportLog;
  error?: string;
  /** reading and saving, ms */
  wall?: number;
}

let job: Job | null = null;
let worker: Worker | null = null;
const listeners = new Set<() => void>();
const tell = (): void => listeners.forEach((fn) => fn());

export const currentJob = (): Job | null => job;

export function onJob(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function startImport(file: File): void {
  if (job?.state === 'reading' || job?.state === 'saving') return;
  job = { file: { name: file.name, size: file.size }, state: 'reading', progress: null, started: Date.now() };
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const mine = job;
  worker.onmessage = async (ev: MessageEvent<{ kind: string; progress?: Progress; result?: ImportResult; message?: string }>) => {
    if (job !== mine) return;
    const msg = ev.data;
    if (msg.kind === 'progress') {
      mine.progress = msg.progress!;
      return tell();
    }
    worker?.terminate();
    worker = null;
    if (msg.kind === 'error') {
      mine.state = 'error';
      mine.error = msg.message;
      return tell();
    }
    mine.state = 'saving';
    tell();
    try {
      mine.log = await mergeImport(msg.result!, mine.file);
      mine.state = 'done';
      mine.wall = Date.now() - mine.started;
    } catch (err) {
      mine.state = 'error';
      mine.error = err instanceof Error ? err.message : String(err);
    }
    tell();
  };
  worker.onerror = (ev) => {
    if (job !== mine) return;
    mine.state = 'error';
    mine.error = ev.message || 'The reader stopped unexpectedly.';
    worker?.terminate();
    worker = null;
    tell();
  };
  worker.postMessage({ file });
  tell();
}

/** stops a read part-way; nothing is saved until the whole file has been read */
export function cancelImport(): void {
  if (!job || job.state !== 'reading') return;
  worker?.terminate();
  worker = null;
  job.state = 'cancelled';
  tell();
}

export function clearJob(): void {
  if (job && (job.state === 'reading' || job.state === 'saving')) return;
  job = null;
  tell();
}
