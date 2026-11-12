import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers();
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', { ...storage });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { localStorage: storage, location: { reload: vi.fn() } }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('blocks stale editor writes and teardown flushes until reload after a server restore', async () => {
  const { withServerRestore, serverRestorePending } = await import('./serverProgressRestore');
  const { writeProgressStorageItem, flushProgressStorageWrites } = await import('./progressBackup');
  localStorage.setItem('files', '{"old":"[]"}');
  withServerRestore(() => {
    expect(serverRestorePending()).toBe(true);
    expect(writeProgressStorageItem(localStorage, 'files', '{"old":"stale"}')).toBe(false);
    localStorage.setItem('files', '{"new":"[]"}');
  });
  expect(writeProgressStorageItem(localStorage, 'files', '{"old":"recreated"}')).toBe(false);
  flushProgressStorageWrites();
  expect(localStorage.getItem('files')).toBe('{"new":"[]"}');
  await vi.runAllTimersAsync();
  expect(window.location.reload).toHaveBeenCalledOnce();
});

it('releases a failed restore without disabling subsequent local edits', async () => {
  const { withServerRestore, serverRestorePending } = await import('./serverProgressRestore');
  expect(() => withServerRestore(() => { throw new Error('quota'); })).toThrow('quota');
  expect(serverRestorePending()).toBe(false);
  await vi.runAllTimersAsync();
  expect(window.location.reload).not.toHaveBeenCalled();
});

it('reserves restore metadata before changing learner data when browser storage is full', async () => {
  const { withServerRestore, serverRestorePending } = await import('./serverProgressRestore');
  const original = localStorage.setItem;
  vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
    if (key === 'cojudge-vps-restore-epoch') throw new Error('quota');
    original(key, value);
  });
  const restore = vi.fn();
  expect(() => withServerRestore(restore)).toThrow('quota');
  expect(restore).not.toHaveBeenCalled();
  expect(serverRestorePending()).toBe(false);
});
