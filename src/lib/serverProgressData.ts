import { requireArrayRecord, requireFileRecord, requireGameResultsRecord, requireStringRecord } from './progressValidation';

export const PROGRESS_KEYS = ['solutions', 'files', 'user-checkboxes', 'user-bookmarks', 'testcases', 'game-results'] as const;
export type ServerProgressData = Record<string, Record<string, unknown>>;
export type ProgressSnapshot = { revision: number; savedAt: string | null; data: ServerProgressData };
export const MAX_PROGRESS_BYTES = 4 * 1024 * 1024;

export function normalizeProgress(value: unknown): ServerProgressData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Progress must be an object.');
  const source = value as Record<string, unknown>;
  if (Object.keys(source).some(key => !(PROGRESS_KEYS as readonly string[]).includes(key))) throw new Error('Unsupported progress key.');
  const data = Object.fromEntries(PROGRESS_KEYS.map(key => [key, source[key] ?? {}]));
  requireStringRecord(data, 'solutions');
  requireFileRecord(data);
  requireArrayRecord(data, 'testcases');
  requireGameResultsRecord(data);
  for (const key of ['user-checkboxes', 'user-bookmarks']) {
    const record = data[key];
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Progress flags must be objects.');
    if (Object.values(record).some(v => typeof v !== 'boolean')) throw new Error('Progress flags must be booleans.');
  }
  return data as ServerProgressData;
}

export function sameProgress(a: ServerProgressData, b: ServerProgressData): boolean {
  function stable(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)]));
    return value;
  }
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

export function emptyProgress(data: ServerProgressData): boolean {
  return Object.values(data).every(record => Object.keys(record).length === 0);
}

export function validateSnapshot(value: unknown): ProgressSnapshot {
  const snapshot = value as ProgressSnapshot;
  if (!snapshot || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 ||
    !(snapshot.savedAt === null || typeof snapshot.savedAt === 'string')) throw new Error('Invalid server snapshot.');
  return { revision: snapshot.revision, savedAt: snapshot.savedAt, data: normalizeProgress(snapshot.data) };
}
