import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProgressRepository, handleProgressRequest } from './serverProgress';

const dirs: string[] = [];
async function repository() {
  const directory = await mkdtemp(join(tmpdir(), 'cojudge-progress-'));
  dirs.push(directory);
  return { directory, repo: new ProgressRepository(directory) };
}
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))); });
const origin = 'https://cojudge.example';
const data = { solutions: { 'two-sum': 'print(42)' }, 'user-checkboxes': { 'two-sum': true } };
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request(origin + '/api/server-progress', {
    method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-CoJudge-Sync': '1', ...headers },
    body: JSON.stringify(body)
  });
}

describe('private server progress', () => {
  it('persists code and solved flags across repository instances and retains revisions', async () => {
    const { directory, repo } = await repository();
    expect((await repo.read()).revision).toBe(0);
    const first = await repo.save(0, data);
    expect(first.revision).toBe(1);
    expect((await new ProgressRepository(directory).read()).data.solutions).toEqual({ 'two-sum': 'print(42)' });
    await repo.save(1, { ...data, solutions: { 'two-sum': 'print(43)' } });
    expect((await readdir(join(directory, 'history'))).length).toBe(2);
    const old = JSON.parse(await readFile(join(directory, 'history', '1.json'), 'utf8'));
    expect(old.data['user-checkboxes']).toEqual({ 'two-sum': true });
    expect(old.data.solutions['two-sum']).toBe('print(42)');
  });

  it('rejects stale writes and serializes concurrent saves', async () => {
    const { repo } = await repository();
    const outcomes = await Promise.allSettled([repo.save(0, data), repo.save(0, { solutions: { b: 'other' } })]);
    expect(outcomes.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter(x => x.status === 'rejected')).toHaveLength(1);
    expect((await repo.read()).data.solutions).toEqual(data.solutions);
  });

  it('allows an identical retry after a lost response without creating a new revision', async () => {
    const { repo } = await repository();
    await repo.save(0, data);
    expect((await repo.save(0, data)).revision).toBe(1);
  });

  it('does not replace a corrupt store with empty data', async () => {
    const { directory, repo } = await repository();
    await writeFile(join(directory, 'current.json'), 'broken');
    await expect(repo.save(0, data)).rejects.toThrow();
    expect(await readFile(join(directory, 'current.json'), 'utf8')).toBe('broken');
  });

  it('requires the configured origin and explicit JSON sync header', async () => {
    const { repo } = await repository();
    for (const headers of [{ Origin: 'https://attacker.example' }, { Origin: '' }, { 'X-CoJudge-Sync': '' }, { 'Content-Type': 'text/plain' }]) {
      expect((await handleProgressRequest(request({ baseRevision: 0, data }, headers), repo, origin)).status).toBe(403);
    }
    expect((await repo.read()).revision).toBe(0);
  });

  it('returns conflicts with current data and disables caching', async () => {
    const { repo } = await repository();
    await repo.save(0, data);
    const response = await handleProgressRequest(request({ baseRevision: 0, data: { solutions: { b: 'x' } } }), repo, origin);
    expect(response.status).toBe(409);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await response.json()).data.solutions).toEqual(data.solutions);
  });

  it('rejects malformed data, credentials and oversized payloads without changing stored progress', async () => {
    const { repo } = await repository();
    for (const bad of [{ solutions: [] }, { solutions: { p: 3 } }, { 'user-checkboxes': { p: 'yes' } }, { 'cojudge-firebase-settings': { secret: 'x' } }, { files: { p: 'not json' } }]) {
      expect((await handleProgressRequest(request({ baseRevision: 0, data: bad }), repo, origin)).status).toBe(400);
    }
    expect((await handleProgressRequest(request({ baseRevision: 0, data: { solutions: { p: 'x'.repeat(4 * 1024 * 1024) } } }), repo, origin)).status).toBe(413);
    expect((await repo.read()).revision).toBe(0);
  });
});
