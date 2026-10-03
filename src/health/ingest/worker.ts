import { Unzip, UnzipInflate } from 'fflate';
import type { Progress } from '../types';
import { Collector, TagScanner } from './parse';

/**
 * Reads an Apple Health export.zip or export.xml as a stream, off the main
 * thread: bytes → (unzip) → text → tags → daily sums. A 300 MB file on a
 * phone never sits in memory whole. Cancelling terminates this worker.
 */

/** a worker's postMessage takes no target origin */
const post = (msg: unknown): void => (self as unknown as { postMessage(m: unknown): void }).postMessage(msg);

self.onmessage = (ev: MessageEvent<{ file: File }>) => {
  read(ev.data.file).catch((err: unknown) =>
    post({ kind: 'error', message: err instanceof Error ? err.message : String(err) }),
  );
};

async function read(file: File): Promise<void> {
  const began = Date.now();
  const collector = new Collector();
  const scanner = new TagScanner((body) => collector.tag(body));
  const decoder = new TextDecoder('utf-8');
  let read = 0;
  let xml = 0;
  let found = false;
  let last = 0;

  const say = (phase: Progress['phase'], force = false): void => {
    const t = Date.now();
    if (!force && t - last < 200) return;
    last = t;
    const p: Progress = { read, total: file.size, xml, records: collector.records, counts: collector.counts, phase };
    post({ kind: 'progress', progress: p });
  };

  const text = (bytes: Uint8Array, final: boolean): void => {
    xml += bytes.length;
    scanner.feed(decoder.decode(bytes, { stream: !final }));
  };

  const zipped = /\.zip$/i.test(file.name) || (await sniffZip(file));
  let unzip: Unzip | null = null;
  if (zipped) {
    unzip = new Unzip((entry) => {
      // export.xml only; export_cda.xml and the route files are skipped unread
      if (found || !/(^|\/)export\.xml$/.test(entry.name)) return;
      found = true;
      entry.ondata = (err, chunk, final) => {
        if (err) throw err;
        text(chunk, final);
      };
      entry.start();
    });
    unzip.register(UnzipInflate);
  }

  const reader = file.stream().getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.length;
    if (unzip) unzip.push(value, false);
    else text(value, false);
    say('reading');
  }
  if (unzip) unzip.push(new Uint8Array(0), true);
  else text(new Uint8Array(0), true);
  if (zipped && !found) throw new Error('There is no export.xml inside this zip.');
  say('sorting', true);

  const result = collector.finish();
  post({ kind: 'done', result: { ...result, ms: Date.now() - began } });
}

async function sniffZip(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b && head[2] === 3 && head[3] === 4;
}
