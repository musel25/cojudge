import { describe, expect, it } from 'vitest';
import { ProgressSync, BASELINE_KEY } from './serverProgressClient';
import { normalizeProgress, type ProgressSnapshot } from './serverProgressData';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
function setup() {
  const storage = new MemoryStorage();
  let remote: ProgressSnapshot = { revision: 0, savedAt: null, data: normalizeProgress({}) };
  let online = true;
  let beforeGet: (() => void) | undefined;
  let beforeSave: (() => void) | undefined;
  const states: string[] = [];
  const sync = new ProgressSync({
    storage,
    get: async () => { beforeGet?.(); if (!online) throw new Error('offline'); return structuredClone(remote); },
    put: async (baseRevision, data) => {
      beforeSave?.();
      if (!online) throw new Error('offline');
      if (baseRevision !== remote.revision) return { conflict: true, snapshot: structuredClone(remote) };
      remote = { revision: baseRevision + 1, savedAt: '2026-10-26T22:00:00Z', data: structuredClone(data) };
      return { conflict: false, snapshot: structuredClone(remote) };
    },
    apply: data => { for (const [key, value] of Object.entries(data)) storage.setItem(key, JSON.stringify(value)); },
    status: state => states.push(state.state)
  });
  return { storage, sync, states, remote: () => remote, setRemote: (value: ProgressSnapshot) => remote = value,
    setOnline: (value: boolean) => online = value,
    onGet: (fn: () => void) => beforeGet = fn, onSave: (fn: () => void) => beforeSave = fn };
}
const progress = normalizeProgress({ solutions: { a: 'my solution' }, 'user-checkboxes': { a: true } });

describe('VPS browser sync', () => {
  it('imports existing browser work into an empty server', async () => {
    const h = setup();
    h.storage.setItem('solutions', JSON.stringify(progress.solutions));
    await h.sync.tick();
    expect(h.remote().data.solutions).toEqual({ a: 'my solution' });
    expect(h.states.at(-1)).toBe('saved');
    expect(JSON.parse(h.storage.getItem(BASELINE_KEY)!).revision).toBe(1);
  });
  it('restores code and solved flags in a fresh browser without writing an empty snapshot', async () => {
    const h = setup();
    h.setRemote({ revision: 3, savedAt: 'date', data: progress });
    await h.sync.tick();
    expect(JSON.parse(h.storage.getItem('solutions')!)).toEqual({ a: 'my solution' });
    expect(JSON.parse(h.storage.getItem('user-checkboxes')!)).toEqual({ a: true });
    expect(h.remote().revision).toBe(3);
  });
  it('keeps offline edits, reports failure and saves them after reconnecting', async () => {
    const h = setup();
    await h.sync.tick();
    h.setOnline(false);
    h.storage.setItem('solutions', '{"a":"offline edit"}');
    await h.sync.tick();
    expect(h.states.at(-1)).toBe('error');
    expect(h.storage.getItem('solutions')).toBe('{"a":"offline edit"}');
    h.setOnline(true);
    await h.sync.tick();
    expect(h.remote().data.solutions).toEqual({ a: 'offline edit' });
  });
  it('stops conflicting browser edits and preserves both copies on explicit restore', async () => {
    const h = setup();
    await h.sync.tick();
    h.storage.setItem('solutions', '{"a":"browser edit"}');
    h.setRemote({ revision: 2, savedAt: 'date', data: progress });
    await h.sync.tick();
    expect(h.states.at(-1)).toBe('conflict');
    expect(h.remote().data.solutions).toEqual(progress.solutions);
    expect(h.storage.getItem('solutions')).toBe('{"a":"browser edit"}');
    await h.sync.useServer();
    expect(h.storage.getItem('solutions')).toBe('{"a":"my solution"}');
    const backup = [...h.storage.values].find(([key]) => key.startsWith('cojudge-vps-conflict-'));
    expect(JSON.parse(backup![1]).solutions).toEqual({ a: 'browser edit' });
  });
  it('does not restore over edits made while fetching server state', async () => {
    const h = setup();
    h.setRemote({ revision: 1, savedAt: 'date', data: progress });
    h.onGet(() => h.storage.setItem('solutions', '{"a":"new edit"}'));
    await h.sync.tick();
    expect(h.states.at(-1)).toBe('conflict');
    expect(h.storage.getItem('solutions')).toBe('{"a":"new edit"}');
  });
  it('saves changes made during a write on the next pass', async () => {
    const h = setup();
    let once = true;
    h.onSave(() => { if (once) { h.storage.setItem('solutions', '{"a":"typed during save"}'); once = false; } });
    await h.sync.tick();
    expect(h.states.at(-1)).toBe('pending');
    await h.sync.tick();
    expect(h.remote().data.solutions).toEqual({ a: 'typed during save' });
    expect(h.states.at(-1)).toBe('saved');
  });
  it('saves deliberate deletion instead of restoring the old server copy', async () => {
    const h = setup();
    h.storage.setItem('solutions', '{"a":"old"}');
    await h.sync.tick();
    h.storage.setItem('solutions', '{}');
    await h.sync.tick();
    expect(h.remote().data.solutions).toEqual({});
  });
  it('does not mark a CAS conflict as saved', async () => {
    const h = setup();
    h.onSave(() => h.setRemote({ revision: 2, savedAt: 'date', data: progress }));
    await h.sync.tick();
    expect(h.states.at(-1)).toBe('conflict');
    expect(h.storage.getItem(BASELINE_KEY)).toBeNull();
  });
});
