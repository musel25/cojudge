import { mkdir, open, readFile, readdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MAX_PROGRESS_BYTES, normalizeProgress, sameProgress, validateSnapshot, type ProgressSnapshot } from '../serverProgressData';

class Conflict extends Error {
  constructor(readonly snapshot: ProgressSnapshot) { super('Server progress changed.'); }
}

// One repository per directory, in one Node process. Serialize the complete
// read/check/write operation, not only the final file write.
export class ProgressRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private directory: string) {}

  async read(): Promise<ProgressSnapshot> {
    try {
      return validateSnapshot(JSON.parse(await readFile(join(this.directory, 'current.json'), 'utf8')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return { revision: 0, savedAt: null, data: normalizeProgress({}) };
    }
  }

  save(baseRevision: number, input: unknown): Promise<ProgressSnapshot> {
    const operation = this.queue.then(async () => {
      if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) throw new Error('Invalid base revision.');
      const data = normalizeProgress(input);
      if (Buffer.byteLength(JSON.stringify(data)) > MAX_PROGRESS_BYTES) throw new Error('Progress is too large.');
      const current = await this.read();
      if (current.revision > 0 && sameProgress(current.data, data)) return current;
      if (baseRevision !== current.revision) throw new Conflict(current);
      const next = { revision: current.revision + 1, savedAt: new Date().toISOString(), data };
      const text = JSON.stringify(next);
      await mkdir(join(this.directory, 'history'), { recursive: true, mode: 0o700 });
      // History is written first. It remains a recovery copy if replacing the
      // current file fails; the next attempt can safely replace that revision.
      await this.atomicWrite(join(this.directory, 'history', `${next.revision}.json`), text);
      await this.atomicWrite(join(this.directory, 'current.json'), text);
      for (const name of await readdir(join(this.directory, 'history'))) {
        if (/^\d+\.json$/.test(name) && Number(name.slice(0, -5)) <= next.revision - 100) {
          await rm(join(this.directory, 'history', name));
        }
      }
      return next;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }

  private async atomicWrite(destination: string, text: string): Promise<void> {
    const temp = `${destination}.${randomUUID()}.tmp`;
    try {
      const file = await open(temp, 'wx', 0o600);
      try { await file.writeFile(text, 'utf8'); await file.sync(); } finally { await file.close(); }
      await rename(temp, destination);
      const directory = await open(join(destination, '..'), 'r');
      try { await directory.sync(); } finally { await directory.close(); }
    } finally {
      await rm(temp, { force: true });
    }
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

export async function handleProgressRequest(request: Request, repo: ProgressRepository, origin: string): Promise<Response> {
  try {
    if (request.method === 'GET') return json(await repo.read());
    if (request.method !== 'PUT') return json({ error: 'Method not allowed.' }, 405);
    if (request.headers.get('origin') !== origin || request.headers.get('x-cojudge-sync') !== '1' ||
      request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'Forbidden.' }, 403);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Missing body.' }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_PROGRESS_BYTES) { await reader.cancel(); return json({ error: 'Progress exceeds 4 MiB.' }, 413); }
      chunks.push(value);
    }
    let body: { baseRevision: number; data: unknown };
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || !Number.isSafeInteger(body.baseRevision) || body.baseRevision < 0) throw new Error();
      normalizeProgress(body.data);
    } catch { return json({ error: 'Invalid progress data.' }, 400); }
    return json(await repo.save(body.baseRevision, body.data));
  } catch (error) {
    if (error instanceof Conflict) return json(error.snapshot, 409);
    console.error('Server progress storage failed:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'Server save failed. Your browser copy is unchanged.' }, 500);
  }
}
